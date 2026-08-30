-- =============================================================================
-- adjust_product_stock: an atomic increment for restock(), fixing a lost-
-- update race in the receiving flow.
-- -----------------------------------------------------------------------------
-- restock() (src/lib/storeData/storeData.tsx) used to read a product's
-- stock from client-side React state, add the received quantity, and write
-- that absolute value back with a plain UPDATE. Two concurrent receipts on
-- the same product (two staff receiving stock around the same time, or the
-- same staff on two devices) could both read the same stale stock, and the
-- second UPDATE would silently overwrite the first's already-committed
-- delta -- an entire delivery lost with no error and nothing in
-- receiving_entries to flag the discrepancy. Every other stock-mutating
-- path (checkout_sale, void_sale, refund_sale_items, transfer_stock) is
-- already immune because it re-reads the row inside its own transaction
-- before writing; this gives restock() the same guarantee via a single
-- atomic `stock = stock + delta` UPDATE, which Postgres serializes
-- correctly against concurrent writers without needing an explicit lock.
-- =============================================================================

create or replace function adjust_product_stock(
  p_product_id uuid,
  p_delta integer
)
returns table (new_stock integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_store_id uuid;
  v_product_store_id uuid;
begin
  select store_id into v_store_id from staff where id = auth.uid();
  if v_store_id is null then
    raise exception 'Not a registered staff member of any store';
  end if;

  if not (auth_role() = 'admin' or has_permission('inventory.product.manage')) then
    raise exception 'UNAUTHORIZED_ACTION';
  end if;

  select store_id into v_product_store_id from products where id = p_product_id;
  if v_product_store_id is null or v_product_store_id <> v_store_id then
    raise exception 'Product not found in this store';
  end if;

  return query
    update products
      set stock = stock + p_delta, updated_at = now()
      where id = p_product_id
      returning products.stock as new_stock;
end;
$$;

revoke all on function adjust_product_stock(uuid, integer) from public;
grant execute on function adjust_product_stock(uuid, integer) to authenticated;
