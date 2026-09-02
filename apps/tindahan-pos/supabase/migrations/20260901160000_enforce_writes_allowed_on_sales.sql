-- =============================================================================
-- A suspended organization must not be able to sell
-- -----------------------------------------------------------------------------
-- Closes the gap reported as BILL-M-003. core.org_writes_allowed() returns
-- false for a SUSPENDED organization, and its own comment states the intent
-- as "suspended = read-only" -- but nothing enforced that on the selling
-- path. Reproduced on staging: with the org suspended, a products PATCH
-- returned 204 and checkout_sale() completed a sale that was issued a real
-- receipt number.
--
-- Cause: all 27 policies enforcing writes_allowed sit on inventory and
-- purchasing tables. `products` write policies did not check it, and
-- `checkout_sale()` is SECURITY DEFINER -- it bypasses RLS entirely and
-- checked features but never billing state.
--
-- Two changes, deliberately different in kind:
--
--   1. A BEFORE INSERT trigger on `sales`, rather than an edit to
--      checkout_sale(). That function is 273 lines; threading a guard
--      through it risks the checkout logic for no benefit. A trigger fires
--      on every write path to the table -- including SECURITY DEFINER
--      callers, and including any path added later -- so it is one
--      enforcement point that cannot be forgotten.
--
--   2. writes_allowed added to the three `products` write policies, matching
--      how warehouses/suppliers/purchase_orders already express it.
--
-- `sales` and `sale_items` need no new policies: they have SELECT-only
-- policies today, so direct writes are already denied by default and every
-- legitimate write goes through a SECURITY DEFINER function.
--
-- TRIALING, ACTIVE and PAST_DUE remain writable. org_writes_allowed()
-- already treats PAST_DUE as a grace period rather than a punishment, and
-- that is deliberate -- this migration does not change which statuses are
-- allowed, only whether the answer is enforced.
--
-- Affected modules : POS, catalogue
-- Rollback         : drop trigger trg_sales_org_writes_allowed on sales;
--                    drop function guard_org_writes_allowed();
--                    and restore the three products policies without the
--                    current_store_writes_allowed() conjunct.
-- Risk             : medium -- blocks a write path that previously succeeded.
--                    Intended: that write path is the defect.
-- =============================================================================

create or replace function guard_org_writes_allowed()
returns trigger
language plpgsql
security definer
set search_path = public, core, pg_temp
as $$
begin
  -- Uses the row's own store_id rather than auth_store_id(): a paired
  -- device and a staff member resolve their tenant differently, and the
  -- row being written is the unambiguous subject either way.
  if not core.org_writes_allowed(new.store_id) then
    raise exception 'ORG_WRITES_SUSPENDED'
      using errcode = 'P0001',
            hint = 'This store is suspended and cannot record new sales.';
  end if;
  return new;
end;
$$;

revoke all on function guard_org_writes_allowed() from public;

drop trigger if exists trg_sales_org_writes_allowed on sales;
create trigger trg_sales_org_writes_allowed
  before insert on sales
  for each row
  execute function guard_org_writes_allowed();

-- Catalogue writes: same condition the inventory tables already carry.
drop policy if exists "admin can insert products" on products;
create policy "admin can insert products" on products
  for insert to public
  with check (
    store_id = auth_store_id()
    and (auth_role() = 'admin'::staff_role or has_permission('inventory.product.manage'))
    and (select current_store_writes_allowed())
  );

drop policy if exists "admin can update products" on products;
create policy "admin can update products" on products
  for update to public
  using (
    store_id = auth_store_id()
    and (auth_role() = 'admin'::staff_role or has_permission('inventory.product.manage'))
    and (select current_store_writes_allowed())
  );

drop policy if exists "cashier can attempt product price update" on products;
create policy "cashier can attempt product price update" on products
  for update to public
  using (
    store_id = auth_store_id()
    and auth_role() = 'cashier'::staff_role
    and (select current_store_writes_allowed())
  );

drop policy if exists "admin can delete products" on products;
create policy "admin can delete products" on products
  for delete to public
  using (
    store_id = auth_store_id()
    and (auth_role() = 'admin'::staff_role or has_permission('inventory.product.manage'))
    and (select current_store_writes_allowed())
  );
