-- =============================================================================
-- Enforce feature entitlement, server-side
-- -----------------------------------------------------------------------------
-- 20260815109000 made capabilities sellable, 20260815110000 gave the console
-- and the apps a way to read them, and the POS now hides navigation for a
-- feature the tenant does not hold.
--
-- All of that is UX. Architecture v1 §08 is explicit that a client-side gate
-- is not the boundary -- "ModuleGate is UX, not security" -- and until this
-- migration there was NO server-side check at all. Hiding the Customers link
-- did not stop anything: the anon key ships in the bundle, and a credit sale
-- posted directly would have been accepted.
--
-- A UI gate with no server gate behind it is the one-mistake-deep pattern
-- this codebase has already been bitten by twice (20260815105000, and the
-- wide anon grants in 20260815108000). This closes it for the features whose
-- write path is unambiguous.
--
-- NO-OP TODAY, by construction: every plan grants every feature and every
-- tenant holds all of them, so nothing below can refuse anything until
-- somebody deliberately turns a feature off in the console. That is the same
-- property the module and limit enforcement shipped with, and it is what
-- makes this safe to apply before the tiering decision is made.
--
-- MECHANISM CHOSEN PER FEATURE, not uniformly:
--
--   policies      where the write is a table -- mechanical, and identical in
--                 shape to the module conjunct already on these policies
--   a trigger     for utang, because the alternative was copying 236 lines of
--                 checkout_sale to insert one guard, and a transcription
--                 error in the money path costs real money. The trigger also
--                 covers paths checkout_sale does not: offline replay, and
--                 anything written directly
--   the function  for void_sale, which is small and already carries a
--                 permission guard for the check to sit beside
--
-- DELIBERATELY NOT ENFORCED HERE:
--   suppliers and receiving -- these are ungated at MODULE level too, pending
--     the ownership decision recorded in PLATFORM.md. Gating them by feature
--     would settle that pricing question inside a migration, which is exactly
--     where it should not be settled.
--   inventory.transfers -- transfer_stock() is 95 lines and already carries a
--     module gate; adding the feature check means re-stating it in full, and
--     it deserves its own change rather than riding along with five others.
--   pos.eload, pos.shifts, pos.discounts, pos.pack_pricing,
--     pos.held_sales, pos.multi_register, pos.bir_receipts -- no single
--     unambiguous write path yet. Enforcing them needs a decision about what
--     "off" means for each, which is product work, not plumbing.
--
-- Affected schemas : public (5 policies re-created, 1 trigger, 1 function)
-- Rollback         : drop the trigger, re-create the policies without the
--                    feature clause, restore void_sale from 0045
-- Risk             : low today -- no tenant can fail any of these checks --
--                    and bounded by design: every refusal is a write, never
--                    a read, so §08's "data is never destroyed on downgrade"
--                    continues to hold
-- =============================================================================

-- -----------------------------------------------------------------------------
-- pos.utang -- a trigger, not a rewrite of checkout_sale.
-- -----------------------------------------------------------------------------

create or replace function public.enforce_utang_feature()
returns trigger
language plpgsql
security definer
set search_path = public, core, pg_temp
as $$
begin
  if new.payment_type = 'credit'
     and not core.feature_enabled(new.store_id, 'pos.utang') then
    raise exception 'FEATURE_NOT_ENABLED: pos.utang' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

comment on function public.enforce_utang_feature is
  'Refuses a credit sale from a store that does not hold pos.utang. A trigger '
  'rather than a guard inside checkout_sale: it covers every path that writes '
  'a sale -- including offline replay -- and does not require restating 236 '
  'lines of money-path logic to add one condition.';

create trigger trg_sales_utang_feature
  before insert on public.sales
  for each row execute function public.enforce_utang_feature();

-- Recording a payment against an utang balance is the other half of the same
-- capability: a store that cannot sell on credit cannot collect on it either.
create or replace function public.enforce_utang_feature_on_payment()
returns trigger
language plpgsql
security definer
set search_path = public, core, pg_temp
as $$
begin
  if not core.feature_enabled(new.store_id, 'pos.utang') then
    raise exception 'FEATURE_NOT_ENABLED: pos.utang' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger trg_credit_payments_utang_feature
  before insert on public.credit_payments
  for each row execute function public.enforce_utang_feature_on_payment();

