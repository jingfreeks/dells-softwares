-- =============================================================================
-- Enforce inventory.transfers
-- -----------------------------------------------------------------------------
-- 20260815111000 enforced five features and deferred this one, on the grounds
-- that transfer_stock() is 95 lines and "deserves its own change rather than
-- riding along with five others". This is that change -- and having looked
-- properly, the 95 lines do not need restating at all.
--
-- A transfer records itself in warehouse_transfers, which carries store_id and
-- has only a SELECT policy: like `sales`, it can be written solely by the
-- SECURITY DEFINER function. So the same trigger that guards utang works here,
-- for the same reasons:
--
--   * no restatement of a long function, and therefore no chance of a
--     transcription error in stock arithmetic
--   * it covers every path that records a transfer, not just the one
--     transfer_stock() takes today
--
-- transfer_stock() already refuses when the INVENTORY module is off. This adds
-- the narrower question underneath it: the tenant may hold Inventory and still
-- not have bought transfers.
--
-- NO-OP TODAY: every plan grants every feature.
--
-- Affected schemas : public (1 function, 1 trigger)
-- Rollback         : drop the trigger and the function
-- Risk             : low, and writes only -- existing transfers stay readable
-- =============================================================================

create or replace function public.enforce_transfers_feature()
returns trigger
language plpgsql
security definer
set search_path = public, core, pg_temp
as $$
begin
  if not core.feature_enabled(new.store_id, 'inventory.transfers') then
    raise exception 'FEATURE_NOT_ENABLED: inventory.transfers' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

comment on function public.enforce_transfers_feature is
  'Refuses a stock transfer from a store that does not hold '
  'inventory.transfers. A trigger rather than a guard inside transfer_stock(): '
  'warehouse_transfers has no INSERT policy, so the function is the only way '
  'in, and this avoids restating 95 lines of stock arithmetic to add one '
  'condition.';

create trigger trg_warehouse_transfers_feature
  before insert on public.warehouse_transfers
  for each row execute function public.enforce_transfers_feature();
