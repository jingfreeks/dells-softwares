-- =============================================================================
-- request_plan_upgrade() -- what a signed-in tenant does after choosing a
-- paid plan on the new landing page
-- -----------------------------------------------------------------------------
-- No checkout flow exists in this app -- BUSINESS/PRO are sold by a human,
-- same pattern the UpgradeModal and ENTERPRISE pricing already established.
-- This does not activate anything: it appends a note to the store's
-- organization_subscriptions row, the same free-text operator-facing field
-- core.grant_default_subscription() already writes to ("Default plan
-- granted on organization creation."). A platform admin reviewing the
-- organization in the console reads it and follows up manually via the
-- existing platform_set_plan() RPC -- no new table, no new workflow state
-- machine, until this needs to be more than "an operator reads a note."
--
-- FREE/BASIC are rejected: those are what registration already provisions
-- by default, not something to "request." ENTERPRISE is rejected too --
-- it's contact-only everywhere else in this app (never a self-serve target),
-- and there's no reason to treat this one entry point differently.
create or replace function public.request_plan_upgrade(p_plan_code text)
returns void
language plpgsql
security definer
set search_path = public, core, pg_temp
as $$
declare
  v_store_id uuid := auth_store_id();
begin
  if v_store_id is null then
    raise exception 'Not a registered staff member of any store';
  end if;
  if p_plan_code not in ('BUSINESS', 'PRO') then
    raise exception 'INVALID_PLAN_REQUEST';
  end if;

  update core.organization_subscriptions
    set notes = coalesce(notes || E'\n', '')
      || format('Requested upgrade to %s on %s', p_plan_code, now()::date)
    where organization_id = v_store_id;
end;
$$;

comment on function public.request_plan_upgrade is
  'A signed-in tenant asking for BUSINESS or PRO -- records the request as '
  'a note on the store''s subscription row for a platform admin to follow '
  'up on. Never activates a plan itself; there is no self-serve checkout '
  'in this app.';

-- revoke ... from anon, service_role explicitly, not just "from public":
-- 20260815122000/123000 both found that a hosted project's default ACL
-- grants EXECUTE to anon and service_role directly at creation time,
-- alongside (not covered by) the PUBLIC pseudo-role grant. Closing it here
-- up front instead of waiting for the next audit to find it again.
revoke all on function public.request_plan_upgrade(text) from public, anon, service_role;
grant execute on function public.request_plan_upgrade(text) to authenticated;