-- -----------------------------------------------------------------------------
-- pos.void -- the function, which already had somewhere for the check to go.
-- -----------------------------------------------------------------------------

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

  -- The store must also have bought the capability. Permission answers "may
  -- THIS PERSON", entitlement answers "did this TENANT pay for it" -- both
  -- have to hold, and conflating them is how a feature ends up enforced for
  -- cashiers but not owners.
  if not public.current_store_has_feature('pos.void') then
    raise exception 'FEATURE_NOT_ENABLED: pos.void' using errcode = 'P0001';
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
-- Each keeps `to authenticated` and every existing conjunct; only the
-- feature clause is added. Generated by transforming the definitions in
-- 20260815100000 rather than retyping them, then diffed against pg_policies.

drop policy "admin can insert purchase orders" on purchase_orders;
create policy "admin can insert purchase orders"
  on purchase_orders for insert
  with check (
    store_id = auth_store_id()
    and (auth_role() = 'admin' or has_permission('inventory.purchase_order.manage'))
    and created_by = auth.uid()
    and (select public.current_store_has_module('INVENTORY'))
    and (select public.current_store_writes_allowed())
    and (select public.current_store_has_feature('inventory.purchase_orders'))
  );
drop policy "admin can update purchase orders" on purchase_orders;
create policy "admin can update purchase orders"
  on purchase_orders for update
  using (
    store_id = auth_store_id()
    and (auth_role() = 'admin' or has_permission('inventory.purchase_order.manage'))
    and (select public.current_store_has_module('INVENTORY'))
    and (select public.current_store_writes_allowed())
    and (select public.current_store_has_feature('inventory.purchase_orders'))
  );
drop policy "admin can delete purchase orders" on purchase_orders;
create policy "admin can delete purchase orders"
  on purchase_orders for delete
  using (
    store_id = auth_store_id()
    and (auth_role() = 'admin' or has_permission('inventory.purchase_order.manage'))
    and status = 'draft'
    and (select public.current_store_has_module('INVENTORY'))
    and (select public.current_store_writes_allowed())
    and (select public.current_store_has_feature('inventory.purchase_orders'))
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
    and (select public.current_store_writes_allowed())
    and (select public.current_store_has_feature('inventory.purchase_orders'))
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
    and (select public.current_store_writes_allowed())
    and (select public.current_store_has_feature('inventory.purchase_orders'))
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
    and (select public.current_store_writes_allowed())
    and (select public.current_store_has_feature('inventory.purchase_orders'))
  );
drop policy "admin can insert unit conversions" on product_unit_conversions;
create policy "admin can insert unit conversions"
  on product_unit_conversions for insert
  with check (
    store_id = auth_store_id()
    and (auth_role() = 'admin' or has_permission('inventory.product.manage'))
    and (select public.current_store_has_module('INVENTORY'))
    and (select public.current_store_writes_allowed())
    and (select public.current_store_has_feature('inventory.conversions'))
  );
drop policy "admin can update unit conversions" on product_unit_conversions;
create policy "admin can update unit conversions"
  on product_unit_conversions for update
  using (
    store_id = auth_store_id()
    and (auth_role() = 'admin' or has_permission('inventory.product.manage'))
    and (select public.current_store_has_module('INVENTORY'))
    and (select public.current_store_writes_allowed())
    and (select public.current_store_has_feature('inventory.conversions'))
  );
drop policy "admin can delete unit conversions" on product_unit_conversions;
create policy "admin can delete unit conversions"
  on product_unit_conversions for delete
  using (
    store_id = auth_store_id()
    and (auth_role() = 'admin' or has_permission('inventory.product.manage'))
    and (select public.current_store_has_module('INVENTORY'))
    and (select public.current_store_writes_allowed())
    and (select public.current_store_has_feature('inventory.conversions'))
  );
drop policy "admin can insert inventory counts" on inventory_counts;
create policy "admin can insert inventory counts"
  on inventory_counts for insert
  with check (
    store_id = auth_store_id()
    and (auth_role() = 'admin' or has_permission('inventory.stock.count'))
    and created_by = auth.uid()
    and (select public.current_store_has_module('INVENTORY'))
    and (select public.current_store_writes_allowed())
    and (select public.current_store_has_feature('inventory.stock_count'))
  );
drop policy "admin can update inventory counts" on inventory_counts;
create policy "admin can update inventory counts"
  on inventory_counts for update
  using (
    store_id = auth_store_id()
    and (auth_role() = 'admin' or has_permission('inventory.stock.count'))
    and (select public.current_store_has_module('INVENTORY'))
    and (select public.current_store_writes_allowed())
    and (select public.current_store_has_feature('inventory.stock_count'))
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
    and (select public.current_store_writes_allowed())
    and (select public.current_store_has_feature('inventory.stock_count'))
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
    and (select public.current_store_writes_allowed())
    and (select public.current_store_has_feature('inventory.stock_count'))
  );
