-- =============================================================================
-- Audit stock adjustments
-- -----------------------------------------------------------------------------
-- Closes issue #427. adjust_product_stock() changed a product's stock level
-- and wrote nothing to audit_log, so an adjustment left no record of who made
-- it, what the level was before, or why.
--
-- It was the last inventory-affecting operation without one: sale_voided,
-- price_changed, receipt_reprinted and store_settings_updated are all
-- recorded. 20260815090700_phase1_audit_logs.sql already anticipated this
-- case in its own comment -- "Required by the service layer for void /
-- refund / adjustment / role change" -- and the columns have been sitting
-- there unused for the adjustment half of it.
--
-- Stock level is the quantity behind cost of goods sold, so an untraceable
-- adjustment is a gap a BIR examiner would reasonably ask about.
--
-- Two things preserved deliberately:
--
--   1. The update stays `stock = stock + p_delta` in a single statement. The
--      original migration's comment explains why that matters -- reading a
--      level and writing an absolute value back loses concurrent receipts
--      silently. `for update` takes the row lock so the before-value read is
--      serialized against other adjustments without changing the arithmetic.
--
--   2. p_reason is optional and defaults to null, so the existing
--      two-argument callers keep working untouched. Nothing in the UI
--      collects a reason today; when it does, it has somewhere to put it.
--
-- Affected modules : inventory, audit
-- Rollback         : restore the previous two-argument definition from
--                    20260830151000_adjust_product_stock.sql and
--                    drop function adjust_product_stock(uuid, integer, text);
-- Risk             : low -- additive. The audit insert is inside the same
--                    transaction, so an adjustment that is recorded happened
--                    and one that happened is recorded.
-- =============================================================================

create or replace function adjust_product_stock(
  p_product_id uuid,
  p_delta integer,
  p_reason text default null
)
returns table(new_stock integer)
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_store_id uuid;
  v_product_store_id uuid;
  v_before integer;
  v_after integer;
begin
  select store_id into v_store_id from staff where id = auth.uid();
  if v_store_id is null then
    raise exception 'Not a registered staff member of any store';
  end if;

  if not (auth_role() = 'admin' or has_permission('inventory.product.manage')) then
    raise exception 'UNAUTHORIZED_ACTION';
  end if;

  -- Locks the row, so the level recorded as "before" is the one this
  -- adjustment actually applied to.
  select store_id, stock into v_product_store_id, v_before
    from products where id = p_product_id
    for update;

  if v_product_store_id is null or v_product_store_id <> v_store_id then
    raise exception 'Product not found in this store';
  end if;

  update products
    set stock = stock + p_delta, updated_at = now()
    where id = p_product_id
    returning stock into v_after;

  insert into audit_log (store_id, actor_id, action, entity_type, entity_id,
                         previous_value, new_value, reason)
    values (
      v_store_id, auth.uid(), 'stock_adjusted', 'product', p_product_id,
      jsonb_build_object('stock', v_before),
      jsonb_build_object('stock', v_after, 'delta', p_delta),
      p_reason
    );

  return query select v_after;
end;
$function$;

-- Same grant the two-argument form carried (20260830151000 line 56). Without
-- it the new signature is unreachable from the client.
grant execute on function adjust_product_stock(uuid, integer, text) to authenticated;

-- The two-argument form is gone: `p_reason text default null` covers those
-- callers. Dropping it explicitly rather than leaving an older overload
-- behind -- a two-argument call would still resolve to it exactly, and keep
-- writing no audit row.
drop function if exists adjust_product_stock(uuid, integer);
