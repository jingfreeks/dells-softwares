-- Tindahan POS — initial schema, indexes, and Row Level Security
--
-- Security model summary:
--   * Every table is scoped to a store via store_id. RLS policies compare
--     store_id against the CALLING user's own staff.store_id — a user can
--     never read or write another store's data, even by guessing IDs.
--   * "admin" and "cashier" are the only two roles. Cashiers can read
--     products and check out sales; only admins can edit products, view
--     sales history/reports, or manage staff.
--   * Checkout never trusts client-supplied prices or does a raw client-side
--     stock UPDATE. It goes through checkout_sale(), a SECURITY DEFINER
--     function that recomputes totals from the products table server-side,
--     row-locks stock to prevent race conditions, and is the only path
--     allowed to write to sales/sale_items/products.stock.
--   * Cashier accounts are never created via the public self-registration
--     trigger (which would let a signup request forge itself into an
--     existing store). They're provisioned by the create-cashier Edge
--     Function, which holds the service_role key and is the only trusted
--     caller allowed to attach a new user to an existing store.

create extension if not exists pgcrypto;

create type staff_role as enum ('admin', 'cashier');

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table stores (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table staff (
  id uuid primary key references auth.users (id) on delete cascade,
  store_id uuid not null references stores (id) on delete cascade,
  name text not null,
  email text not null,
  role staff_role not null default 'cashier',
  created_at timestamptz not null default now()
);

create index staff_store_id_idx on staff (store_id);

create table products (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references stores (id) on delete cascade,
  barcode text,
  name text not null,
  price numeric(10, 2) not null check (price >= 0),
  stock integer not null default 0 check (stock >= 0),
  low_stock_threshold integer not null default 5 check (low_stock_threshold >= 0),
  category text not null default 'Uncategorized',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index products_store_id_idx on products (store_id);
create unique index products_store_barcode_key
  on products (store_id, barcode)
  where barcode is not null;

create table sales (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references stores (id) on delete cascade,
  cashier_id uuid not null references staff (id),
  total numeric(10, 2) not null check (total >= 0),
  created_at timestamptz not null default now()
);

create index sales_store_created_idx on sales (store_id, created_at desc);

create table sale_items (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references sales (id) on delete cascade,
  product_id uuid references products (id) on delete set null,
  name text not null,
  quantity integer not null check (quantity > 0),
  price numeric(10, 2) not null check (price >= 0)
);

create index sale_items_sale_id_idx on sale_items (sale_id);

-- ---------------------------------------------------------------------------
-- Helper functions (SECURITY DEFINER so RLS policies can look up the
-- caller's store/role without recursively re-checking RLS on `staff` itself)
-- ---------------------------------------------------------------------------

create or replace function auth_store_id()
returns uuid
language sql
security definer
stable
set search_path = public
as $$
  select store_id from staff where id = auth.uid()
$$;

create or replace function auth_role()
returns staff_role
language sql
security definer
stable
set search_path = public
as $$
  select role from staff where id = auth.uid()
$$;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table stores enable row level security;
alter table staff enable row level security;
alter table products enable row level security;
alter table sales enable row level security;
alter table sale_items enable row level security;

-- stores: read own store; only admins can rename it
create policy "staff can view own store"
  on stores for select
  using (id = auth_store_id());

create policy "admin can update own store"
  on stores for update
  using (id = auth_store_id() and auth_role() = 'admin');

-- staff: everyone can see their own row; admins can see/manage their store's roster
create policy "staff can view self or admin views roster"
  on staff for select
  using (id = auth.uid() or (store_id = auth_store_id() and auth_role() = 'admin'));

create policy "admin can update staff in own store"
  on staff for update
  using (store_id = auth_store_id() and auth_role() = 'admin');

create policy "admin can delete other staff in own store"
  on staff for delete
  using (store_id = auth_store_id() and auth_role() = 'admin' and id <> auth.uid());

-- Note: there is deliberately no client-side INSERT policy on staff.
-- Admin accounts are created by the handle_new_user trigger below; cashier
-- accounts are created by the create-cashier Edge Function using the
-- service_role key, which bypasses RLS entirely by design.

-- products: any staff of the store can read; only admins can write
create policy "staff can view store products"
  on products for select
  using (store_id = auth_store_id());

create policy "admin can insert products"
  on products for insert
  with check (store_id = auth_store_id() and auth_role() = 'admin');

create policy "admin can update products"
  on products for update
  using (store_id = auth_store_id() and auth_role() = 'admin');

create policy "admin can delete products"
  on products for delete
  using (store_id = auth_store_id() and auth_role() = 'admin');

-- Note: there is deliberately no client-side UPDATE policy that would let a
-- cashier decrement stock directly. Stock changes during checkout only
-- happen inside checkout_sale() (below), which runs as SECURITY DEFINER.

-- sales / sale_items: reports are admin-only; there is no client-side INSERT
-- policy at all — every sale is written by checkout_sale()
create policy "admin can view store sales"
  on sales for select
  using (store_id = auth_store_id() and auth_role() = 'admin');

create policy "admin can view store sale items"
  on sale_items for select
  using (
    exists (
      select 1 from sales
      where sales.id = sale_items.sale_id
        and sales.store_id = auth_store_id()
        and auth_role() = 'admin'
    )
  );

-- ---------------------------------------------------------------------------
-- checkout_sale — the only path allowed to record a sale
--
-- Takes the cart as JSON [{ "product_id": "...", "quantity": 2 }, ...].
-- Deliberately does NOT accept a client-supplied price or name: both are
-- read fresh from the products table so a tampered client request can never
-- under-charge or record a fake item. Row-locks each product (FOR UPDATE)
-- to prevent two concurrent checkouts from overselling the same stock.
-- ---------------------------------------------------------------------------

create or replace function checkout_sale(p_items jsonb)
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
begin
  select store_id into v_store_id from staff where id = v_cashier_id;
  if v_store_id is null then
    raise exception 'Not a registered staff member of any store';
  end if;

  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'Cart is empty';
  end if;

  -- Pass 1: validate and total, locking each product row against concurrent sales
  for v_item in select * from jsonb_array_elements(p_items)
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

  insert into sales (store_id, cashier_id, total)
    values (v_store_id, v_cashier_id, v_total)
    returning id into v_sale_id;

  -- Pass 2: write line items and deduct stock (price/name from the DB, not the client)
  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_qty := (v_item ->> 'quantity')::integer;
    select * into v_product from products where id = (v_item ->> 'product_id')::uuid;

    insert into sale_items (sale_id, product_id, name, quantity, price)
      values (v_sale_id, v_product.id, v_product.name, v_qty, v_product.price);

    update products
      set stock = stock - v_qty, updated_at = now()
      where id = v_product.id;
  end loop;

  return query select v_sale_id, v_total;
end;
$$;

revoke all on function checkout_sale(jsonb) from public;
grant execute on function checkout_sale(jsonb) to authenticated;

-- ---------------------------------------------------------------------------
-- Self-registration: signing up via the public Register screen creates a
-- brand-new store and makes that user its admin (story D1). This trigger
-- intentionally ignores any store_id the client might try to pass in
-- metadata — it always creates a fresh store, so a forged signup can never
-- attach itself to someone else's store as a free admin account.
-- ---------------------------------------------------------------------------

create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_store_id uuid;
  v_store_name text;
  v_owner_name text;
begin
  v_store_name := coalesce(nullif(trim(new.raw_user_meta_data ->> 'store_name'), ''), 'My Store');
  v_owner_name := coalesce(nullif(trim(new.raw_user_meta_data ->> 'owner_name'), ''), new.email);

  insert into stores (name) values (v_store_name)
    returning id into v_store_id;

  insert into staff (id, store_id, name, email, role)
    values (new.id, v_store_id, v_owner_name, new.email, 'admin');

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
