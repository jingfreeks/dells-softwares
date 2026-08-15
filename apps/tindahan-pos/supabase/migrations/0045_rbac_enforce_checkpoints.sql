-- 0045_rbac_enforce_checkpoints.sql
--
-- Wires has_permission() (0044) into the two checkpoints that currently
-- have zero enforcement beyond a page-level UI guard (transfer_stock has no
-- role check at all; void_sale is hardcoded admin-only), and extends the
-- existing "auth_role() = 'admin'" write policies for the 11 seeded
-- permissions so a SUPERVISOR (a staff row with role = 'cashier' plus a
-- staff_roles grant) can use them too. Every change here is additive: an
-- admin caller's behavior is byte-for-byte unchanged, this only OR's in a
-- second way to satisfy the same check.

-- ---------------------------------------------------------------------------
-- void_sale: was unconditionally admin-only, now permission-gated.
-- ---------------------------------------------------------------------------

create or replace function void_sale(p_sale_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_store_id uuid;
  v_sale sales%rowtype;
  v_reason text;
  v_item record;
begin
  v_store_id := auth_store_id();
  if v_store_id is null then raise exception 'Not a registered staff member of any store'; end if;

  if not has_permission('pos.sale.void') then
    raise exception 'UNAUTHORIZED_ACTION';
  end if;

  v_reason := nullif(trim(coalesce(p_reason, '')), '');
  if v_reason is null then
    raise exception 'VOID_REASON_REQUIRED';
  end if;

  select * into v_sale from sales where id = p_sale_id and store_id = v_store_id for update;
  if not found then
    raise exception 'Sale not found in this store';
  end if;
  if v_sale.status = 'voided' then
    raise exception 'ALREADY_VOIDED';
  end if;

  for v_item in
    select product_id, quantity from sale_items
      where sale_id = p_sale_id and item_type = 'product' and product_id is not null
  loop
    update products set stock = stock + v_item.quantity, updated_at = now()
      where id = v_item.product_id;
  end loop;

  if v_sale.payment_type = 'credit' and v_sale.customer_id is not null then
    perform 1 from customers where id = v_sale.customer_id and store_id = v_store_id for update;
    update customers set balance = balance - v_sale.total where id = v_sale.customer_id;
  end if;

  update sales
    set status = 'voided', voided_at = now(), voided_by = auth.uid(), void_reason = v_reason
    where id = p_sale_id;

  insert into audit_log (store_id, actor_id, action, entity_type, entity_id, previous_value, new_value, reason)
    values (
      v_store_id, auth.uid(), 'sale_voided', 'sale', p_sale_id,
      jsonb_build_object('status', 'completed'),
      jsonb_build_object('status', 'voided'),
      v_reason
    );
end;
$$;

-- ---------------------------------------------------------------------------
-- transfer_stock: had no role check at all. inventory.transfer.manage now
-- gates it (OWNER and SUPERVISOR both hold it by default, plain CASHIER
-- does not -- this is a genuine new restriction, previously any staff
-- member could call this RPC directly regardless of the page guard).
-- ---------------------------------------------------------------------------

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

-- ---------------------------------------------------------------------------
-- guard_cashier_product_update: a non-admin caller is currently restricted
-- to price-only columns unconditionally. inventory.product.manage now
-- grants full edit rights (same bypass admin already gets) -- a cashier
-- with only the store-wide cashier_can_edit_prices flag (0043, untouched)
-- keeps the price-only restriction.
-- ---------------------------------------------------------------------------

create or replace function guard_cashier_product_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_can_edit boolean;
begin
  if auth_role() = 'admin' or has_permission('inventory.product.manage') then
    return new;
  end if;

  select cashier_can_edit_prices into v_can_edit from stores where id = new.store_id;
  if not coalesce(v_can_edit, false) then
    raise exception 'PRICE_EDIT_NOT_ALLOWED';
  end if;

  if new.barcode is distinct from old.barcode
    or new.name is distinct from old.name
    or new.stock is distinct from old.stock
    or new.low_stock_threshold is distinct from old.low_stock_threshold
    or new.category is distinct from old.category
    or new.category_id is distinct from old.category_id
    or new.image_url is distinct from old.image_url
    or new.cost is distinct from old.cost
  then
    raise exception 'ONLY_PRICE_FIELDS_EDITABLE';
  end if;

  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- RLS: extend the admin-only write policies for each of the 11 permissions.
-- Same shape repeated per table: drop the admin-only policy, recreate it
-- with "auth_role() = 'admin' or has_permission('<code>')".
-- ---------------------------------------------------------------------------

-- products
drop policy "admin can insert products" on products;
create policy "admin can insert products"
  on products for insert
  with check (store_id = auth_store_id() and (auth_role() = 'admin' or has_permission('inventory.product.manage')));

drop policy "admin can update products" on products;
create policy "admin can update products"
  on products for update
  using (store_id = auth_store_id() and (auth_role() = 'admin' or has_permission('inventory.product.manage')));

drop policy "admin can delete products" on products;
create policy "admin can delete products"
  on products for delete
  using (store_id = auth_store_id() and (auth_role() = 'admin' or has_permission('inventory.product.manage')));

-- suppliers
drop policy "admin can insert suppliers" on suppliers;
create policy "admin can insert suppliers"
  on suppliers for insert
  with check (store_id = auth_store_id() and (auth_role() = 'admin' or has_permission('inventory.supplier.manage')));

drop policy "admin can update suppliers" on suppliers;
create policy "admin can update suppliers"
  on suppliers for update
  using (store_id = auth_store_id() and (auth_role() = 'admin' or has_permission('inventory.supplier.manage')));

drop policy "admin can delete suppliers" on suppliers;
create policy "admin can delete suppliers"
  on suppliers for delete
  using (store_id = auth_store_id() and (auth_role() = 'admin' or has_permission('inventory.supplier.manage')));

-- warehouses
drop policy "admin can insert warehouses" on warehouses;
create policy "admin can insert warehouses"
  on warehouses for insert
  with check (store_id = auth_store_id() and (auth_role() = 'admin' or has_permission('inventory.warehouse.manage')));

drop policy "admin can update warehouses" on warehouses;
create policy "admin can update warehouses"
  on warehouses for update
  using (store_id = auth_store_id() and (auth_role() = 'admin' or has_permission('inventory.warehouse.manage')));

drop policy "admin can delete warehouses" on warehouses;
create policy "admin can delete warehouses"
  on warehouses for delete
  using (store_id = auth_store_id() and (auth_role() = 'admin' or has_permission('inventory.warehouse.manage')) and not is_default);

-- purchase_orders
drop policy "admin can insert purchase orders" on purchase_orders;
create policy "admin can insert purchase orders"
  on purchase_orders for insert
  with check (store_id = auth_store_id() and (auth_role() = 'admin' or has_permission('inventory.purchase_order.manage')) and created_by = auth.uid());

drop policy "admin can update purchase orders" on purchase_orders;
create policy "admin can update purchase orders"
  on purchase_orders for update
  using (store_id = auth_store_id() and (auth_role() = 'admin' or has_permission('inventory.purchase_order.manage')));

drop policy "admin can delete purchase orders" on purchase_orders;
create policy "admin can delete purchase orders"
  on purchase_orders for delete
  using (store_id = auth_store_id() and (auth_role() = 'admin' or has_permission('inventory.purchase_order.manage')) and status = 'draft');

-- purchase_order_lines
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
  );

