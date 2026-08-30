-- =============================================================================
-- Restrict start_trial()/request_plan_upgrade() to admins
-- -----------------------------------------------------------------------------
-- Found while verifying KI-011 in ALPHA_QA_HANDOFF.md: neither RPC checked
-- the caller's role, only that they belonged to a store (`auth_store_id()
-- is not null`). Confirmed live on staging with a real Cashier-role
-- session token -- calling start_trial('BUSINESS') reached the function's
-- own TRIAL_ALREADY_USED business logic (proving it ran past the point
-- any role check would sit), not a permission error.
--
-- start_trial() in particular is a real problem: unlike
-- request_plan_upgrade() (which only appends a note for a human to read),
-- start_trial() immediately materializes real paid-tier entitlements for
-- the whole store -- the one place in this app a paid capability activates
-- without a human. A Cashier account should not be able to do that on the
-- Owner's behalf.
--
-- The client side (usePricingPage.choosePlan -> startTrialBestEffort) is
-- already fire-and-forget and ignores the RPC's result by design, so
-- gating this server-side is sufficient and requires no client change: an
-- unauthorized caller's request now simply fails silently, same as any
-- other best-effort failure this pattern already tolerates (see
-- startTrial.ts's own comment).
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
  if auth_role() <> 'admin' then
    raise exception 'ADMIN_ONLY';
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
  'A signed-in ADMIN self-activating a 30-day trial of BUSINESS or PRO for '
  'their store. Real entitlements, immediately, no human involved -- the '
  'one place in this app a paid capability activates without one, so this '
  'is admin-only (see 20260815143000). One trial ever per store '
  '(trial_ends_at is the permanent marker); self-reverts to BASIC on the '
  'next authenticated read after expiry, see core.expire_trial_if_due().';

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
  if auth_role() <> 'admin' then
    raise exception 'ADMIN_ONLY';
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
  'A signed-in ADMIN asking for BUSINESS or PRO on behalf of their store -- '
  'records the request as a note on the store''s subscription row for a '
  'platform admin to follow up on. Never activates a plan itself; there is '
  'no self-serve checkout in this app. Admin-only for the same reason as '
  'start_trial() (see 20260815143000) -- billing decisions belong to the '
  'store owner, not any signed-in staff member.';
