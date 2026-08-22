-- =============================================================================
-- Enforcement · The INVENTORY module actually gates writes
-- -----------------------------------------------------------------------------
-- Until now core.module_enabled() was answerable but unasked: entitlement
-- could be granted and revoked, and nothing changed. This is the first
-- migration that makes a Super Admin toggle mean something.
--
-- WRITES ONLY. Architecture v1 §08's grace/downgrade table is explicit that
-- reading and exporting existing data stays available in EVERY state --
-- Active, Past due, Suspended and Cancelled alike:
--
--     State                     Read   Create   Export
--     Active                    Yes    Yes      Yes
--     Past due (grace, 14d)     Yes    Yes*     Yes
--     Suspended                 Yes    No       Yes     <- read-only
--     Cancelled (90d)           Yes    No       Yes     <- read-only
--
-- So no SELECT policy is touched anywhere in this migration. A tenant whose
-- Inventory module is switched off keeps full visibility of their warehouses,
-- purchase orders and stock counts, and can still export them; they simply
-- cannot create or change them. "Data is never destroyed on downgrade."
--
-- That is also what makes this safe to ship: the worst case of a wrong
-- entitlement row is a blocked write, never a customer locked out of their
-- own records.
--
-- TODAY THIS IS A NO-OP. Every organization was backfilled onto BASIC
-- (POS + INVENTORY) and new ones get it by trigger, so every tenant passes
-- these checks. It only bites the first time someone deliberately disables
-- the module.
--
-- -----------------------------------------------------------------------------
-- Scope: which tables count as "Inventory"
--
-- Deliberately conservative. Only tables reachable EXCLUSIVELY from
-- inventory-app are gated. Anything tindahan-pos also touches is left alone,
-- because a POS-only tenant must not lose part of their till:
--
--   GATED (inventory-app only, back office)
--     warehouses, warehouse_stock, warehouse_transfers,
--     purchase_orders, purchase_order_lines,
--     product_unit_conversions, inventory_beginning_balances,
--     inventory_counts, inventory_count_lines
--
--   NOT GATED, and why
--     products, categories   POS cannot function without them; the FREE plan
--                            even carries a `products` limit, so basic product
--                            management is POS, not Inventory.
--     suppliers              tindahan-pos has its own /suppliers page.
--     receiving_entries,     tindahan-pos has /inventory/receiving.
--     receiving_lines
--     sales, sale_items,     POS module -- gating those means touching
--     customers, ...         checkout_sale(), which is the money path and
--                            gets its own migration, not this one.
--
-- Whether suppliers and receiving should ultimately be Inventory-gated is a
-- product/pricing decision, not a technical one -- flagged rather than
-- silently chosen here.
--
-- Affected schemas : public (write policies on 9 tables, 1 function)
-- Rollback         : re-create the listed policies without the module clause;
--                    drop public.current_store_has_module
-- Risk             : low today (no-op while every tenant holds INVENTORY),
--                    and bounded by design -- reads are never affected
-- =============================================================================

-- -----------------------------------------------------------------------------
-- The check, in one place.
--
-- Step 3 preserved ids when backfilling public.stores into
-- core.organizations, so a store id IS its organization id and no join is
-- needed. That identity is an assumption worth naming: if it ever stops
-- being true, this function is the single place to fix.
--
-- Takes no row value on purpose. Every policy below already constrains
-- store_id = auth_store_id(), so resolving the module from the session
-- instead of the row keeps the call free of column references -- which lets
-- Postgres hoist it into an InitPlan evaluated once per statement rather
-- than once per row (Architecture v1 §19).
-- -----------------------------------------------------------------------------

create or replace function public.current_store_has_module(p_module text)
returns boolean
language sql
stable
security definer
set search_path = public, core, pg_temp
as $$
  select core.module_enabled(auth_store_id(), p_module);
$$;

comment on function public.current_store_has_module is
  'Is the calling staff member''s store entitled to this module? Relies on '
  'store.id = organization.id, preserved by the Step 3 backfill.';

revoke all on function public.current_store_has_module(text) from public;
grant execute on function public.current_store_has_module(text) to authenticated;

-- -----------------------------------------------------------------------------
-- warehouses
-- -----------------------------------------------------------------------------

drop policy "admin can insert warehouses" on warehouses;
create policy "admin can insert warehouses"
  on warehouses for insert
  with check (
    store_id = auth_store_id()
    and (auth_role() = 'admin' or has_permission('inventory.warehouse.manage'))
    and (select public.current_store_has_module('INVENTORY'))
  );

