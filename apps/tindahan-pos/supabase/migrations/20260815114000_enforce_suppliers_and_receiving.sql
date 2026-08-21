-- =============================================================================
-- Close the last two unguarded inventory capabilities
-- -----------------------------------------------------------------------------
-- 20260815111000 put module, grace-ladder and feature checks on purchase
-- orders, unit conversions and stock counts. 112000 did the same for
-- transfers. Suppliers and receiving were left out, and it did not matter at
-- the time: every plan sold every feature, so there was nothing to withhold.
--
-- 20260815113000 changed that. FREE now omits both capabilities -- and omits
-- the INVENTORY module entirely -- while the policies guarding them check
-- NONE of the three things every comparable table checks:
--
--   suppliers           insert/update/delete : store + role only
--   receiving_entries   insert/update        : store + role only
--   receiving_lines     insert               : store + role only
--
-- So a tenant who holds neither the module nor the feature could still add a
-- supplier, and a SUSPENDED tenant could still receive stock -- the grace
-- ladder was never applied to these tables either. Selling a capability the
-- server does not withhold is the exact hole the feature layer was built to
-- close, and this is the last of it in the POS.
--
-- WRITES ONLY, as everywhere else. Architecture v1 §08: reads and exports
-- survive every state, and data is never destroyed on downgrade. A store that
-- loses receiving keeps every delivery it ever recorded, and can still open
-- the page and read them. The SELECT policies below are deliberately
-- untouched.
--
-- Affected schemas : public (6 write policies rewritten)
-- Rollback         : recreate the six policies without the three conjuncts
-- Risk             : low for anyone on BASIC or above, who holds both
--                    features and the module and is therefore unaffected.
--                    A FREE tenant loses write access to two capabilities
--                    their plan does not sell -- which is the point.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- suppliers
-- -----------------------------------------------------------------------------
drop policy "admin can insert suppliers" on suppliers;
create policy "admin can insert suppliers"
  on suppliers for insert
  with check (
    store_id = auth_store_id()
    and (auth_role() = 'admin' or has_permission('inventory.supplier.manage'))
    and (select public.current_store_has_module('INVENTORY'))
    and (select public.current_store_writes_allowed())
    and (select public.current_store_has_feature('inventory.suppliers'))
  );

drop policy "admin can update suppliers" on suppliers;
create policy "admin can update suppliers"
  on suppliers for update
  using (
    store_id = auth_store_id()
    and (auth_role() = 'admin' or has_permission('inventory.supplier.manage'))
    and (select public.current_store_has_module('INVENTORY'))
    and (select public.current_store_writes_allowed())
    and (select public.current_store_has_feature('inventory.suppliers'))
  );

drop policy "admin can delete suppliers" on suppliers;
create policy "admin can delete suppliers"
  on suppliers for delete
  using (
    store_id = auth_store_id()
    and (auth_role() = 'admin' or has_permission('inventory.supplier.manage'))
    and (select public.current_store_has_module('INVENTORY'))
    and (select public.current_store_writes_allowed())
    and (select public.current_store_has_feature('inventory.suppliers'))
  );

-- -----------------------------------------------------------------------------
-- receiving_entries
-- -----------------------------------------------------------------------------
drop policy "admin can insert receiving entries" on receiving_entries;
create policy "admin can insert receiving entries"
  on receiving_entries for insert
  with check (
    store_id = auth_store_id()
    and (auth_role() = 'admin' or has_permission('inventory.stock.receive'))
    and created_by = auth.uid()
    and (select public.current_store_has_module('INVENTORY'))
    and (select public.current_store_writes_allowed())
    and (select public.current_store_has_feature('inventory.receiving'))
  );

drop policy "admin can update store receiving entries" on receiving_entries;
create policy "admin can update store receiving entries"
  on receiving_entries for update
  using (
    store_id = auth_store_id()
    and (auth_role() = 'admin' or has_permission('inventory.stock.receive'))
    and (select public.current_store_has_module('INVENTORY'))
    and (select public.current_store_writes_allowed())
    and (select public.current_store_has_feature('inventory.receiving'))
  )
  with check (
    store_id = auth_store_id()
    and (auth_role() = 'admin' or has_permission('inventory.stock.receive'))
    and (select public.current_store_has_module('INVENTORY'))
    and (select public.current_store_writes_allowed())
    and (select public.current_store_has_feature('inventory.receiving'))
  );

-- -----------------------------------------------------------------------------
-- receiving_lines
--
-- Guarded through its parent, matching how the line-item tables elsewhere do
-- it. Checking the feature on the child as well as the parent is deliberate
-- belt-and-braces: an entry created while the feature was held must not stay
-- writable line by line after it is withdrawn.
-- -----------------------------------------------------------------------------
drop policy "admin can insert receiving lines" on receiving_lines;
create policy "admin can insert receiving lines"
  on receiving_lines for insert
  with check (
    exists (
      select 1 from receiving_entries e
      where e.id = receiving_lines.receiving_entry_id
        and e.store_id = auth_store_id()
        and (auth_role() = 'admin' or has_permission('inventory.stock.receive'))
    )
    and (select public.current_store_has_module('INVENTORY'))
    and (select public.current_store_writes_allowed())
    and (select public.current_store_has_feature('inventory.receiving'))
  );
