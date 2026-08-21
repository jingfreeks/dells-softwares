-- =============================================================================
-- pgTAP · The four plans have real prices, or a real reason not to
--
-- FREE has been ₱0.00 since the tier split. BASIC, PRO and ENTERPRISE stayed
-- null -- every downstream piece (the "Your plan" settings page, PR #180) was
-- built to say nothing about price rather than invent one, because null meant
-- "not decided yet."
--
-- 20260815120000 decides two of the three. This pins the numbers, and pins
-- the one that is DELIBERATELY still null so a future migration cannot
-- "helpfully" fill it in without noticing it was never an oversight.
--
-- Run: psql -f supabase/tests/300_tier_pricing.sql
-- =============================================================================
begin;
set local search_path = public, core, extensions;
select * from no_plan();

-- -----------------------------------------------------------------------------
-- 1 · the prices themselves
-- -----------------------------------------------------------------------------
select is(
  (select price_php from core.subscription_plans where code = 'FREE'),
  0.00::numeric,
  'FREE is zero, not null -- that distinction is what lets plan_prices() read '
  || 'a null elsewhere as "contact us" rather than "free"'
);
select is(
  (select price_php from core.subscription_plans where code = 'BASIC'),
  299.00::numeric,
  'BASIC is ₱299/month'
);
select is(
  (select price_php from core.subscription_plans where code = 'BUSINESS'),
  599.00::numeric,
  'BUSINESS is ₱599/month -- the plan added alongside the pricing decision, '
  || 'not just a number filled into an existing row'
);
select is(
  (select price_php from core.subscription_plans where code = 'PRO'),
  999.00::numeric,
  'PRO is ₱999/month'
);
select is(
  (select count(distinct pf.feature_code)::int from core.plan_features pf
   join core.subscription_plans p on p.id = pf.plan_id where p.code = 'PRO'),
  14,
  'and PRO''s feature SET is unchanged by BUSINESS existing -- still the same '
  || 'fourteen codes, not five carved away'
);
select is(
  (select price_php from core.subscription_plans where code = 'ENTERPRISE'),
  null::numeric,
  'ENTERPRISE stays null -- a decision (custom pricing), not an omission'
);
select is(
  (select billing_interval from core.subscription_plans where code = 'BASIC'),
  'MONTHLY',
  'monthly billing, not something this migration introduced a second option for'
);

-- -----------------------------------------------------------------------------
-- 2 · plan_prices() -- the tenant-facing read
-- -----------------------------------------------------------------------------
insert into auth.users (id, email, raw_user_meta_data) values
  ('fc300000-0000-4000-8000-000000000099', 'pricing.check@test.local',
   '{"store_name":"Pricing Suite Store","owner_name":"Owner"}');

set local role authenticated;
select set_config('request.jwt.claims',
  json_build_object('sub', 'fc300000-0000-4000-8000-000000000099', 'role', 'authenticated')::text,
  true);

select set_eq(
  $$ select plan_code from public.plan_prices() $$,
  array['FREE', 'BASIC', 'BUSINESS', 'PRO', 'ENTERPRISE'],
  'a signed-in tenant sees every active plan'
);

select is(
  (select price_php from public.plan_prices() where plan_code = 'PRO'),
  999.00::numeric,
  'and the real price for each -- not the console-only platform_plans(), a '
  'tenant-facing read'
);

select is(
  (select price_php from public.plan_prices() where plan_code = 'ENTERPRISE'),
  null::numeric,
  'ENTERPRISE reads null here too, for the client to render as "contact us" '
  || 'rather than a number'
);

select ok(
  (select 'inventory.transfers' = any(features) from public.plan_prices()
    where plan_code = 'ENTERPRISE')
  and not (select 'inventory.transfers' = any(features) from public.plan_prices()
    where plan_code = 'PRO'),
  'features travel with the price, so the client can say what a given plan '
  || 'actually buys'
);

reset role;

-- anon must not reach this at all. There is no pre-login pricing surface in
-- this app -- "Your plan" only exists once someone has signed in.
select ok(
  not has_function_privilege('anon', 'public.plan_prices()', 'EXECUTE'),
  'anon cannot call plan_prices() -- no pre-login pricing page exists to need it'
);

select * from finish();
rollback;