drop policy "admin can update warehouses" on warehouses;
create policy "admin can update warehouses"
  on warehouses for update
  using (
    store_id = auth_store_id()
    and (auth_role() = 'admin' or has_permission('inventory.warehouse.manage'))
    and (select public.current_store_has_module('INVENTORY'))
  );

drop policy "admin can delete warehouses" on warehouses;
create policy "admin can delete warehouses"
  on warehouses for delete
  using (
    store_id = auth_store_id()
    and (auth_role() = 'admin' or has_permission('inventory.warehouse.manage'))
    and not is_default
    and (select public.current_store_has_module('INVENTORY'))
  );

-- -----------------------------------------------------------------------------
-- warehouse_stock
-- -----------------------------------------------------------------------------

drop policy "admin can upsert warehouse stock" on warehouse_stock;
create policy "admin can upsert warehouse stock"
  on warehouse_stock for insert
  with check (
    exists (
      select 1 from warehouses
      where warehouses.id = warehouse_stock.warehouse_id
        and warehouses.store_id = auth_store_id()
        and auth_role() = 'admin'
    )
    and (select public.current_store_has_module('INVENTORY'))
  );

drop policy "admin can update warehouse stock" on warehouse_stock;
create policy "admin can update warehouse stock"
  on warehouse_stock for update
  using (
    exists (
      select 1 from warehouses
      where warehouses.id = warehouse_stock.warehouse_id
        and warehouses.store_id = auth_store_id()
        and auth_role() = 'admin'
    )
    and (select public.current_store_has_module('INVENTORY'))
  );

-- -----------------------------------------------------------------------------
-- purchase_orders / purchase_order_lines
-- -----------------------------------------------------------------------------

drop policy "admin can insert purchase orders" on purchase_orders;
create policy "admin can insert purchase orders"
  on purchase_orders for insert
  with check (
    store_id = auth_store_id()
    and (auth_role() = 'admin' or has_permission('inventory.purchase_order.manage'))
    and created_by = auth.uid()
    and (select public.current_store_has_module('INVENTORY'))
  );

drop policy "admin can update purchase orders" on purchase_orders;
create policy "admin can update purchase orders"
  on purchase_orders for update
  using (
    store_id = auth_store_id()
    and (auth_role() = 'admin' or has_permission('inventory.purchase_order.manage'))
    and (select public.current_store_has_module('INVENTORY'))
  );

drop policy "admin can delete purchase orders" on purchase_orders;
create policy "admin can delete purchase orders"
  on purchase_orders for delete
  using (
    store_id = auth_store_id()
    and (auth_role() = 'admin' or has_permission('inventory.purchase_order.manage'))
    and status = 'draft'
    and (select public.current_store_has_module('INVENTORY'))
  );

drop policy "admin can insert purchase order lines" on purchase_order_lines;
create policy "admin can insert purchase order lines"
  on purchase_order_lines for insert
  with check (
    exists (
      select 1 from purchase_orders
      where purchase_orders.id = purchase_order_lines.purchase_order_id
        and purchase_orders.store_id = auth_store_id()
        and (auth_role() = 'admin' or has_permission('inventory.purchase_order.manage'))
    )
    and (select public.current_store_has_module('INVENTORY'))
  );

drop policy "admin can update purchase order lines" on purchase_order_lines;
create policy "admin can update purchase order lines"
  on purchase_order_lines for update
  using (
    exists (
      select 1 from purchase_orders
      where purchase_orders.id = purchase_order_lines.purchase_order_id
        and purchase_orders.store_id = auth_store_id()
        and (auth_role() = 'admin' or has_permission('inventory.purchase_order.manage'))
    )
    and (select public.current_store_has_module('INVENTORY'))
  );

drop policy "admin can delete purchase order lines" on purchase_order_lines;
create policy "admin can delete purchase order lines"
  on purchase_order_lines for delete
  using (
    exists (
      select 1 from purchase_orders
      where purchase_orders.id = purchase_order_lines.purchase_order_id
        and purchase_orders.store_id = auth_store_id()
        and (auth_role() = 'admin' or has_permission('inventory.purchase_order.manage'))
    )
    and (select public.current_store_has_module('INVENTORY'))
  );

-- -----------------------------------------------------------------------------
-- product_unit_conversions
-- -----------------------------------------------------------------------------

