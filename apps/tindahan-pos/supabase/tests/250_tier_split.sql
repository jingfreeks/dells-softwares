-- =============================================================================
-- pgTAP · The tier split
--
-- Four plans that grant identical capabilities are one plan with four names.
-- 20260815113000 made them differ. The properties worth holding down:
--
--   1. the ladder is CUMULATIVE -- a dearer plan is never missing something a
--      cheaper plan has. This is the failure that would actually cost money,
--      and it is exactly the one hand-written per-plan lists produce.
--   2. every feature belongs to at least one plan (nothing is unsellable)
--   3. no plan grants a module while granting none of that module's features
--   4. the tiers are the ones the business agreed, not merely self-consistent
--   5. GRANDFATHERING HOLDS -- an existing tenant does not lose a capability
--      when the plans narrow underneath them. This is the whole risk of the
--      migration, so it is tested against the real function that would strip
--      them, not by inspecting a column.
--
-- Run: psql -f supabase/tests/250_tier_split.sql
-- =============================================================================
begin;
set local search_path = public, core, extensions;
select * from no_plan();

-- -----------------------------------------------------------------------------
-- 1 · cumulative
-- -----------------------------------------------------------------------------
select is_empty(
  $$
  with rank (code, r) as (
    values ('FREE', 0), ('BASIC', 1), ('BUSINESS', 2), ('PRO', 3), ('ENTERPRISE', 4)
  )
  select lo.code || ' has ' || pf.feature_code || ' but ' || hi.code || ' does not'
  from rank lo
  join rank hi on hi.r > lo.r
  join core.subscription_plans plo on plo.code = lo.code
  join core.subscription_plans phi on phi.code = hi.code
  join core.plan_features pf on pf.plan_id = plo.id
  where not exists (
    select 1 from core.plan_features x
    where x.plan_id = phi.id and x.feature_code = pf.feature_code
  )
  $$,
  'the ladder is cumulative: no cheaper plan holds a feature a dearer one lacks'
);

-- -----------------------------------------------------------------------------
-- 2 · nothing unsellable
-- -----------------------------------------------------------------------------
select is_empty(
  $$
  select f.code from core.features f
  where not exists (select 1 from core.plan_features pf where pf.feature_code = f.code)
  $$,
  'every feature in the catalogue is on at least one plan'
);

-- -----------------------------------------------------------------------------
-- 3 · no module granted as an empty shell
-- -----------------------------------------------------------------------------
select is_empty(
  $$
  select p.code || '/' || pm.module_code
  from core.subscription_plans p
  join core.plan_modules pm on pm.plan_id = p.id
  where exists (select 1 from core.features f where f.module_code = pm.module_code)
    and not exists (
      select 1 from core.plan_features pf
      join core.features f on f.code = pf.feature_code
      where pf.plan_id = p.id and f.module_code = pm.module_code
    )
  $$,
  'no plan grants a module while granting none of that module''s features'
);

-- -----------------------------------------------------------------------------
-- 4 · the agreed tiers
--
-- Spelled out rather than derived. A test that recomputes the ladder from the
-- same table it is checking proves only that the table equals itself; these
-- are the sets the business actually signed off, so a later edit that changes
-- what a customer is paying for has to change this file too.
-- -----------------------------------------------------------------------------
select set_eq(
  $$ select pf.feature_code from core.plan_features pf
     join core.subscription_plans p on p.id = pf.plan_id where p.code = 'FREE' $$,
  array['pos.shifts', 'pos.void', 'pos.discounts', 'pos.pack_pricing'],
  'FREE sells the act of selling and nothing else'
);

select set_eq(
  $$ select pf.feature_code from core.plan_features pf
     join core.subscription_plans p on p.id = pf.plan_id where p.code = 'BASIC' $$,
  array['pos.shifts', 'pos.void', 'pos.discounts', 'pos.pack_pricing',
        'pos.utang', 'pos.eload', 'pos.held_sales',
        'inventory.suppliers', 'inventory.receiving'],
  'BASIC is the sari-sari store: utang, e-load, and enough stock-in to be honest'
);

select set_eq(
  $$ select pf.feature_code from core.plan_features pf
     join core.subscription_plans p on p.id = pf.plan_id where p.code = 'BUSINESS' $$,
  array['pos.shifts', 'pos.void', 'pos.discounts', 'pos.pack_pricing',
        'pos.utang', 'pos.eload', 'pos.held_sales',
        'inventory.suppliers', 'inventory.receiving',
        'inventory.purchase_orders', 'inventory.stock_count',
        'inventory.conversions',
        -- 20260904110000: Review is where Growth stops being a bigger Starter
        -- and starts being a management tool. Rank 2 and up.
        'pos.review'],
  'BUSINESS is the growing store: purchase orders, stock counts, unit '
  || 'conversions and Review on top of BASIC'
);

