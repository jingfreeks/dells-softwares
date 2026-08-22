-- =============================================================================
-- pgTAP · request_plan_upgrade() -- a signed-in tenant asking for BUSINESS
-- or PRO, with nothing actually activated
--
-- No checkout flow exists in this app. This RPC records a request as a note
-- on the store's subscription row -- this pins that it does exactly that,
-- nothing more, and that it rejects everything that isn't a real request
-- (BASIC/FREE are already what registration provisions by default, and
-- ENTERPRISE is contact-only everywhere else in this app).
--
-- Run: psql -f supabase/tests/320_request_plan_upgrade.sql
-- =============================================================================
begin;
set local search_path = public, core, extensions;
select * from no_plan();

insert into auth.users (id, email, raw_user_meta_data) values
  ('fe300000-0000-4000-8000-000000000001', 'request.plan.check@test.local',
   '{"store_name":"Request Plan Check Store","owner_name":"Owner"}');

set local role authenticated;
select set_config('request.jwt.claims',
  json_build_object('sub', 'fe300000-0000-4000-8000-000000000001', 'role', 'authenticated')::text,
  true);

select lives_ok(
  $$ select public.request_plan_upgrade('BUSINESS') $$,
  'a signed-in tenant can request BUSINESS'
);
select ok(
  (select notes from core.organization_subscriptions where organization_id = auth_store_id())
    like '%Requested upgrade to BUSINESS%',
  'and the request lands as a note on the subscription row'
);

select throws_ok(
  $$ select public.request_plan_upgrade('ENTERPRISE') $$,
  'INVALID_PLAN_REQUEST',
  'ENTERPRISE is contact-only everywhere else in this app -- this RPC is not a '
  || 'back door around that'
);
select throws_ok(
  $$ select public.request_plan_upgrade('BASIC') $$,
  'INVALID_PLAN_REQUEST',
  'BASIC is what registration already provisions -- nothing to "request"'
);
select throws_ok(
  $$ select public.request_plan_upgrade('NOT_A_REAL_PLAN') $$,
  'INVALID_PLAN_REQUEST',
  'and an unknown code is rejected the same way, not silently ignored'
);

reset role;

select ok(
  not has_function_privilege('anon', 'public.request_plan_upgrade(text)', 'EXECUTE'),
  'anon cannot call request_plan_upgrade() -- there is no store to request for '
  || 'before sign-in'
);
select ok(
  not has_function_privilege('service_role', 'public.request_plan_upgrade(text)', 'EXECUTE'),
  'nor service_role -- no Edge Function in this app calls it'
);

select * from finish();
rollback;