drop policy "admin can insert unit conversions" on product_unit_conversions;
create policy "admin can insert unit conversions"
  on product_unit_conversions for insert
  with check (
    store_id = auth_store_id()
    and (auth_role() = 'admin' or has_permission('inventory.product.manage'))
    and (select public.current_store_has_module('INVENTORY'))
  );

drop policy "admin can update unit conversions" on product_unit_conversions;
create policy "admin can update unit conversions"
  on product_unit_conversions for update
  using (
    store_id = auth_store_id()
    and (auth_role() = 'admin' or has_permission('inventory.product.manage'))
    and (select public.current_store_has_module('INVENTORY'))
  );

drop policy "admin can delete unit conversions" on product_unit_conversions;
create policy "admin can delete unit conversions"
  on product_unit_conversions for delete
  using (
    store_id = auth_store_id()
    and (auth_role() = 'admin' or has_permission('inventory.product.manage'))
    and (select public.current_store_has_module('INVENTORY'))
  );

-- -----------------------------------------------------------------------------
-- inventory_beginning_balances
-- -----------------------------------------------------------------------------

drop policy "admin can insert beginning balances" on inventory_beginning_balances;
create policy "admin can insert beginning balances"
  on inventory_beginning_balances for insert
  with check (
    store_id = auth_store_id()
    and (auth_role() = 'admin' or has_permission('inventory.stock.adjust'))
    and created_by = auth.uid()
    and (select public.current_store_has_module('INVENTORY'))
  );

drop policy "admin can update beginning balances" on inventory_beginning_balances;
create policy "admin can update beginning balances"
  on inventory_beginning_balances for update
  using (
    store_id = auth_store_id()
    and (auth_role() = 'admin' or has_permission('inventory.stock.adjust'))
    and (select public.current_store_has_module('INVENTORY'))
  );

drop policy "admin can delete beginning balances" on inventory_beginning_balances;
create policy "admin can delete beginning balances"
  on inventory_beginning_balances for delete
  using (
    store_id = auth_store_id()
    and (auth_role() = 'admin' or has_permission('inventory.stock.adjust'))
    and (select public.current_store_has_module('INVENTORY'))
  );

-- -----------------------------------------------------------------------------
-- inventory_counts / inventory_count_lines
-- -----------------------------------------------------------------------------

drop policy "admin can insert inventory counts" on inventory_counts;
create policy "admin can insert inventory counts"
  on inventory_counts for insert
  with check (
    store_id = auth_store_id()
    and (auth_role() = 'admin' or has_permission('inventory.stock.count'))
    and created_by = auth.uid()
    and (select public.current_store_has_module('INVENTORY'))
  );

drop policy "admin can update inventory counts" on inventory_counts;
create policy "admin can update inventory counts"
  on inventory_counts for update
  using (
    store_id = auth_store_id()
    and (auth_role() = 'admin' or has_permission('inventory.stock.count'))
    and (select public.current_store_has_module('INVENTORY'))
  );

drop policy "admin can insert inventory count lines" on inventory_count_lines;
create policy "admin can insert inventory count lines"
  on inventory_count_lines for insert
  with check (
    exists (
      select 1 from inventory_counts
      where inventory_counts.id = inventory_count_lines.inventory_count_id
        and inventory_counts.store_id = auth_store_id()
        and (auth_role() = 'admin' or has_permission('inventory.stock.count'))
    )
    and (select public.current_store_has_module('INVENTORY'))
  );

drop policy "admin can update inventory count lines" on inventory_count_lines;
create policy "admin can update inventory count lines"
  on inventory_count_lines for update
  using (
    exists (
      select 1 from inventory_counts
      where inventory_counts.id = inventory_count_lines.inventory_count_id
        and inventory_counts.store_id = auth_store_id()
        and (auth_role() = 'admin' or has_permission('inventory.stock.count'))
    )
    and (select public.current_store_has_module('INVENTORY'))
  );

-- -----------------------------------------------------------------------------
-- transfer_stock: warehouse_transfers has no client INSERT policy -- every
-- transfer is written inside this SECURITY DEFINER function, which bypasses
-- RLS. The gate therefore has to live in the function itself, and it can
-- raise the real error code from Architecture v1 §22 rather than the opaque
-- "violates row-level security policy" a policy denial produces.
-- -----------------------------------------------------------------------------

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

  if not has_permission('inventory.transfer.manage') then
    raise exception 'UNAUTHORIZED_ACTION';
  end if;

  if not core.module_enabled(v_store_id, 'INVENTORY') then
    raise exception 'MODULE_NOT_ENABLED';
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
