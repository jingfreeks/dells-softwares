-- Stock transfer between warehouses (e.g. an attendant restocking the
-- sales floor from the back warehouse). Mirrors checkout_sale's shape:
-- a single SECURITY DEFINER function that row-locks both sides and
-- moves the quantity atomically, so a mid-transfer failure never leaves
-- stock deducted from one warehouse without landing in the other.
--
-- The default warehouse has no row in warehouse_stock — its quantity
-- IS products.stock (see 0017's design note) — so this function reads
-- and writes products.stock directly whenever either side of the
-- transfer is the default warehouse, and warehouse_stock otherwise.

create table warehouse_transfers (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references stores (id) on delete cascade,
  from_warehouse_id uuid not null references warehouses (id),
  to_warehouse_id uuid not null references warehouses (id),
  product_id uuid not null references products (id),
  quantity integer not null check (quantity > 0),
  notes text,
  created_by uuid not null references staff (id),
  created_at timestamptz not null default now()
);

create index warehouse_transfers_store_id_idx on warehouse_transfers (store_id, created_at desc);

alter table warehouse_transfers enable row level security;

create policy "staff can view store transfers"
  on warehouse_transfers for select
  using (store_id = auth_store_id());

-- No client-side insert policy — every transfer is written by
-- transfer_stock() below, which runs as SECURITY DEFINER.

create or replace function transfer_stock(
  p_from_warehouse_id uuid,
  p_to_warehouse_id uuid,
  p_product_id uuid,
  p_quantity integer,
  p_notes text default null
)
returns table (transfer_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_store_id uuid;
  v_from warehouses%rowtype;
  v_to warehouses%rowtype;
  v_product_store_id uuid;
  v_from_stock integer;
  v_transfer_id uuid;
begin
  select store_id into v_store_id from staff where id = auth.uid();
  if v_store_id is null then
    raise exception 'Not a registered staff member of any store';
  end if;

  if p_quantity is null or p_quantity <= 0 then
    raise exception 'Invalid quantity';
  end if;

  if p_from_warehouse_id = p_to_warehouse_id then
    raise exception 'Source and destination warehouses must be different';
  end if;

  select * into v_from from warehouses where id = p_from_warehouse_id and store_id = v_store_id;
  if not found then
    raise exception 'Source warehouse not found';
  end if;

  select * into v_to from warehouses where id = p_to_warehouse_id and store_id = v_store_id;
  if not found then
    raise exception 'Destination warehouse not found';
  end if;

  select store_id into v_product_store_id from products where id = p_product_id;
  if v_product_store_id is null or v_product_store_id <> v_store_id then
    raise exception 'Product not found in this store';
  end if;

  -- Deduct from source, row-locked against a concurrent transfer/sale.
  if v_from.is_default then
    select stock into v_from_stock from products where id = p_product_id for update;
    if v_from_stock < p_quantity then
      raise exception 'Insufficient stock at source warehouse';
    end if;
    update products set stock = stock - p_quantity, updated_at = now() where id = p_product_id;
  else
    insert into warehouse_stock (warehouse_id, product_id, quantity)
      values (p_from_warehouse_id, p_product_id, 0)
      on conflict (warehouse_id, product_id) do nothing;

    select quantity into v_from_stock from warehouse_stock
      where warehouse_id = p_from_warehouse_id and product_id = p_product_id
      for update;
    if v_from_stock < p_quantity then
      raise exception 'Insufficient stock at source warehouse';
    end if;
    update warehouse_stock set quantity = quantity - p_quantity, updated_at = now()
      where warehouse_id = p_from_warehouse_id and product_id = p_product_id;
  end if;

  -- Add to destination.
  if v_to.is_default then
    update products set stock = stock + p_quantity, updated_at = now() where id = p_product_id;
  else
    insert into warehouse_stock (warehouse_id, product_id, quantity)
      values (p_to_warehouse_id, p_product_id, p_quantity)
      on conflict (warehouse_id, product_id)
      do update set quantity = warehouse_stock.quantity + excluded.quantity, updated_at = now();
  end if;

  insert into warehouse_transfers (
    store_id, from_warehouse_id, to_warehouse_id, product_id, quantity, notes, created_by
  )
    values (v_store_id, p_from_warehouse_id, p_to_warehouse_id, p_product_id, p_quantity, p_notes, auth.uid())
    returning id into v_transfer_id;

  return query select v_transfer_id;
end;
$$;

revoke all on function transfer_stock(uuid, uuid, uuid, integer, text) from public;
grant execute on function transfer_stock(uuid, uuid, uuid, integer, text) to authenticated;
