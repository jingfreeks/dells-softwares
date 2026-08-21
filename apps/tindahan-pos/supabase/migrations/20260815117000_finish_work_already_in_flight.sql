-- =============================================================================
-- You may be stopped from starting, never from finishing
-- -----------------------------------------------------------------------------
-- 20260815116000 settled this for utang: a shop that loses the capability keeps
-- its debts and must still be able to record them being paid off, because
-- withdrawing writes is meant to stop NEW commitments, not to lock a door from
-- the inside. The same trap exists in two more places, and it is quieter.
--
-- Purchase orders and stock counts are state machines with in-flight states:
--
--   purchase_orders   draft -> submitted -> partially_received -> received
--                                                             -> cancelled
--   inventory_counts  open -> closed
--
-- 20260815111000 put the feature check on their UPDATE policies as well as
-- their INSERTs. So a store with a SUBMITTED purchase order and an OPEN stock
-- count loses the capability, and neither can ever reach a terminal state. The
-- order stays "submitted" forever. The count stays "open" forever. Neither can
-- even be CANCELLED, which is the one action that exists precisely for
-- abandoning work.
--
-- AND IT FAILS SILENTLY, which is what makes it worse than the utang case. An
-- UPDATE whose policy USING clause does not match is not an error: it matches
-- zero rows and reports success. Measured on a real store -- the submitted
-- order was still visible (§08 holding, correctly), `update purchase_orders set
-- status = 'cancelled'` affected 0 rows, and nothing was raised. The client
-- agrees: closeInventoryCount() throws only on `error`, so it returns happily
-- having changed nothing, and the screen says the count was closed.
--
-- THE RULE, stated once so the next capability inherits it: entitlement decides
-- what a tenant may START. It does not decide whether they may finish what is
-- already underway. Creation stays gated; completion does not.
--
-- So the feature and module checks come off UPDATE and DELETE for these four
-- tables, and stay on INSERT. No new orders, no new counts, no new lines --
-- and everything already open can be driven to a close.
--
-- THE GRACE LADDER STAYS ON ALL OF THEM, deliberately, and the distinction is
-- the point. Losing a feature is a permanent change in what the tenant bought,
-- so they must be able to wind down. A suspension is a temporary billing
-- state: they settle up and carry on exactly where they were. Nothing is
-- trapped by waiting, and reads and exports work throughout either way.
--
-- A half-counted stock count can now be closed but not continued, since
-- inserting further lines is still creation. That is a real limitation and it
-- is still strictly better than a session that can never be closed at all --
-- closing applies no stock adjustment of its own, so it is bookkeeping, not
-- corruption.
--
-- Affected schemas : public (6 write policies rewritten)
-- Rollback         : restore the six from 20260815111000
-- Risk             : low, and one-directional -- this only ever permits a
--                    write that was silently dropped before, and only on rows
--                    the tenant already has
-- =============================================================================

-- -----------------------------------------------------------------------------
-- purchase_orders
-- -----------------------------------------------------------------------------
drop policy "admin can update purchase orders" on purchase_orders;
create policy "admin can update purchase orders"
  on purchase_orders for update
  using (
    store_id = auth_store_id()
    and (auth_role() = 'admin' or has_permission('inventory.purchase_order.manage'))
    and (select public.current_store_writes_allowed())
  );

drop policy "admin can delete purchase orders" on purchase_orders;
create policy "admin can delete purchase orders"
  on purchase_orders for delete
  using (
    store_id = auth_store_id()
    and (auth_role() = 'admin' or has_permission('inventory.purchase_order.manage'))
    and (select public.current_store_writes_allowed())
  );

-- -----------------------------------------------------------------------------
-- purchase_order_lines -- receiving against an order edits its lines, so the
-- lines have to move for the order to reach `received`.
-- -----------------------------------------------------------------------------
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
    and (select public.current_store_writes_allowed())
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
    and (select public.current_store_writes_allowed())
  );

-- -----------------------------------------------------------------------------
-- inventory_counts
-- -----------------------------------------------------------------------------
drop policy "admin can update inventory counts" on inventory_counts;
create policy "admin can update inventory counts"
  on inventory_counts for update
  using (
    store_id = auth_store_id()
    and (auth_role() = 'admin' or has_permission('inventory.stock.count'))
    and (select public.current_store_writes_allowed())
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
    and (select public.current_store_writes_allowed())
  );