select set_eq(
  $$ select pf.feature_code from core.plan_features pf
     join core.subscription_plans p on p.id = pf.plan_id where p.code = 'PRO' $$,
  array['pos.shifts', 'pos.void', 'pos.discounts', 'pos.pack_pricing',
        'pos.utang', 'pos.eload', 'pos.held_sales',
        'inventory.suppliers', 'inventory.receiving',
        'pos.multi_register', 'pos.bir_receipts',
        'inventory.purchase_orders', 'inventory.stock_count',
        'inventory.conversions', 'pos.review'],
  'PRO is the convenience store: everything but stock transfers -- the same '
  || 'set as before BUSINESS existed, since BUSINESS was carved out of what '
  || 'PRO already sold rather than PRO losing anything, plus Review, which '
  || 'is granted by rank so no dearer tier is missing what BUSINESS holds'
);

select is(
  (select count(*)::int from core.plan_features pf
   join core.subscription_plans p on p.id = pf.plan_id where p.code = 'ENTERPRISE'),
  (select count(*)::int from core.features),
  'ENTERPRISE holds the whole catalogue'
);

select is(
  (select count(*)::int from core.plan_features pf
   join core.subscription_plans p on p.id = pf.plan_id
   join core.features f on f.code = pf.feature_code
   where p.code = 'ENTERPRISE' and f.code = 'inventory.transfers'),
  1,
  'stock transfers -- the more-than-one-branch signal -- is what ENTERPRISE adds'
);

-- -----------------------------------------------------------------------------
-- 5 · grandfathering
--
-- THIS IS THE RISKIEST PART OF THE MIGRATION AND A LOCAL RESET CANNOT PROVE
-- IT. On a fresh local database there are no organizations at the moment
-- 20260815113000 runs, so its grandfather step updates zero rows; in
-- production it re-sources roughly 9,915 grants across 661 tenants. A green
-- run of this file therefore says nothing about the real backfill -- that has
-- to be checked on staging, which has the tenants (see supabase/snippets/
-- tier-split-audit.sql).
--
-- What CAN be pinned here is the mechanism the grandfather relies on: that a
-- MANUAL grant outranks the plan inside materialize_subscription_features().
-- If that ever stopped being true, the backfill would be worthless, and this
-- is what would catch it. So the tenant below is built by hand into the exact
-- state the migration leaves a grandfathered tenant in, and then put through
-- the function that would strip it.
-- -----------------------------------------------------------------------------
-- Inserting a core.organizations row auto-provisions it: a BASIC subscription,
-- BASIC's modules, and BASIC's features. That trigger is doing the real work
-- here -- the 'new' tenant below is deliberately left exactly as provisioning
-- leaves it, so what it holds is what a genuine sign-up holds today.
do $$
declare
  v_old uuid;
  v_new uuid;
begin
  insert into core.organizations (name, status)
  values ('pgTAP grandfathered tenant', 'ACTIVE') returning id into v_old;

  -- Put it into the state 20260815113000 leaves a pre-split tenant in: holding
  -- the whole catalogue, every grant re-sourced to GRANDFATHERED.
  insert into core.organization_features (organization_id, feature_code, enabled, source)
  select v_old, f.code, true, 'GRANDFATHERED' from core.features f
  on conflict (organization_id, feature_code)
  do update set enabled = true, source = 'GRANDFATHERED';

  insert into core.organizations (name, status)
  values ('pgTAP newcomer', 'ACTIVE') returning id into v_new;

  create temp table t_org (kind text, id uuid);
  insert into t_org values ('old', v_old), ('new', v_new);
end;
$$;

select ok(
  core.feature_enabled((select id from t_org where kind = 'old'), 'inventory.transfers'),
  'a grandfathered BASIC tenant holds transfers, which BASIC no longer sells'
);

-- Run the very thing that takes features away on a plan change.
select lives_ok(
  $$ select core.materialize_subscription_features((select id from t_org where kind = 'old')) $$,
  'materializing that tenant against the narrowed plan succeeds'
);

select ok(
  core.feature_enabled((select id from t_org where kind = 'old'), 'inventory.transfers'),
  'and they STILL hold it -- GRANDFATHERED outranks the plan, which is the '
  || 'only reason the backfill protects anyone'
);

select ok(
  core.feature_enabled((select id from t_org where kind = 'old'), 'inventory.purchase_orders'),
  'and purchase orders too, so the protection is not one lucky row'
);

-- The mirror. Same plan, same function, opposite answer -- without this the
-- test above would also pass if the split were simply inert.
select ok(
  core.feature_enabled((select id from t_org where kind = 'new'), 'pos.utang'),
  'a NEW BASIC tenant gets utang, which BASIC does sell'
);

