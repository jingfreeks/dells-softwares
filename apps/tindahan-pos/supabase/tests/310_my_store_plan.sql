-- =============================================================================
-- pgTAP · my_store_plan() -- which plan is this store actually on
--
-- plan_prices() (300_tier_pricing.sql) answers "what could I upgrade to."
-- Nothing pinned the inverse question a dashboard widget needs first: "what
-- am I on today." This is that pin.
--
-- Run: psql -f supabase/tests/310_my_store_plan.sql
-- =============================================================================
begin;
set local search_path = public, core, extensions;
select * from no_plan();

insert into auth.users (id, email, raw_user_meta_data) values
  ('fd300000-0000-4000-8000-000000000001', 'my.plan.check@test.local',
   '{"store_name":"My Plan Check Store","owner_name":"Owner"}');

set local role authenticated;
select set_config('request.jwt.claims',
  json_build_object('sub', 'fd300000-0000-4000-8000-000000000001', 'role', 'authenticated')::text,
  true);

select is(
  (select count(*)::int from public.my_store_plan()),
  1,
  'a freshly-provisioned store is on exactly one plan, not zero and not several'
);
select is(
  (select plan_code from public.my_store_plan()),
  'BASIC',
  'grant_default_subscription() puts a new organization on BASIC -- this '
  || 'reads that back, not just what plan_features happens to contain'
);
select is(
  (select price_php from public.my_store_plan()),
  299.00::numeric,
  'and the price that comes with it'
);
select ok(
  (select 'pos.shifts' = any(features) from public.my_store_plan()),
  'features travel with the row, same contract as plan_prices()'
);
select ok(
  not (select 'inventory.transfers' = any(features) from public.my_store_plan()),
  'and only the features BASIC actually grants -- not the whole catalogue'
);

reset role;

select ok(
  not has_function_privilege('anon', 'public.my_store_plan()', 'EXECUTE'),
  'anon cannot call my_store_plan() -- there is no store to answer for '
  || 'before sign-in'
);
select ok(
  not has_function_privilege('service_role', 'public.my_store_plan()', 'EXECUTE'),
  'nor service_role -- no Edge Function in this app calls it'
);

select * from finish();
rollback;
