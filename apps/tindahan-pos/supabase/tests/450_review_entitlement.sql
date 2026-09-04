-- =============================================================================
-- pgTAP · Review is a Growth-plan entitlement
--
-- The security matrix in the Review brief is mandatory and its first row is
-- "Starter opens Review -> denied". This suite pins the half of that which
-- lives in the database, because that is the half a client cannot lie its way
-- past: a tenant on Starter must not hold 'pos.review', whatever their browser,
-- their AsyncStorage or their request payload claims.
--
-- Growth is the plan CODE 'BUSINESS' -- 20260815137000 renamed the display
-- names without touching the codes, so 'Growth' in the brief is 'BUSINESS'
-- here. That mismatch is exactly the kind of thing a test should state rather
-- than leave someone to rediscover.
--
-- Run: psql -f supabase/tests/450_review_entitlement.sql
-- =============================================================================
begin;
set local search_path = public, core, extensions;
select * from no_plan();

create or replace function pg_temp.act_as(p_user uuid, p_aal text default 'aal2')
returns void language sql as $$
  select set_config('request.jwt.claims',
                    json_build_object('sub', p_user, 'role', 'authenticated', 'aal', p_aal)::text,
                    true);
$$;

-- Two tenants: one left on the plan every new signup provisions onto (Starter),
-- one moved to Growth. Same shape, different entitlement -- which is the only
-- variable this suite is interested in.
insert into auth.users (id, email, raw_user_meta_data) values
  ('4e900000-0000-4000-8000-00000000a001', 'review.starter@test.local',
   '{"store_name":"Starter Store","owner_name":"Starter Owner"}'),
  ('4e900000-0000-4000-8000-00000000a002', 'review.growth@test.local',
   '{"store_name":"Growth Store","owner_name":"Growth Owner"}');

do $$
declare v_starter uuid; v_growth uuid; v_plan uuid;
begin
  select id into v_starter from stores where name = 'Starter Store';
  select id into v_growth  from stores where name = 'Growth Store';

  execute format('create or replace function pg_temp.starter_org() returns uuid language sql immutable as $f$ select %L::uuid $f$', v_starter);
  execute format('create or replace function pg_temp.growth_org()  returns uuid language sql immutable as $f$ select %L::uuid $f$', v_growth);

  select id into v_plan from core.subscription_plans where code = 'BUSINESS';
  update core.organization_subscriptions set plan_id = v_plan where organization_id = v_growth;
  perform core.materialize_subscription_features(v_growth);
end $$;

-- -----------------------------------------------------------------------------
-- The catalogue row itself
-- -----------------------------------------------------------------------------
select is(
  (select module_code from core.features where code = 'pos.review'),
  'POS',
  'Review is filed under POS, not INVENTORY -- feature_enabled() fails closed on the module, and a POS-only tenant would otherwise lose a feature they paid for'
);

select ok(
  (select is_sellable from core.features where code = 'pos.review'),
  'and it is sellable, so it appears on the plan the customer is buying'
);

-- -----------------------------------------------------------------------------
-- The ladder: nothing below Growth, everything from Growth up
-- -----------------------------------------------------------------------------
select set_eq(
  $$ select p.code from core.plan_features pf
       join core.subscription_plans p on p.id = pf.plan_id
      where pf.feature_code = 'pos.review' $$,
  $$ values ('BUSINESS'), ('PRO'), ('ENTERPRISE') $$,
  'granted at rank 2 and above -- and NOT to BASIC, which is the whole point'
);

select ok(
  not exists (
    select 1 from core.plan_features pf
      join core.subscription_plans p on p.id = pf.plan_id
     where pf.feature_code = 'pos.review' and p.code in ('FREE', 'BASIC')
  ),
  'no cheaper tier holds Review'
);

-- -----------------------------------------------------------------------------
-- The two tenants, which is what the client will actually be gated on
-- -----------------------------------------------------------------------------
select ok(
  not core.feature_enabled(pg_temp.starter_org(), 'pos.review'),
  'a Starter tenant does not hold Review'
);

select ok(
  core.feature_enabled(pg_temp.growth_org(), 'pos.review'),
  'a Growth tenant does'
);

-- -----------------------------------------------------------------------------
-- Through the gate the RLS policies and the client both call, as the user
-- -----------------------------------------------------------------------------
set local role authenticated;

select pg_temp.act_as('4e900000-0000-4000-8000-00000000a001');
select ok(
  not current_store_has_feature('pos.review'),
  'and asking as the Starter owner, through the same gate a policy calls, still says no'
);

select pg_temp.act_as('4e900000-0000-4000-8000-00000000a002');
select ok(
  current_store_has_feature('pos.review'),
  'while the Growth owner is allowed'
);

-- A tenant cannot grant themselves the feature. This is the "Starter modifies
-- client state / sends plan=growth" row of the matrix, expressed where it
-- actually matters: the grant table is not writable by the tenant.
select pg_temp.act_as('4e900000-0000-4000-8000-00000000a001');
select throws_ok(
  $$ insert into core.organization_features (organization_id, feature_code, enabled, source)
     values ((select id from stores where name = 'Starter Store'), 'pos.review', true, 'MANUAL') $$,
  '42501',
  null,
  'a Starter tenant cannot grant themselves Review'
);

select ok(
  not current_store_has_feature('pos.review'),
  'and is still denied afterwards'
);

-- -----------------------------------------------------------------------------
-- review_summary() itself -- the only way to read Review data
--
-- The matrix rows that matter: Starter calling the API is denied, and denied
-- BEFORE any data is returned, not handed rows it is then trusted to hide.
-- -----------------------------------------------------------------------------
select pg_temp.act_as('4e900000-0000-4000-8000-00000000a001');
select throws_ok(
  $$ select review_summary(current_date - 30, current_date) $$,
  'P0001',
  'FEATURE_NOT_AVAILABLE',
  'a Starter owner calling review_summary() is refused -- no partial data, no empty shell'
);

select pg_temp.act_as('4e900000-0000-4000-8000-00000000a002');
select lives_ok(
  $$ select review_summary(current_date - 30, current_date) $$,
  'a Growth owner is served'
);

select ok(
  (select review_summary(current_date - 30, current_date)) ? 'sales_total',
  'and the payload carries the metrics the dashboard reads'
);

-- Expenses is absent on purpose: there is no expenses table in this schema, and
-- the brief forbids fabricating a metric the data cannot support. If this ever
-- starts passing, an expenses source was added and the client may show the card.
select ok(
  not ((select review_summary(current_date - 30, current_date)) ? 'expenses'),
  'expenses is deliberately NOT returned -- no source exists, so nothing is invented'
);

-- Approximations are declared rather than hidden.
select ok(
  (select review_summary(current_date - 30, current_date)) ? 'profit_basis_share',
  'estimated_profit ships with the share of sold value it actually knows a cost for'
);

-- A period the caller cannot invert.
select pg_temp.act_as('4e900000-0000-4000-8000-00000000a002');
select throws_ok(
  $$ select review_summary(current_date, current_date - 30) $$,
  'P0001',
  'VALIDATION_FAILED: invalid period',
  'an inverted period is refused rather than silently returning nothing'
);

select * from finish();
rollback;