select ok(
  not core.feature_enabled((select id from t_org where kind = 'new'), 'inventory.transfers'),
  'but not transfers -- the split really does withhold what the plan omits'
);

select ok(
  not core.feature_enabled((select id from t_org where kind = 'new'), 'inventory.purchase_orders'),
  'nor purchase orders, which start at PRO'
);

-- MANUAL must keep meaning what it meant. If the backfill had written MANUAL,
-- every feature of every tenant would say a human chose it, and the word would
-- carry no information at all.
select is(
  (select source from core.organization_features
   where organization_id = (select id from t_org where kind = 'old')
     and feature_code = 'inventory.transfers'),
  'GRANDFATHERED',
  'the backfill is distinguishable from a deliberate comp'
);

-- Comp one feature on the newcomer, the way platform_set_feature() does.
update core.organization_features set source = 'MANUAL'
 where organization_id = (select id from t_org where kind = 'new')
   and feature_code = 'pos.utang';

select lives_ok(
  $$ select core.materialize_subscription_features((select id from t_org where kind = 'new')) $$,
  'materializing a tenant carrying a genuine MANUAL comp succeeds'
);

select is(
  (select source from core.organization_features
   where organization_id = (select id from t_org where kind = 'new')
     and feature_code = 'pos.utang'),
  'MANUAL',
  'and the comp stays MANUAL -- both protected sources survive, and stay apart'
);

-- The invariant the production backfill must leave behind. Vacuous on a local
-- database with no tenants; the point is that it is NOT vacuous on staging,
-- where the same file can be run to check the real backfill.
select is_empty(
  $$
  select o.id::text || ' ' || f.feature_code
  from core.organization_features f
  join core.organizations o on o.id = f.organization_id
  join core.organization_subscriptions s
    on s.organization_id = o.id and s.status <> 'CANCELLED'
  where f.enabled
    and f.source = 'SUBSCRIPTION'
    and not exists (
      select 1 from core.plan_features pf
      where pf.plan_id = s.plan_id and pf.feature_code = f.feature_code
    )
  $$,
  'no tenant holds an enabled SUBSCRIPTION grant their plan does not sell'
);

-- -----------------------------------------------------------------------------
-- 6 · the console can see the ladder
--
-- platform_plans() used to return only the module list, which was a complete
-- answer while every plan sold the same features. It is not one now: FREE and
-- ENTERPRISE differ by eleven features, and an operator moving a live shop
-- between plans has to be able to see that.
-- -----------------------------------------------------------------------------
insert into auth.users (id, email) values
  ('fd400000-0000-4000-8000-000000000001', 'plans.admin@test.local');

do $$
begin
  perform core.bootstrap_platform_admin('plans.admin@test.local', 'SUPERUSER');
  update core.platform_admins set mfa_verified_at = now()
   where user_id = 'fd400000-0000-4000-8000-000000000001';
end $$;

set local role authenticated;
select set_config('request.jwt.claims',
  json_build_object('sub', 'fd400000-0000-4000-8000-000000000001',
                    'role', 'authenticated', 'aal', 'aal2')::text, true);

select set_eq(
  $$ select plan_code from public.platform_plans() $$,
  array['FREE', 'BASIC', 'BUSINESS', 'PRO', 'ENTERPRISE'],
  'the console sees every plan, including the one added after this file was '
  || 'first written, and including FREE and PRO after 20260903110000 retired '
  || 'them -- platform_plans() reports is_active rather than filtering on it, '
  || 'because an operator needs to see that a retired plan exists'
);

select is(
  (select array_length(features, 1) from public.platform_plans() where plan_code = 'FREE'),
  4,
  'and what FREE sells, not merely that it exists'
);

select is(
  (select array_length(features, 1) from public.platform_plans() where plan_code = 'ENTERPRISE'),
  (select count(*)::int from core.features),
  'and that ENTERPRISE sells the whole catalogue'
);

select ok(
  (select 'inventory.transfers' = any(features) from public.platform_plans()
    where plan_code = 'ENTERPRISE')
  and not (select 'inventory.transfers' = any(features) from public.platform_plans()
    where plan_code = 'PRO'),
  'so the difference between two plans is legible before an operator commits to it'
);

reset role;

-- A shopkeeper must not be able to read the plan catalogue. The function is
-- granted to `authenticated` as a whole, so the gate inside is what actually
-- separates them -- worth an assertion rather than an assumption.
set local role authenticated;
select set_config('request.jwt.claims',
  json_build_object('sub', gen_random_uuid(), 'role', 'authenticated')::text, true);

select is_empty(
  $$ select 1 from public.platform_plans() $$,
  'a non-administrator sees no plans at all'
);

reset role;

select * from finish();
rollback;