-- product_unit_conversions
drop policy "admin can insert unit conversions" on product_unit_conversions;
create policy "admin can insert unit conversions"
  on product_unit_conversions for insert
  with check (store_id = auth_store_id() and (auth_role() = 'admin' or has_permission('inventory.product.manage')));

drop policy "admin can update unit conversions" on product_unit_conversions;
create policy "admin can update unit conversions"
  on product_unit_conversions for update
  using (store_id = auth_store_id() and (auth_role() = 'admin' or has_permission('inventory.product.manage')));

drop policy "admin can delete unit conversions" on product_unit_conversions;
create policy "admin can delete unit conversions"
  on product_unit_conversions for delete
  using (store_id = auth_store_id() and (auth_role() = 'admin' or has_permission('inventory.product.manage')));

-- inventory_beginning_balances
drop policy "admin can insert beginning balances" on inventory_beginning_balances;
create policy "admin can insert beginning balances"
  on inventory_beginning_balances for insert
  with check (store_id = auth_store_id() and (auth_role() = 'admin' or has_permission('inventory.stock.adjust')) and created_by = auth.uid());

drop policy "admin can update beginning balances" on inventory_beginning_balances;
create policy "admin can update beginning balances"
  on inventory_beginning_balances for update
  using (store_id = auth_store_id() and (auth_role() = 'admin' or has_permission('inventory.stock.adjust')));

