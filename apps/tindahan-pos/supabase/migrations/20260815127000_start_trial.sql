-- =============================================================================
-- A real, self-serve 14-day trial for BUSINESS/PRO
-- -----------------------------------------------------------------------------
-- TRIALING already exists as a first-class status in the §08 grace ladder
-- (20260815100000_grace_and_downgrade_ladder.sql) -- org_writes_allowed()'s
-- own comment already says "TRIALING, ACTIVE and PAST_DUE all still write",
-- and 160_grace_ladder.sql already pins "TRIALING may write". Nothing has
-- ever *set* it until now. The console already lets an operator put a store
-- on TRIALING by hand via platform_set_subscription_status(); this adds the
-- self-serve path -- choosing BUSINESS or PRO on the landing page now
-- activates a real, time-boxed trial instead of only recording a note for a
-- human (request_plan_upgrade(), unchanged, stays the right primitive for an
-- *existing* BASIC store asking about a plan later).
--
-- Scoped tight to bound the risk of self-serve paid-feature activation: 14
-- days, one trial ever per store, and self-reverting.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- core.expire_trial_if_due() -- the write a trial's own natural expiry needs.
--
-- Entitlements (core.organization_features / organization_modules) are
-- MATERIALIZED tables, not computed live -- reverting a trial's unlocked
-- features requires an actual write, not just a read-time calculation. This
-- project has no pg_cron extension (confirmed: nothing named '%cron%' in
-- pg_extension), so there is no scheduled sweep available without adding an
-- operational dependency this app doesn't otherwise have. Instead this is
-- called opportunistically from my_store_billing_state() below, on the next
-- authenticated read after the deadline passes.
--
-- trial_ends_at is never cleared once set, even after expiry -- it is the
-- permanent marker that this store already used its one trial (see
-- start_trial()'s guard). Only `status` moves off TRIALING.
-- ---------------------------------------------------------------------------
create or replace function core.expire_trial_if_due(p_org uuid)
returns void
language plpgsql
security definer
set search_path = core, pg_temp
as $$
declare
  v_basic_id uuid;
begin
  if not exists (
    select 1 from core.organization_subscriptions
    where organization_id = p_org and status = 'TRIALING' and trial_ends_at < now()
  ) then
    return;
  end if;

  select id into v_basic_id from core.subscription_plans where code = 'BASIC';

  update core.organization_subscriptions
    set plan_id = coalesce(v_basic_id, plan_id),
        status = 'ACTIVE',
        updated_at = now()
    where organization_id = p_org and status = 'TRIALING' and trial_ends_at < now();

  perform core.materialize_subscription_modules(p_org);
  perform core.materialize_subscription_features(p_org);
end;
$$;

comment on function core.expire_trial_if_due is
  'No-ops unless the org is TRIALING and past trial_ends_at. Otherwise '
  'reverts to BASIC, sets status ACTIVE, and re-materializes entitlements. '
  'Idempotent -- safe to call on every read.';

-- ---------------------------------------------------------------------------
-- public.start_trial() -- the self-serve activation.
-- ---------------------------------------------------------------------------
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
        trial_ends_at = now() + interval '14 days',
        updated_at = now()
    where organization_id = v_store_id;

  perform core.materialize_subscription_modules(v_store_id);
  perform core.materialize_subscription_features(v_store_id);
end;
$$;

comment on function public.start_trial is
  'A signed-in tenant self-activating a 14-day trial of BUSINESS or PRO. '
  'Real entitlements, immediately, no human involved -- the one place in '
  'this app a paid capability activates without one. One trial ever per '
  'store (trial_ends_at is the permanent marker); self-reverts to BASIC on '
  'the next authenticated read after expiry, see '
  'core.expire_trial_if_due().';

revoke all on function public.start_trial(text) from public, anon, service_role;
grant execute on function public.start_trial(text) to authenticated;

-- ---------------------------------------------------------------------------
-- my_store_billing_state() -- now self-heals, and reports trial_ends_at.
--
-- No longer `language sql stable`: it can now write (the opportunistic
-- expiry above). Its own comment used to say "Nothing moves the status
-- automatically -- that is an operator action." A trial's own pre-agreed
-- 14-day expiry is a deliberate, narrow exception to that: it is not a
-- surprise status change the way e.g. non-payment suspension would be, it
-- is exactly what the tenant agreed to when the trial started.
--
-- Accepted trade-off: my_store_features() and my_store_billing_state() are
-- two separate RPC calls fired near app-mount by different providers
-- (FeaturesProvider, BillingProvider), so there is a small window --
-- until the next reload or staff-session change -- where a just-expired
-- trial's features can still read as available. Not a security issue
-- (worst case is a few extra seconds of already-granted access), and not
-- worth a second call site for this pass.
-- ---------------------------------------------------------------------------
-- Postgres refuses CREATE OR REPLACE across a RETURNS TABLE signature
-- change (adding trial_ends_at) -- drop first.
drop function if exists public.my_store_billing_state();

create function public.my_store_billing_state()
returns table (
  organization_status text,
  subscription_status text,
  writes_allowed      boolean,
  grace_ends_at       timestamptz,
  trial_ends_at       timestamptz
)
language plpgsql
security definer
set search_path = public, core, pg_temp
as $$
declare
  v_store_id uuid := auth_store_id();
begin
  if v_store_id is not null then
    perform core.expire_trial_if_due(v_store_id);
  end if;

  return query
    select
      o.status::text,
      coalesce(s.status, 'NONE'),
      core.org_writes_allowed(o.id),
      case when s.status = 'PAST_DUE'
           then coalesce(s.current_period_end, s.updated_at) + interval '14 days'
      end,
      case when s.status = 'TRIALING' then s.trial_ends_at end
    from core.organizations o
    left join core.organization_subscriptions s
      on s.organization_id = o.id and s.status <> 'CANCELLED'
    where o.id = v_store_id;
end;
$$;

comment on function public.my_store_billing_state is
  'One row for the calling staff member''s own store, or none if they have '
  'no store. grace_ends_at is populated only while PAST_DUE; trial_ends_at '
  'only while TRIALING. Opportunistically expires an overdue trial (see '
  'core.expire_trial_if_due()) before reading -- otherwise, nothing else '
  'moves the status automatically; that stays an operator action.';

revoke all on function public.my_store_billing_state() from public, anon, service_role;
grant execute on function public.my_store_billing_state() to authenticated;
