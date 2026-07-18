-- Tindahan POS — v1.1 backend completion for Receiving (E2) and POS
-- services (E3).
--
-- Receiving: persists what was previously an in-memory-only history list,
-- so a receiving entry survives a page reload. Stock increases already
-- went through products (admin-only RLS via the existing update policy);
-- this just adds the paper trail alongside it.
--
-- Services: extends checkout_sale so e-load/GCash cash-in/cash-out lines
-- ride in the same atomic checkout as products, instead of only being
-- reflected in the on-screen total and never recorded. Unlike products,
-- a service has no catalog row to look the price up from — the
-- amount/fee genuinely comes from the cashier at checkout time, so
-- (unlike product price) it is legitimately client-supplied.

-- ---------------------------------------------------------------------------
-- sale_items: distinguish product lines from service lines, and capture
-- the fee/commission portion separately from the base amount so reports
-- can split product vs service income (proposal §9.3 acceptance criteria).
-- ---------------------------------------------------------------------------

create type sale_item_type as enum ('product', 'service');

alter table sale_items
  add column item_type sale_item_type not null default 'product',
  add column fee numeric(10, 2) not null default 0 check (fee >= 0);

-- ---------------------------------------------------------------------------
-- Receiving history
-- ---------------------------------------------------------------------------

create table receiving_entries (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references stores (id) on delete cascade,
  supplier text not null,
  received_on date not null,
  created_by uuid not null references staff (id),
  created_at timestamptz not null default now()
);

create index receiving_entries_store_id_idx on receiving_entries (store_id, received_on desc);

create table receiving_lines (
  id uuid primary key default gen_random_uuid(),
  receiving_entry_id uuid not null references receiving_entries (id) on delete cascade,
  product_id uuid references products (id) on delete set null,
  product_name text not null,
  quantity integer not null check (quantity > 0),
  cost_each numeric(10, 2) not null default 0 check (cost_each >= 0)
);

create index receiving_lines_entry_id_idx on receiving_lines (receiving_entry_id);

alter table receiving_entries enable row level security;
alter table receiving_lines enable row level security;

-- Same shape as products: any staff of the store can read, only admins
-- write — receiving stock is an admin action (proposal story E2).
create policy "staff can view store receiving entries"
  on receiving_entries for select
  using (store_id = auth_store_id());

create policy "admin can insert receiving entries"
  on receiving_entries for insert
  with check (store_id = auth_store_id() and auth_role() = 'admin' and created_by = auth.uid());

create policy "staff can view store receiving lines"
  on receiving_lines for select
  using (
    exists (
      select 1 from receiving_entries
      where receiving_entries.id = receiving_lines.receiving_entry_id
        and receiving_entries.store_id = auth_store_id()
    )
  );

create policy "admin can insert receiving lines"
  on receiving_lines for insert
  with check (
    exists (
      select 1 from receiving_entries
      where receiving_entries.id = receiving_lines.receiving_entry_id
        and receiving_entries.store_id = auth_store_id()
        and auth_role() = 'admin'
    )
  );

-- ---------------------------------------------------------------------------
-- checkout_sale: accept an optional services array alongside products.
-- Services have no stock and no catalog price — the cashier-entered
-- amount/fee is trusted (there is nothing server-side to check it
-- against), but they still ride the same atomic insert as the rest of
-- the sale so a service is never partially recorded.
-- ---------------------------------------------------------------------------

-- Replaces the single-arg version from 0001_init.sql with an overloaded
-- signature; drop the old one so callers can't accidentally resolve to it.
drop function if exists checkout_sale(jsonb);

create or replace function checkout_sale(p_items jsonb, p_services jsonb default '[]'::jsonb)
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
  v_qty integer;
  v_amount numeric(10, 2);
  v_fee numeric(10, 2);
  v_label text;
begin
  select store_id into v_store_id from staff where id = v_cashier_id;
  if v_store_id is null then
    raise exception 'Not a registered staff member of any store';
  end if;

  if (p_items is null or jsonb_array_length(p_items) = 0)
     and (p_services is null or jsonb_array_length(p_services) = 0) then
    raise exception 'Cart is empty';
  end if;

  -- Pass 1: validate and total products, locking each row against concurrent sales
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

    v_total := v_total + (v_product.price * v_qty);
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

  insert into sales (store_id, cashier_id, total)
    values (v_store_id, v_cashier_id, v_total)
    returning id into v_sale_id;

  -- Pass 2: write product line items and deduct stock
  for v_item in select * from jsonb_array_elements(coalesce(p_items, '[]'::jsonb))
  loop
    v_qty := (v_item ->> 'quantity')::integer;
    select * into v_product from products where id = (v_item ->> 'product_id')::uuid;

    insert into sale_items (sale_id, product_id, name, quantity, price, item_type)
      values (v_sale_id, v_product.id, v_product.name, v_qty, v_product.price, 'product');

    update products
      set stock = stock - v_qty, updated_at = now()
      where id = v_product.id;
  end loop;

  -- Service line items — no stock to touch
  for v_item in select * from jsonb_array_elements(coalesce(p_services, '[]'::jsonb))
  loop
    v_amount := (v_item ->> 'amount')::numeric;
    v_fee := coalesce((v_item ->> 'fee')::numeric, 0);
    v_label := v_item ->> 'label';

    insert into sale_items (sale_id, product_id, name, quantity, price, fee, item_type)
      values (v_sale_id, null, v_label, 1, v_amount, v_fee, 'service');
  end loop;

  return query select v_sale_id, v_total;
end;
$$;

revoke all on function checkout_sale(jsonb, jsonb) from public;
grant execute on function checkout_sale(jsonb, jsonb) to authenticated;