drop policy "admin can delete beginning balances" on inventory_beginning_balances;
create policy "admin can delete beginning balances"
  on inventory_beginning_balances for delete
  using (store_id = auth_store_id() and (auth_role() = 'admin' or has_permission('inventory.stock.adjust')));

-- inventory_counts / inventory_count_lines
drop policy "admin can insert inventory counts" on inventory_counts;
create policy "admin can insert inventory counts"
  on inventory_counts for insert
  with check (store_id = auth_store_id() and (auth_role() = 'admin' or has_permission('inventory.stock.count')) and created_by = auth.uid());

drop policy "admin can update inventory counts" on inventory_counts;
create policy "admin can update inventory counts"
  on inventory_counts for update
  using (store_id = auth_store_id() and (auth_role() = 'admin' or has_permission('inventory.stock.count')));

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
  );

-- receiving_entries / receiving_lines
drop policy "admin can insert receiving entries" on receiving_entries;
create policy "admin can insert receiving entries"
  on receiving_entries for insert
  with check (store_id = auth_store_id() and (auth_role() = 'admin' or has_permission('inventory.stock.receive')) and created_by = auth.uid());

drop policy "admin can update store receiving entries" on receiving_entries;
create policy "admin can update store receiving entries"
  on receiving_entries for update
  using (store_id = auth_store_id() and (auth_role() = 'admin' or has_permission('inventory.stock.receive')))
  with check (store_id = auth_store_id() and (auth_role() = 'admin' or has_permission('inventory.stock.receive')));

drop policy "admin can insert receiving lines" on receiving_lines;
create policy "admin can insert receiving lines"
  on receiving_lines for insert
  with check (
    exists (
      select 1 from receiving_entries
      where receiving_entries.id = receiving_lines.receiving_entry_id
        and receiving_entries.store_id = auth_store_id()
        and (auth_role() = 'admin' or has_permission('inventory.stock.receive'))
    )
  );

-- sales / sale_items / audit_log: report visibility
drop policy "admin can view store sales" on sales;
create policy "admin can view store sales"
  on sales for select
  using (store_id = auth_store_id() and (auth_role() = 'admin' or has_permission('pos.report.view')));

drop policy "admin can view store sale items" on sale_items;
create policy "admin can view store sale items"
  on sale_items for select
  using (
    exists (
      select 1 from sales
      where sales.id = sale_items.sale_id
        and sales.store_id = auth_store_id()
        and (auth_role() = 'admin' or has_permission('pos.report.view'))
    )
  );

drop policy "admin can view own store audit log" on audit_log;
create policy "admin can view own store audit log"
  on audit_log for select
  using (store_id = auth_store_id() and (auth_role() = 'admin' or has_permission('pos.report.view')));
