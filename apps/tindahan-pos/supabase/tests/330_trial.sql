-- =============================================================================
-- pgTAP · start_trial() and its own natural expiry
--
-- Two properties, both load-bearing:
--
--   start_trial() actually activates real entitlements immediately -- this
--   is the one place in the app a paid capability turns on without a human,
--   so the guard rails matter as much as the happy path: one trial ever per
--   store, only BUSINESS/PRO, never anon/service_role.
--
--   the trial ends on its own. No pg_cron in this project, so
--   my_store_billing_state() opportunistically expires an overdue trial on
--   read (core.expire_trial_if_due()) -- this pins that it actually reverts
--   the plan, the status, and the materialized entitlements together, and
--   that it's idempotent (a second read doesn't double-revert or error).
--
-- Run: psql -f supabase/tests/330_trial.sql
-- =============================================================================
begin;
set local search_path = public, core, extensions;
select * from no_plan();

insert into auth.users (id, email, raw_user_meta_data) values
  ('ff300000-0000-4000-8000-000000000001', 'trial.check@test.local',
   '{"store_name":"Trial Check Store","owner_name":"Owner"}');

create or replace function pg_temp.org() returns uuid language sql as $$
  select id from core.organizations where name = 'Trial Check Store'
$$;

set local role authenticated;
select set_config('request.jwt.claims',
  json_build_object('sub', 'ff300000-0000-4000-8000-000000000001', 'role', 'authenticated')::text,
  true);

-- -----------------------------------------------------------------------------
-- Guard rails
-- -----------------------------------------------------------------------------
select throws_ok(
  $$ select public.start_trial('BASIC') $$,
  'INVALID_TRIAL_PLAN',
  'BASIC is what registration already provisions -- nothing to trial'
);
select throws_ok(
  $$ select public.start_trial('ENTERPRISE') $$,
  'INVALID_TRIAL_PLAN',
  'ENTERPRISE is contact-only everywhere else in this app'
);
select throws_ok(
  $$ select public.start_trial('NOT_A_REAL_PLAN') $$,
  'INVALID_TRIAL_PLAN',
  'and an unknown code the same way'
);

-- -----------------------------------------------------------------------------
-- The real activation
-- -----------------------------------------------------------------------------
select lives_ok(
  $$ select public.start_trial('BUSINESS') $$,
  'a signed-in tenant can start a real trial of BUSINESS'
);
select is(
  (select status from core.organization_subscriptions where organization_id = pg_temp.org()),
  'TRIALING',
  'the subscription row actually moves to TRIALING'
);
-- 30, not 14. 20260815138000_trial_30_days.sql moved it deliberately -- the
-- filename says so -- and both apps tell the tenant "30-day free trial" on
-- the register, onboarding and welcome screens. This assertion kept the old
-- contract and had been failing in CI ever since.
select ok(
  (select trial_ends_at from core.organization_subscriptions where organization_id = pg_temp.org())
    between now() + interval '29 days' and now() + interval '31 days',
  'trial_ends_at is set roughly 30 days out, matching what the tenant is told'
);
select ok(
  exists (
    select 1 from core.organization_features f
    join core.organizations o on o.id = f.organization_id
    where o.id = pg_temp.org() and f.feature_code = 'inventory.purchase_orders' and f.enabled
  ),
  'and a BUSINESS-only feature is actually materialized -- not just the status label'
);

select throws_ok(
  -- Still PRO, retired though it is: start_trial() does not filter on
  -- is_active (see 20260903110000), so the call reaches the already-used
  -- check, which is the thing under test. ENTERPRISE fails earlier for its
  -- own reasons and would assert something else by accident.
  $$ select public.start_trial('PRO') $$,
  'TRIAL_ALREADY_USED',
  'one trial ever per store -- trying again, even for a different plan, is rejected'
);

-- -----------------------------------------------------------------------------
-- The self-heal
-- -----------------------------------------------------------------------------
-- Backdating the deadline is fixture setup, not something a tenant can do
-- directly -- core.organization_subscriptions has no authenticated-writable
-- policy at all (only SECURITY DEFINER functions touch it), so this needs
-- postgres, not the authenticated role the rest of this suite runs as.
reset role;
update core.organization_subscriptions
  set trial_ends_at = now() - interval '1 day'
  where organization_id = pg_temp.org();
set local role authenticated;
select set_config('request.jwt.claims',
  json_build_object('sub', 'ff300000-0000-4000-8000-000000000001', 'role', 'authenticated')::text,
  true);

select is(
  (select subscription_status from public.my_store_billing_state()),
  'ACTIVE',
  'reading billing state after the deadline self-heals the status back to ACTIVE'
);
select is(
  (select plan_code from public.my_store_plan()),
  'BASIC',
  'and the plan actually reverts to BASIC'
);
select ok(
  not exists (
    select 1 from core.organization_features f
    where f.organization_id = pg_temp.org() and f.feature_code = 'inventory.purchase_orders' and f.enabled
  ),
  'and the BUSINESS-only feature is actually gone -- entitlements were re-materialized, not just the label'
);
select ok(
  (select trial_ends_at from core.organization_subscriptions where organization_id = pg_temp.org()) is not null,
  'trial_ends_at itself is never cleared -- it stays the permanent "already used a trial" marker'
);

-- Idempotent: reading again after already expired does not error or re-fire.
select lives_ok(
  $$ select * from public.my_store_billing_state() $$,
  'a second read after expiry is a harmless no-op'
);
select is(
  (select subscription_status from public.my_store_billing_state()),
  'ACTIVE',
  'and status stays ACTIVE, not double-reverted or corrupted'
);

reset role;

select ok(
  not has_function_privilege('anon', 'public.start_trial(text)', 'EXECUTE'),
  'anon cannot call start_trial() -- there is no store to trial for before sign-in'
);
select ok(
  not has_function_privilege('service_role', 'public.start_trial(text)', 'EXECUTE'),
  'nor service_role -- no Edge Function in this app calls it'
);

select * from finish();
rollback;
