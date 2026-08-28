-- =============================================================================
-- Extend the self-serve trial from 14 to 30 days
-- -----------------------------------------------------------------------------
-- The approved Demo/Trial signup design (screens 42-52) states "30-day free
-- trial" in the user-facing copy. start_trial() (20260815127000) originally
-- shipped at 14 days; this widens it to match. Everything else about the
-- function is unchanged -- same plan-code restriction, same one-trial-ever
-- guard via trial_ends_at, same self-reverting expiry via
-- core.expire_trial_if_due() (duration-agnostic, untouched).
-- =============================================================================
create or replace function public.start_trial(p_plan_code text)
returns void
language plpgsql
security definer
set search_path = public, core, pg_temp
as $$
declare
  v_store_id uuid := auth_store_id();
  v_plan_id uuid;
begin
  if v_store_id is null then
    raise exception 'Not a registered staff member of any store';
  end if;
  if p_plan_code not in ('BUSINESS', 'PRO') then
    raise exception 'INVALID_TRIAL_PLAN';
  end if;

  if exists (
    select 1 from core.organization_subscriptions
    where organization_id = v_store_id and trial_ends_at is not null
  ) then
    raise exception 'TRIAL_ALREADY_USED';
  end if;

  select id into v_plan_id from core.subscription_plans where code = p_plan_code;
  if v_plan_id is null then
    raise exception 'UNKNOWN_PLAN';
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
$$;

comment on function public.start_trial is
  'A signed-in tenant self-activating a 30-day trial of BUSINESS or PRO. '
  'Real entitlements, immediately, no human involved -- the one place in '
  'this app a paid capability activates without one. One trial ever per '
  'store (trial_ends_at is the permanent marker); self-reverts to BASIC on '
  'the next authenticated read after expiry, see '
  'core.expire_trial_if_due().';
