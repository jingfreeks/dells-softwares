-- Tindahan POS — backend for the standalone Inventory Management app.
--
-- This app is a separate frontend (apps/inventory-app) but shares this
-- same Supabase project/database with tindahan-pos, so it reuses
-- stores/staff/products/suppliers and the auth_store_id()/auth_role()
-- helpers from 0001_init.sql. Migrations stay centralized here since
-- this is the one Supabase project both apps point at.
--
-- New domain: warehouses, purchase orders, unit conversion, beginning
-- balance, and physical inventory counts ("actual inventory"). Receiving
-- (0004) and suppliers (0010) already exist and are extended rather than
-- duplicated.
--
-- Multi-warehouse note: products.stock remains the single source of
-- truth the POS checkout_sale() function reads/decrements — changing
-- that would touch tindahan-pos's checkout path, which is out of scope
-- here. Every store gets exactly one `is_default` warehouse representing
-- that existing stock; additional warehouses track their own stock in
-- warehouse_stock and are additive, not a replacement.

-- ---------------------------------------------------------------------------
-- Warehouses
-- ---------------------------------------------------------------------------

create table warehouses (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references stores (id) on delete cascade,
  name text not null,
  address text,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);

create index warehouses_store_id_idx on warehouses (store_id);

-- Exactly one default warehouse per store (the one products.stock represents).
create unique index warehouses_one_default_per_store
  on warehouses (store_id)
  where is_default;

alter table warehouses enable row level security;

create policy "staff can view store warehouses"
  on warehouses for select
  using (store_id = auth_store_id());

create policy "admin can insert warehouses"
  on warehouses for insert
  with check (store_id = auth_store_id() and auth_role() = 'admin');

create policy "admin can update warehouses"
  on warehouses for update
  using (store_id = auth_store_id() and auth_role() = 'admin');

create policy "admin can delete warehouses"
  on warehouses for delete
  using (store_id = auth_store_id() and auth_role() = 'admin' and not is_default);

-- Backfill: give every existing store its default warehouse.
insert into warehouses (store_id, name, is_default)
  select id, 'Main Store', true from stores;

-- ---------------------------------------------------------------------------
-- Non-default warehouse stock. The default warehouse's stock is always
-- read from products.stock instead of a row here (kept in sync with POS).
-- ---------------------------------------------------------------------------

create table warehouse_stock (
  id uuid primary key default gen_random_uuid(),
  warehouse_id uuid not null references warehouses (id) on delete cascade,
  product_id uuid not null references products (id) on delete cascade,
  quantity integer not null default 0 check (quantity >= 0),
  updated_at timestamptz not null default now(),
  unique (warehouse_id, product_id)
);

create index warehouse_stock_warehouse_id_idx on warehouse_stock (warehouse_id);

alter table warehouse_stock enable row level security;

create policy "staff can view store warehouse stock"
  on warehouse_stock for select
  using (
    exists (
      select 1 from warehouses
      where warehouses.id = warehouse_stock.warehouse_id
        and warehouses.store_id = auth_store_id()
    )
  );

create policy "admin can upsert warehouse stock"
  on warehouse_stock for insert
  with check (
    exists (
      select 1 from warehouses
      where warehouses.id = warehouse_stock.warehouse_id
        and warehouses.store_id = auth_store_id()
        and auth_role() = 'admin'
    )
  );

create policy "admin can update warehouse stock"
  on warehouse_stock for update
  using (
    exists (
      select 1 from warehouses
      where warehouses.id = warehouse_stock.warehouse_id
        and warehouses.store_id = auth_store_id()
        and auth_role() = 'admin'
    )
  );

-- ---------------------------------------------------------------------------
-- Purchase orders — precede receiving. A receiving entry can optionally
-- reference the PO it fulfills (partial receipt is allowed: a PO's status
-- tracks how much of it has been received so far).
-- ---------------------------------------------------------------------------

create type purchase_order_status as enum (
  'draft',
  'submitted',
  'partially_received',
  'received',
  'cancelled'
);

