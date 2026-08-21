-- =============================================================================
-- A sale rung up while entitled must still land when the connection returns
-- -----------------------------------------------------------------------------
-- The register works offline. A cashier takes a credit sale at two in the
-- afternoon with no signal, the goods leave the shelf, the customer walks out
-- owing money, and the sale sits in the device queue until the connection
-- comes back. That is by design.
--
-- If pos.utang is withdrawn in between -- a downgrade, a lapsed subscription,
-- an operator revoking it -- enforce_utang_feature() refuses the replay, and
-- refusing it does not undo anything. The goods are gone. The customer owes
-- the money. The only thing the refusal accomplishes is that the shop's books
-- never learn about it: the sale is marked `failed` in the queue and the debt
-- is never recorded against the customer.
--
-- THE CODEBASE ALREADY DECIDED THIS QUESTION, in migration 0030, for exactly
-- this situation. checkout_sale() lets an offline replay drive stock NEGATIVE
-- rather than refusing it:
--
--     if v_product.stock < v_qty and not p_is_offline_replay then
--
-- and records a stock_discrepancy instead. The reasoning is the same one: the
-- goods already left the shelf, so the honest thing is to write down what
-- happened and flag it, not to pretend it did not. This migration makes the
-- entitlement layer agree with the layer underneath it.
--
-- It is also the same rule as 20260815116000 and 20260815117000 -- entitlement
-- decides what a tenant may START, not whether they may finish what is already
-- underway. An offline sale is the most literal case of already underway.
--
-- THE BYPASS THIS COULD HAVE OPENED, and what stops it. is_offline_replay is
-- supplied by the caller, so "allow any replay" would hand every store utang
-- for free: claim the flag on every credit sale and the check never fires.
-- So the exemption is narrower than the flag. The sale must ALSO have occurred
-- before the capability was withdrawn:
--
--     new.occurred_at < the moment the pos.utang grant last changed
--
-- A freshly rung-up sale claiming to be a replay carries occurred_at of about
-- now, which is after the revocation, and is refused exactly as before. Only
-- sales that genuinely predate the withdrawal are let through.
--
-- What remains is a tenant deliberately backdating occurred_at, and that is
-- bounded rather than open: checkout_sale() already refuses anything older
-- than the maximum offline age or more than five minutes in the future, and
-- every such row is stamped is_offline_replay = true, which is exactly what an
-- audit would look for. A store that has never held pos.utang at all has no
-- grant row, the comparison is null, and nothing is exempt.
--
-- Affected schemas : public (one trigger function)
-- Rollback         : restore enforce_utang_feature() from 20260815111000
-- Risk             : low, and narrow -- it permits only a credit sale that
--                    both claims to be a replay AND predates the withdrawal
-- =============================================================================

create or replace function public.enforce_utang_feature()
returns trigger
language plpgsql
security definer
set search_path = public, core, pg_temp
as $$
declare
  v_withdrawn_at timestamptz;
begin
  if new.payment_type <> 'credit' then
    return new;
  end if;

  if core.feature_enabled(new.store_id, 'pos.utang') then
    return new;
  end if;

  -- Not entitled now. The one exception is a sale that was already made while
  -- they were -- store.id and organization.id are the same value by
  -- construction (see the Step 3 backfill).
  select f.updated_at into v_withdrawn_at
  from core.organization_features f
  where f.organization_id = new.store_id
    and f.feature_code = 'pos.utang';

  if coalesce(new.is_offline_replay, false)
     and new.occurred_at is not null
     and v_withdrawn_at is not null
     and new.occurred_at < v_withdrawn_at then
    return new;
  end if;

  raise exception 'FEATURE_NOT_ENABLED: pos.utang' using errcode = 'P0001';
end;
$$;

comment on function public.enforce_utang_feature is
  'Refuses a credit sale from a store that does not hold pos.utang, EXCEPT an '
  'offline replay of a sale that occurred before the capability was withdrawn. '
  'Refusing that one would not undo the sale -- the goods are gone and the '
  'customer owes the money -- it would only keep the shop''s books from '
  'recording it. Mirrors checkout_sale()''s treatment of stock on replay '
  '(migration 0030).';
