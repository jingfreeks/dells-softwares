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

-- -----------------------------------------------------------------------------
-- The overdue threshold comes from the STORE, not from a client default
--
-- Two screens aged the same customers by different rules before
-- 20260905100000: the Customers page read the owner's setting out of
-- localStorage, review_summary() was handed a hardcoded 30. These assert the
-- server now answers with the store's own number when nobody asks for another.
-- -----------------------------------------------------------------------------
reset role;
update stores set utang_overdue_days = 14 where id = pg_temp.growth_org();
set local role authenticated;
select pg_temp.act_as('4e900000-0000-4000-8000-00000000a002');

select is(
  ((select review_summary(current_date - 30, current_date)) ->> 'overdue_days')::int,
  14,
  'with no argument the store''s own threshold is used, not a client default'
);

select is(
  ((select review_summary(current_date - 30, current_date, 60)) ->> 'overdue_days')::int,
  60,
  'and an explicit argument still wins -- asking "who is 60 days late" does not change the setting'
);

reset role;
select is(
  (select utang_overdue_days from stores where id = pg_temp.growth_org()),
  14,
  'asking a different question left the store''s setting alone'
);
set local role authenticated;
select pg_temp.act_as('4e900000-0000-4000-8000-00000000a002');

-- Defaults match what alertsMock.ts defaulted to, so nobody's numbers moved
-- on the day this shipped.
--
-- Read with the role RESET, not as the Growth owner: `stores` is RLS-scoped to
-- the caller's own store, so reading another tenant's row as a signed-in user
-- returns no rows -- and a scalar subquery over no rows is NULL, which fails
-- this assertion for the wrong reason entirely.
reset role;
select is(
  (select utang_overdue_days from stores where id = pg_temp.starter_org()),
  30,
  'a store that never touched the setting keeps the old default of 30'
);
select is(
  (select drawer_variance_threshold from stores where id = pg_temp.starter_org()),
  20.00::numeric,
  'and the drawer variance default of 20'
);

-- -----------------------------------------------------------------------------
-- An ordinary ONLINE sale must be counted
--
-- The regression that makes this suite worth reading. review_summary() bounded
-- its period on sales.occurred_at, which checkout_sale() sets only when
-- replaying a sale queued offline -- so an online sale has NULL there, NULL
-- fails every comparison, and Review counted offline replays and nothing else.
-- A store that had never lost connectivity saw a Review of zero.
--
-- occurred_at is deliberately left NULL below, because that is what an
-- ordinary sale looks like in this schema.
-- -----------------------------------------------------------------------------
reset role;
insert into sales (store_id, cashier_id, total, payment_type, status,
                   receipt_number, created_at, occurred_at)
values (pg_temp.growth_org(), '4e900000-0000-4000-8000-00000000a002', 500, 'cash',
        'completed', 'OR-9001', clock_timestamp(), null);
set local role authenticated;
select pg_temp.act_as('4e900000-0000-4000-8000-00000000a002');

select is(
  ((select review_summary(current_date, current_date)) ->> 'sales_total')::numeric,
  500.00::numeric,
  'an online sale -- occurred_at NULL, which is every sale that did not go through the offline queue -- is counted'
);

select is(
  ((select review_summary(current_date, current_date)) ->> 'transaction_count')::int,
  1,
  'and counted once, not twice'
);

-- The other half of the same NULL: the utang ageing walk ordered by
-- occurred_at and took min() of it, so a customer whose credit sales were all
-- online had no age and could never be overdue.
reset role;
insert into customers (store_id, name, balance, credit_limit)
values (pg_temp.growth_org(), 'Online Utang Customer', 300, 1000);

insert into sales (store_id, cashier_id, total, payment_type, status,
                   customer_id, receipt_number, created_at, occurred_at)
values (pg_temp.growth_org(), '4e900000-0000-4000-8000-00000000a002', 300, 'credit',
        'completed',
        (select id from customers where name = 'Online Utang Customer'),
        'OR-9002', clock_timestamp() - interval '40 days', null);
set local role authenticated;
select pg_temp.act_as('4e900000-0000-4000-8000-00000000a002');

select is(
  ((select review_summary(current_date - 60, current_date)) ->> 'overdue_customer_count')::int,
  1,
  'a customer whose credit sales are all online can be overdue -- min(occurred_at) made them ageless'
);

-- -----------------------------------------------------------------------------
-- The trend series and the comparison window
-- -----------------------------------------------------------------------------

-- A day that sold nothing still has to appear, or a chart drawn from these
-- rows renders a quiet day as no day and a bad week looks like a short one.
select is(
  jsonb_array_length((select review_summary(current_date - 6, current_date)) -> 'daily_sales'),
  7,
  'seven days asked for, seven rows returned -- including the days that sold nothing'
);

select is(
  ((select review_summary(current_date - 6, current_date)) -> 'daily_sales' -> 0 ->> 'sales')::numeric,
  0.00::numeric,
  'and a day with no sales reads 0, not absent'
);

-- The 500-peso online sale inserted earlier lands on today.
select is(
  ((select review_summary(current_date - 6, current_date)) -> 'daily_sales' -> 6 ->> 'sales')::numeric,
  500.00::numeric,
  'while the day that did sell carries its total'
);

-- A whole calendar month compares against the previous calendar month, not
-- against "the 31 days before this one", which would straddle two months.
select is(
  ((select review_summary('2026-09-01'::date, '2026-09-30'::date)) -> 'previous' ->> 'from')::date,
  '2026-08-01'::date,
  'a whole calendar month compares against the whole previous calendar month'
);
select is(
  ((select review_summary('2026-09-01'::date, '2026-09-30'::date)) -> 'previous' ->> 'to')::date,
  '2026-08-31'::date,
  'ending on its last day, not 30 days back'
);

-- Anything else gets the same-length window immediately before, and the UI is
-- told the bounds so it can say what it compared instead of claiming "last
-- month" over an arbitrary week.
select is(
  ((select review_summary('2026-09-10'::date, '2026-09-16'::date)) -> 'previous' ->> 'from')::date,
  '2026-09-03'::date,
  'an arbitrary 7-day window compares against the 7 days immediately before it'
);
select is(
  ((select review_summary('2026-09-10'::date, '2026-09-16'::date)) -> 'previous' ->> 'to')::date,
  '2026-09-09'::date,
  'ending the day before the period opens'
);

-- February, because a same-length window would silently be wrong here and a
-- month-aware one is not.
select is(
  ((select review_summary('2026-03-01'::date, '2026-03-31'::date)) -> 'previous' ->> 'from')::date,
  '2026-02-01'::date,
  'March compares against February, whatever length February happens to be'
);

select * from finish();
rollback;