create table purchase_orders (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references stores (id) on delete cascade,
  supplier_id uuid references suppliers (id) on delete set null,
  warehouse_id uuid not null references warehouses (id),
  status purchase_order_status not null default 'draft',
  order_date date not null default current_date,
  expected_date date,
  notes text,
  created_by uuid not null references staff (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index purchase_orders_store_id_idx on purchase_orders (store_id, order_date desc);

create table purchase_order_lines (
  id uuid primary key default gen_random_uuid(),
  purchase_order_id uuid not null references purchase_orders (id) on delete cascade,
  product_id uuid references products (id) on delete set null,
  product_name text not null,
  quantity_ordered integer not null check (quantity_ordered > 0),
  quantity_received integer not null default 0 check (quantity_received >= 0),
  unit_cost numeric(10, 2) not null default 0 check (unit_cost >= 0)
);

create index purchase_order_lines_po_id_idx on purchase_order_lines (purchase_order_id);

alter table purchase_orders enable row level security;
alter table purchase_order_lines enable row level security;

create policy "staff can view store purchase orders"
  on purchase_orders for select
  using (store_id = auth_store_id());

create policy "admin can insert purchase orders"
  on purchase_orders for insert
  with check (store_id = auth_store_id() and auth_role() = 'admin' and created_by = auth.uid());

create policy "admin can update purchase orders"
  on purchase_orders for update
  using (store_id = auth_store_id() and auth_role() = 'admin');

create policy "admin can delete purchase orders"
  on purchase_orders for delete
  using (store_id = auth_store_id() and auth_role() = 'admin' and status = 'draft');

create policy "staff can view store purchase order lines"
  on purchase_order_lines for select
  using (
    exists (
      select 1 from purchase_orders
      where purchase_orders.id = purchase_order_lines.purchase_order_id
        and purchase_orders.store_id = auth_store_id()
    )
  );

create policy "admin can insert purchase order lines"
  on purchase_order_lines for insert
  with check (
    exists (
      select 1 from purchase_orders
      where purchase_orders.id = purchase_order_lines.purchase_order_id
        and purchase_orders.store_id = auth_store_id()
        and auth_role() = 'admin'
    )
  );

create policy "admin can update purchase order lines"
  on purchase_order_lines for update
  using (
    exists (
      select 1 from purchase_orders
      where purchase_orders.id = purchase_order_lines.purchase_order_id
        and purchase_orders.store_id = auth_store_id()
        and auth_role() = 'admin'
    )
  );

create policy "admin can delete purchase order lines"
  on purchase_order_lines for delete
  using (
    exists (
      select 1 from purchase_orders
      where purchase_orders.id = purchase_order_lines.purchase_order_id
        and purchase_orders.store_id = auth_store_id()
        and auth_role() = 'admin'
    )
  );

-- Receiving now optionally fulfills a PO and happens at a specific warehouse.
alter table receiving_entries
  add column purchase_order_id uuid references purchase_orders (id) on delete set null,
  add column warehouse_id uuid references warehouses (id);

update receiving_entries re
  set warehouse_id = w.id
  from warehouses w
  where w.store_id = re.store_id and w.is_default;

alter table receiving_entries
  alter column warehouse_id set not null;

create index receiving_entries_po_id_idx on receiving_entries (purchase_order_id) where purchase_order_id is not null;

-- ---------------------------------------------------------------------------
-- Unit conversion — e.g. 1 "case" = 24 "pcs". products.stock and prices
-- are always in the base unit; conversions only affect quantity entry
-- (receiving, PO, counts) and display.
-- ---------------------------------------------------------------------------

create table product_unit_conversions (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references stores (id) on delete cascade,
  product_id uuid not null references products (id) on delete cascade,
  unit_name text not null,
  base_unit_factor numeric(12, 4) not null check (base_unit_factor > 0),
  created_at timestamptz not null default now(),
  unique (product_id, unit_name)
);

create index product_unit_conversions_product_id_idx on product_unit_conversions (product_id);

alter table product_unit_conversions enable row level security;

create policy "staff can view store unit conversions"
  on product_unit_conversions for select
  using (store_id = auth_store_id());

create policy "admin can insert unit conversions"
  on product_unit_conversions for insert
  with check (store_id = auth_store_id() and auth_role() = 'admin');

create policy "admin can update unit conversions"
  on product_unit_conversions for update
  using (store_id = auth_store_id() and auth_role() = 'admin');

create policy "admin can delete unit conversions"
  on product_unit_conversions for delete
  using (store_id = auth_store_id() and auth_role() = 'admin');

-- ---------------------------------------------------------------------------
-- Beginning balance — the opening on-hand snapshot per product/warehouse,
-- captured once (e.g. when a store or warehouse first goes live on this
-- system). Historical record only; it does not itself change stock.
-- ---------------------------------------------------------------------------

create table inventory_beginning_balances (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references stores (id) on delete cascade,
  warehouse_id uuid not null references warehouses (id) on delete cascade,
  product_id uuid not null references products (id) on delete cascade,
  quantity integer not null check (quantity >= 0),
  unit_cost numeric(10, 2) not null default 0 check (unit_cost >= 0),
  as_of_date date not null,
  created_by uuid not null references staff (id),
  created_at timestamptz not null default now(),
  unique (warehouse_id, product_id)
);

create index inventory_beginning_balances_store_id_idx on inventory_beginning_balances (store_id);

alter table inventory_beginning_balances enable row level security;

create policy "staff can view store beginning balances"
  on inventory_beginning_balances for select
  using (store_id = auth_store_id());

create policy "admin can insert beginning balances"
  on inventory_beginning_balances for insert
  with check (store_id = auth_store_id() and auth_role() = 'admin' and created_by = auth.uid());

create policy "admin can update beginning balances"
  on inventory_beginning_balances for update
  using (store_id = auth_store_id() and auth_role() = 'admin');

create policy "admin can delete beginning balances"
  on inventory_beginning_balances for delete
  using (store_id = auth_store_id() and auth_role() = 'admin');

-- ---------------------------------------------------------------------------
-- Actual inventory — physical counts ("stock take") reconciled against
-- system quantity at count time. Variance is stored, not auto-applied to
-- products.stock; an admin adjustment is a deliberate follow-up action,
-- not implicit here.
-- ---------------------------------------------------------------------------

create type inventory_count_status as enum ('open', 'closed');

create table inventory_counts (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references stores (id) on delete cascade,
  warehouse_id uuid not null references warehouses (id),
  status inventory_count_status not null default 'open',
  counted_on date not null default current_date,
  created_by uuid not null references staff (id),
  created_at timestamptz not null default now(),
  closed_at timestamptz
);

create index inventory_counts_store_id_idx on inventory_counts (store_id, counted_on desc);

create table inventory_count_lines (
  id uuid primary key default gen_random_uuid(),
  inventory_count_id uuid not null references inventory_counts (id) on delete cascade,
  product_id uuid not null references products (id) on delete cascade,
  system_quantity integer not null check (system_quantity >= 0),
  counted_quantity integer not null check (counted_quantity >= 0),
  variance integer generated always as (counted_quantity - system_quantity) stored,
  unique (inventory_count_id, product_id)
);

create index inventory_count_lines_count_id_idx on inventory_count_lines (inventory_count_id);

alter table inventory_counts enable row level security;
alter table inventory_count_lines enable row level security;

create policy "staff can view store inventory counts"
  on inventory_counts for select
  using (store_id = auth_store_id());

create policy "admin can insert inventory counts"
  on inventory_counts for insert
  with check (store_id = auth_store_id() and auth_role() = 'admin' and created_by = auth.uid());

create policy "admin can update inventory counts"
  on inventory_counts for update
  using (store_id = auth_store_id() and auth_role() = 'admin');

create policy "staff can view store inventory count lines"
  on inventory_count_lines for select
  using (
    exists (
      select 1 from inventory_counts
      where inventory_counts.id = inventory_count_lines.inventory_count_id
        and inventory_counts.store_id = auth_store_id()
    )
  );

create policy "admin can insert inventory count lines"
  on inventory_count_lines for insert
  with check (
    exists (
      select 1 from inventory_counts
      where inventory_counts.id = inventory_count_lines.inventory_count_id
        and inventory_counts.store_id = auth_store_id()
        and auth_role() = 'admin'
    )
  );

create policy "admin can update inventory count lines"
  on inventory_count_lines for update
  using (
    exists (
      select 1 from inventory_counts
      where inventory_counts.id = inventory_count_lines.inventory_count_id
        and inventory_counts.store_id = auth_store_id()
        and auth_role() = 'admin'
    )
  );
