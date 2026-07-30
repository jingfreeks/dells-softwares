-- Tindahan POS — utang (customer credit) tracking.
--
-- A store lets regular customers ("suki") buy on credit and settle up
-- later. This adds a customer record with a running balance, lets
-- checkout_sale() record a sale against that balance instead of cash,
-- and a separate record_credit_payment() RPC for paying it down.
--
-- Credit limits are advisory only (per product decision) — a customer's
-- credit_limit is shown as a reference in the UI, but nothing here
-- enforces it. The cashier/admin decides case by case, same as in a
-- real store.

create table customers (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references stores (id) on delete cascade,
  name text not null,
  phone text,
  credit_limit numeric(10, 2) check (credit_limit is null or credit_limit >= 0),
  -- Running utang balance. Only ever changed by checkout_sale() and
  -- record_credit_payment() below (both SECURITY DEFINER, both row-lock
  -- the customer to avoid a lost-update race between concurrent
  -- transactions) — never written directly by the client, even though
  -- the general admin UPDATE policy below technically has column access
  -- to it (same trust model this codebase already uses for
  -- products.stock, see storeData.tsx's restock()).
  balance numeric(10, 2) not null default 0,
  created_at timestamptz not null default now()
);

create index customers_store_id_idx on customers (store_id);

alter table customers enable row level security;

-- Any staff can view and quick-add a customer — a cashier taking a
-- credit sale needs to be able to look up (or create, for a new suki)
-- a customer without waiting on an admin, unlike products/categories.
create policy "staff can view store customers"
  on customers for select
  using (store_id = auth_store_id());

create policy "staff can add store customers"
  on customers for insert
  with check (store_id = auth_store_id());

-- Editing existing details (name, phone, credit limit) stays admin-only,
-- matching every other "edit a record" policy in this schema.
create policy "admin can update store customers"
  on customers for update
  using (store_id = auth_store_id() and auth_role() = 'admin');

create policy "admin can delete store customers"
  on customers for delete
  using (store_id = auth_store_id() and auth_role() = 'admin');

-- ---------------------------------------------------------------------------
-- credit_payments: an append-only ledger of payments against a
-- customer's balance. Same "no client-side INSERT policy" pattern as
-- sales/sale_items — the only way to add a row is through
-- record_credit_payment() below, so a payment can never be recorded
-- without also atomically updating the customer's balance.
-- ---------------------------------------------------------------------------

create table credit_payments (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references stores (id) on delete cascade,
  customer_id uuid not null references customers (id) on delete cascade,
  amount numeric(10, 2) not null check (amount > 0),
  note text,
  created_by uuid not null references staff (id),
  created_at timestamptz not null default now()
);

create index credit_payments_customer_id_idx on credit_payments (customer_id, created_at desc);

alter table credit_payments enable row level security;

create policy "staff can view store credit payments"
  on credit_payments for select
  using (store_id = auth_store_id());

-- ---------------------------------------------------------------------------
-- sales: which customer (if any) a sale was charged to, and how it was paid.
-- ---------------------------------------------------------------------------

alter table sales
  add column customer_id uuid references customers (id) on delete set null,
  add column payment_type text not null default 'cash' check (payment_type in ('cash', 'credit'));

create index sales_customer_id_idx on sales (customer_id) where customer_id is not null;

-- ---------------------------------------------------------------------------
-- checkout_sale: accept an optional customer + payment type. A credit
-- sale still goes through every existing validation (stock locking,
-- server-computed pricing) and additionally row-locks the customer and
-- adds the sale total to their running balance in the same transaction.
-- ---------------------------------------------------------------------------

create or replace function checkout_sale(
  p_items jsonb,
  p_services jsonb default '[]'::jsonb,
  p_customer_id uuid default null,
  p_payment_type text default 'cash'
)
returns table (sale_id uuid, total numeric)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_store_id uuid;
  v_cashier_id uuid := auth.uid();
  v_sale_id uuid;
  v_total numeric(10, 2) := 0;
  v_item jsonb;
  v_product products%rowtype;
  v_customer customers%rowtype;
  v_qty integer;
  v_amount numeric(10, 2);
  v_fee numeric(10, 2);
  v_label text;
  v_line_total numeric(10, 2);
  v_unit_price numeric(10, 2);
  v_computed jsonb := '[]'::jsonb;
  v_computed_item jsonb;
  v_pack_pricing_enabled boolean;
begin
  select store_id into v_store_id from staff where id = v_cashier_id;
  if v_store_id is null then
    raise exception 'Not a registered staff member of any store';
  end if;

  if p_payment_type not in ('cash', 'credit') then
    raise exception 'Invalid payment type';
  end if;

  if p_payment_type = 'credit' then
    if p_customer_id is null then
      raise exception 'A customer is required for a credit sale';
    end if;
    -- Row-lock the customer now so a concurrent credit sale or payment
    -- against the same customer can't race this one's balance update.
    select * into v_customer from customers
      where id = p_customer_id and store_id = v_store_id
      for update;
    if not found then
      raise exception 'Customer not found in this store';
    end if;
  end if;

  if (p_items is null or jsonb_array_length(p_items) = 0)
     and (p_services is null or jsonb_array_length(p_services) = 0) then
    raise exception 'Cart is empty';
  end if;

  select coalesce(enabled, true) into v_pack_pricing_enabled
    from feature_flags where key = 'pack_pricing';
  v_pack_pricing_enabled := coalesce(v_pack_pricing_enabled, true);

  -- Pass 1: validate, lock each product row against concurrent sales, and
  -- compute this line's charge exactly once — the only place pricing is
  -- ever computed.
  for v_item in select * from jsonb_array_elements(coalesce(p_items, '[]'::jsonb))
  loop
    v_qty := (v_item ->> 'quantity')::integer;
    if v_qty is null or v_qty <= 0 then
      raise exception 'Invalid quantity';
    end if;

    select * into v_product from products
      where id = (v_item ->> 'product_id')::uuid
        and store_id = v_store_id
      for update;

    if not found then
      raise exception 'Product not found in this store';
    end if;

    if v_product.stock < v_qty then
      raise exception 'Insufficient stock for %', v_product.name;
    end if;

    if v_product.pack_quantity is not null and v_pack_pricing_enabled then
      v_unit_price := round(v_product.pack_price / v_product.pack_quantity, 2);
      v_line_total := round(v_qty * v_product.pack_price / v_product.pack_quantity, 2);
    else
      v_unit_price := v_product.price;
      v_line_total := round(v_product.price * v_qty, 2);
    end if;
    v_total := v_total + v_line_total;

    v_computed := v_computed || jsonb_build_object(
      'product_id', v_product.id,
      'name', v_product.name,
      'quantity', v_qty,
      'unit_price', v_unit_price,
      'line_total', v_line_total
    );
  end loop;

  -- Services: amount/fee come from the client (no catalog to check
  -- against); still validated for shape and non-negativity.
  for v_item in select * from jsonb_array_elements(coalesce(p_services, '[]'::jsonb))
  loop
    v_amount := (v_item ->> 'amount')::numeric;
    v_fee := coalesce((v_item ->> 'fee')::numeric, 0);
    v_label := v_item ->> 'label';
    if v_label is null or trim(v_label) = '' then
      raise exception 'Service label is required';
    end if;
    if v_amount is null or v_amount <= 0 then
      raise exception 'Invalid service amount';
    end if;
    if v_fee < 0 then
      raise exception 'Invalid service fee';
    end if;
    v_total := v_total + v_amount + v_fee;
  end loop;

  insert into sales (store_id, cashier_id, total, customer_id, payment_type)
    values (v_store_id, v_cashier_id, v_total, p_customer_id, p_payment_type)
    returning id into v_sale_id;

  -- Pass 2: write product line items and deduct stock using the pricing
  -- already computed in Pass 1 — no re-select, no recomputation.
  for v_computed_item in select * from jsonb_array_elements(v_computed)
  loop
    insert into sale_items (sale_id, product_id, name, quantity, price, item_type, line_total)
      values (
        v_sale_id,
        (v_computed_item ->> 'product_id')::uuid,
        v_computed_item ->> 'name',
        (v_computed_item ->> 'quantity')::integer,
        (v_computed_item ->> 'unit_price')::numeric,
        'product',
        (v_computed_item ->> 'line_total')::numeric
      );

    update products
      set stock = stock - (v_computed_item ->> 'quantity')::integer, updated_at = now()
      where id = (v_computed_item ->> 'product_id')::uuid;
  end loop;

  -- Service line items — no stock to touch
  for v_item in select * from jsonb_array_elements(coalesce(p_services, '[]'::jsonb))
  loop
    v_amount := (v_item ->> 'amount')::numeric;
    v_fee := coalesce((v_item ->> 'fee')::numeric, 0);
    v_label := v_item ->> 'label';

    insert into sale_items (sale_id, product_id, name, quantity, price, fee, item_type, line_total)
      values (v_sale_id, null, v_label, 1, v_amount, v_fee, 'service', v_amount + v_fee);
  end loop;

  if p_payment_type = 'credit' then
    update customers set balance = balance + v_total where id = p_customer_id;
  end if;

  return query select v_sale_id, v_total;
end;
$$;

-- p_customer_id/p_payment_type have defaults, but Postgres still treats
-- this as a distinct overload from the old 2-arg signature — drop it so
-- callers can't accidentally resolve to a version that doesn't know
-- about credit sales.
drop function if exists checkout_sale(jsonb, jsonb);

revoke all on function checkout_sale(jsonb, jsonb, uuid, text) from public;
grant execute on function checkout_sale(jsonb, jsonb, uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- record_credit_payment — the only path allowed to pay down a
-- customer's balance. Row-locks the customer for the same reason
-- checkout_sale() does: two concurrent payments (or a payment racing a
-- credit sale) must not lose an update.
-- ---------------------------------------------------------------------------

create or replace function record_credit_payment(
  p_customer_id uuid,
  p_amount numeric,
  p_note text default null
)
returns table (customer_id uuid, new_balance numeric)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_store_id uuid;
  v_staff_id uuid := auth.uid();
  v_customer customers%rowtype;
begin
  select store_id into v_store_id from staff where id = v_staff_id;
  if v_store_id is null then
    raise exception 'Not a registered staff member of any store';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'Payment amount must be greater than zero';
  end if;

  select * into v_customer from customers
    where id = p_customer_id and store_id = v_store_id
    for update;
  if not found then
    raise exception 'Customer not found in this store';
  end if;

  insert into credit_payments (store_id, customer_id, amount, note, created_by)
    values (v_store_id, p_customer_id, p_amount, nullif(trim(coalesce(p_note, '')), ''), v_staff_id);

  update customers set balance = balance - p_amount where id = p_customer_id;

  return query select p_customer_id, v_customer.balance - p_amount;
end;
$$;

revoke all on function record_credit_payment(uuid, numeric, text) from public;
grant execute on function record_credit_payment(uuid, numeric, text) to authenticated;
