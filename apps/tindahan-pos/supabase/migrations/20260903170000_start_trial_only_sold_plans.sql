-- start_trial() may only trial a plan we actually sell
--
-- 20260903110000 retired FREE and PRO. platform_set_plan(), platform_plans()
-- and plan_prices() all filter on is_active, so neither can be assigned or
-- listed. start_trial() does not, and that gap was recorded at the time as
-- deserving its own look rather than a condition bolted onto that migration.
-- This is it.
--
-- What it allowed. The function hardcoded:
--
--   if p_plan_code not in ('BUSINESS', 'PRO') then raise 'INVALID_TRIAL_PLAN'
--   select id into v_plan_id from core.subscription_plans where code = p_plan_code;
--
-- so a store admin could call start_trial('PRO') straight at the API and get
-- thirty days of a retired plan, free, with its modules and features
-- materialized. PRO carries pos.bir_receipts, pos.multi_register and
-- inventory.transfers, none of which BUSINESS has -- so the retired tier was
-- not merely still reachable, it was the most generous thing on offer.
--
-- The client stopped listing PRO in the same change, which closed it in
-- practice. This closes it at the boundary, which is where it belongs.
--
-- THE RULE, DERIVED RATHER THAN LISTED
--
-- A hardcoded list of trialable codes has to be updated in lockstep with every
-- catalogue change, and this is what happens when it is not. So the plan is
-- resolved by property instead:
--
--   is_active            we do not trial what we do not sell
--   price_php is not null  ENTERPRISE is "contact us"; there is no self-serve
--                          trial of a plan with no price
--   sort_order > current   a trial is an upgrade. Trialling your own tier, or a
--                          lower one, is not a trial
--
-- All three fall out of the catalogue, so retiring or adding a plan needs no
-- change here.
--
-- The already-used check deliberately stays BEFORE this, so a store that has
-- had its one trial is told exactly that whatever plan it names -- which is the
-- more useful answer, and what 330_trial.sql asserts.
--
-- Affected modules : billing
-- Rollback         : re-apply the previous definition from 20260815160000.
-- Risk             : low -- BUSINESS from BASIC, the only trial the client
--                    offers, satisfies all three conditions unchanged.

create or replace function start_trial(p_plan_code text)
returns void
language plpgsql
security definer
set search_path to 'public', 'core', 'pg_temp'
as $function$
declare
  v_store_id      uuid := auth_store_id();
  v_plan_id       uuid;
  v_current_order integer;
begin
  if v_store_id is null then
    raise exception 'Not a registered staff member of any store';
  end if;
  if auth_role() <> 'admin' then
    raise exception 'ADMIN_ONLY';
  end if;

  if exists (
    select 1 from core.organization_subscriptions
    where organization_id = v_store_id and trial_ends_at is not null
  ) then
    raise exception 'TRIAL_ALREADY_USED';
  end if;

  select p.sort_order into v_current_order
    from core.organization_subscriptions s
    join core.subscription_plans p on p.id = s.plan_id
   where s.organization_id = v_store_id;

  select id into v_plan_id
    from core.subscription_plans
   where code = upper(p_plan_code)
     and is_active
     and price_php is not null
     and sort_order > coalesce(v_current_order, -1);

  if v_plan_id is null then
    raise exception 'INVALID_TRIAL_PLAN';
  end if;

  update core.organization_subscriptions
    set plan_id = v_plan_id,
        status = 'TRIALING',
        trial_ends_at = now() + interval '30 days',
        updated_at = now()
    where organization_id = v_store_id;

  perform core.materialize_subscription_modules(v_store_id);
  perform core.materialize_subscription_features(v_store_id);
end;
$function$;

revoke all on function start_trial(text) from public, anon, service_role;
grant execute on function start_trial(text) to authenticated;
