-- Owner PIN override for Utang sales that exceed a customer's credit limit.
--
-- Credit limits were previously advisory only (see 0009_customer_credit.sql)
-- — a warning shown to the cashier, never enforced. This migration makes the
-- limit real: checkout_sale() now rejects a credit sale that would push a
-- customer's balance over their limit unless a valid admin PIN is supplied,
-- and records every such override in a new audit table.
--
-- Rollback, if ever needed:
--   drop table if exists credit_overrides;
--   drop function if exists checkout_sale(jsonb, jsonb, uuid, text, text, text);
--   drop function if exists set_own_pin(text);
--   alter table staff drop column pin_hash;
--   -- then recreate checkout_sale(jsonb, jsonb, uuid, text, text) from 0020's body.

alter table staff add column pin_hash text;

-- ---------------------------------------------------------------------------
-- set_own_pin — lets any signed-in staff member set/change their own PIN.
-- The PIN is never stored in plaintext; only a bcrypt hash via pgcrypto
-- (already enabled in 0001_init.sql). A 4-digit numeric PIN is enough
-- entropy here because it's checked server-side only, against a specific
-- store's admins, not brute-forceable over the network at any real rate.
-- ---------------------------------------------------------------------------

create or replace function set_own_pin(p_pin text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_pin !~ '^\d{4}$' then
    raise exception 'PIN must be exactly 4 digits';
  end if;
  update staff set pin_hash = crypt(p_pin, gen_salt('bf')) where id = auth.uid();
  if not found then
    raise exception 'Not a registered staff member';
  end if;
end;
$$;

revoke all on function set_own_pin(text) from public;
grant execute on function set_own_pin(text) to authenticated;

-- ---------------------------------------------------------------------------
-- credit_overrides: an append-only audit ledger, same "no client INSERT
-- policy" pattern as credit_payments (0009_customer_credit.sql) — the only
-- way a row is ever created is inside checkout_sale()'s own transaction,
-- so an override can never be recorded without the sale it belongs to
-- actually completing, and never forged by a client.
-- ---------------------------------------------------------------------------

create table credit_overrides (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references stores (id) on delete cascade,
  sale_id uuid not null references sales (id) on delete cascade,
  customer_id uuid not null references customers (id) on delete cascade,
  cashier_id uuid not null references staff (id),
  approved_by uuid not null references staff (id),
  previous_balance numeric(10, 2) not null,
  credit_limit numeric(10, 2) not null,
  transaction_total numeric(10, 2) not null,
  resulting_balance numeric(10, 2) not null,
  created_at timestamptz not null default now()
);

create index credit_overrides_store_id_idx on credit_overrides (store_id, created_at desc);

alter table credit_overrides enable row level security;

create policy "staff can view store credit overrides"
  on credit_overrides for select
  using (store_id = auth_store_id());

-- ---------------------------------------------------------------------------
-- checkout_sale: now enforces the credit limit for real. A credit sale that
-- would push the customer over their limit is rejected with a specific,
-- client-recognizable error unless a valid p_override_pin is supplied — the
-- PIN is checked against any admin of the SAME store (matching the "ask an
-- authorized owner or manager" UX; the cashier doesn't need to know which
-- admin is nearby). The limit check and the override check happen inside
-- the same transaction that already row-locks the customer, so a
-- concurrent sale against the same customer can't race between "checked"
-- and "committed".
-- ---------------------------------------------------------------------------

create or replace function checkout_sale(
  p_items jsonb,
  p_services jsonb default '[]'::jsonb,
  p_customer_id uuid default null,
  p_payment_type text default 'cash',
  p_reference_no text default null,
  p_override_pin text default null
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
  v_seen_product_ids uuid[] := '{}';
  v_product_id uuid;
  v_reference_no text;
  v_insufficient_stock text[] := '{}';
  v_max_service_amount constant numeric := 50000;
  v_projected_balance numeric(10, 2);
  v_approver staff%rowtype;
begin
  select store_id into v_store_id from staff where id = v_cashier_id;
  if v_store_id is null then raise exception 'Not a registered staff member of any store'; end if;
  if p_payment_type not in ('cash', 'credit', 'qr') then raise exception 'Invalid payment type'; end if;
  if p_payment_type = 'credit' then
    if p_customer_id is null then raise exception 'A customer is required for a credit sale'; end if;
    select * into v_customer from customers where id = p_customer_id and store_id = v_store_id for update;
    if not found then raise exception 'Customer not found in this store'; end if;
  end if;
  v_reference_no := nullif(trim(coalesce(p_reference_no, '')), '');
  if p_payment_type = 'qr' and v_reference_no is null then raise exception 'A reference number is required for a QR payment'; end if;
  if p_payment_type <> 'qr' then v_reference_no := null; end if;
  if (p_items is null or jsonb_array_length(p_items) = 0) and (p_services is null or jsonb_array_length(p_services) = 0) then raise exception 'Cart is empty'; end if;

  for v_product_id in select (jsonb_array_elements(coalesce(p_items, '[]'::jsonb)) ->> 'product_id')::uuid loop
    if v_product_id = any(v_seen_product_ids) then raise exception 'Duplicate product in cart — combine it into a single line with the total quantity'; end if;
    v_seen_product_ids := array_append(v_seen_product_ids, v_product_id);
  end loop;
  select coalesce(enabled, true) into v_pack_pricing_enabled from feature_flags where key = 'pack_pricing';
  v_pack_pricing_enabled := coalesce(v_pack_pricing_enabled, true);

  for v_item in select value from jsonb_array_elements(coalesce(p_items, '[]'::jsonb)) order by value ->> 'product_id' loop
    v_qty := (v_item ->> 'quantity')::integer;
    if v_qty is null or v_qty <= 0 then raise exception 'Invalid quantity'; end if;
    select * into v_product from products where id = (v_item ->> 'product_id')::uuid and store_id = v_store_id for update;
    if not found then raise exception 'Product not found in this store'; end if;
    if v_product.stock < v_qty then
      v_insufficient_stock := array_append(v_insufficient_stock, format('%s: Insufficient stock. Only %s item(s) available.', v_product.name, greatest(v_product.stock, 0)));
      continue;
    end if;
    if v_product.pack_quantity is not null and v_pack_pricing_enabled then
      v_unit_price := round(v_product.pack_price / v_product.pack_quantity, 2);
      v_line_total := round(v_qty * v_product.pack_price / v_product.pack_quantity, 2);
    else
      v_unit_price := v_product.price;
      v_line_total := round(v_product.price * v_qty, 2);
    end if;
    v_total := v_total + v_line_total;
    v_computed := v_computed || jsonb_build_object('product_id', v_product.id, 'name', v_product.name, 'quantity', v_qty, 'unit_price', v_unit_price, 'line_total', v_line_total);
  end loop;
  if cardinality(v_insufficient_stock) > 0 then raise exception '%', array_to_string(v_insufficient_stock, ' '); end if;

  for v_item in select * from jsonb_array_elements(coalesce(p_services, '[]'::jsonb)) loop
    v_amount := (v_item ->> 'amount')::numeric; v_fee := coalesce((v_item ->> 'fee')::numeric, 0); v_label := v_item ->> 'label';
    if v_label is null or trim(v_label) = '' then raise exception 'Service label is required'; end if;
    if v_amount is null or v_amount <= 0 then raise exception 'Invalid service amount'; end if;
    if v_fee < 0 then raise exception 'Invalid service fee'; end if;
    if v_amount + v_fee > v_max_service_amount then raise exception 'Service amount exceeds the maximum allowed per transaction'; end if;
    v_total := v_total + v_amount + v_fee;
  end loop;

  -- Real credit-limit enforcement. v_customer was already row-locked above,
  -- so this reflects the true, current balance — no stale-read race with a
  -- concurrent sale against the same customer.
  if p_payment_type = 'credit' then
    v_projected_balance := v_customer.balance + v_total;
    if v_customer.credit_limit is not null and v_projected_balance > v_customer.credit_limit then
      if p_override_pin is null then
        raise exception 'CREDIT_LIMIT_EXCEEDED';
      end if;
      select * into v_approver from staff
        where store_id = v_store_id
          and role = 'admin'
          and pin_hash is not null
          and pin_hash = crypt(p_override_pin, pin_hash)
        limit 1;
      if not found then
        raise exception 'INVALID_OVERRIDE_PIN';
      end if;
    end if;
  end if;

  insert into sales (store_id, cashier_id, total, customer_id, payment_type, reference_no) values (v_store_id, v_cashier_id, v_total, p_customer_id, p_payment_type, v_reference_no) returning id into v_sale_id;
  for v_computed_item in select * from jsonb_array_elements(v_computed) loop
    insert into sale_items (sale_id, product_id, name, quantity, price, item_type, line_total) values (v_sale_id, (v_computed_item ->> 'product_id')::uuid, v_computed_item ->> 'name', (v_computed_item ->> 'quantity')::integer, (v_computed_item ->> 'unit_price')::numeric, 'product', (v_computed_item ->> 'line_total')::numeric);
    update products set stock = stock - (v_computed_item ->> 'quantity')::integer, updated_at = now() where id = (v_computed_item ->> 'product_id')::uuid;
  end loop;
  for v_item in select * from jsonb_array_elements(coalesce(p_services, '[]'::jsonb)) loop
    v_amount := (v_item ->> 'amount')::numeric; v_fee := coalesce((v_item ->> 'fee')::numeric, 0); v_label := v_item ->> 'label';
    insert into sale_items (sale_id, product_id, name, quantity, price, fee, item_type, line_total) values (v_sale_id, null, v_label, 1, v_amount, v_fee, 'service', v_amount + v_fee);
  end loop;

  if p_payment_type = 'credit' then
    update customers set balance = balance + v_total where id = p_customer_id;
    if v_approver.id is not null then
      insert into credit_overrides (store_id, sale_id, customer_id, cashier_id, approved_by, previous_balance, credit_limit, transaction_total, resulting_balance)
        values (v_store_id, v_sale_id, p_customer_id, v_cashier_id, v_approver.id, v_customer.balance, v_customer.credit_limit, v_total, v_projected_balance);
    end if;
  end if;

  return query select v_sale_id, v_total;
end;
$$;

-- p_override_pin has a default, but Postgres still treats this as a
-- distinct overload from the old 5-arg signature — drop it so callers
-- can't accidentally resolve to a version that doesn't enforce the
-- credit limit.
drop function if exists checkout_sale(jsonb, jsonb, uuid, text, text);

revoke all on function checkout_sale(jsonb, jsonb, uuid, text, text, text) from public;
grant execute on function checkout_sale(jsonb, jsonb, uuid, text, text, text) to authenticated;
