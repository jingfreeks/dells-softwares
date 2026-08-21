-- =============================================================================
-- pgTAP · Feature entitlement
--
-- The layer that lets a sari-sari store and a convenience store both hold POS
-- and still have different POS products. The properties worth pinning are the
-- ones the module layer had to learn the hard way:
--
--   * it is behaviour-preserving today -- every tenant holds everything, or
--     applying it is an outage rather than a feature
--   * a feature is dark when its MODULE is off, however its own row reads
--   * a MANUAL grant survives a plan change, and can be handed back
--   * a tenant cannot grant themselves anything
--
-- Run: psql -f supabase/tests/230_feature_entitlement.sql
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

insert into auth.users (id, email, raw_user_meta_data) values
  ('fa100000-0000-4000-8000-000000000001', 'feat.owner@test.local',
   '{"store_name":"Feature Test Store","owner_name":"Owner"}'),
  ('fb100000-0000-4000-8000-000000000002', 'feat.admin@test.local',
   '{"full_name":"Feature Admin"}');

do $$
declare v_org uuid;
begin
  perform core.bootstrap_platform_admin('feat.admin@test.local', 'SUPERUSER');
  update core.platform_admins set mfa_verified_at = now()
   where user_id = 'fb100000-0000-4000-8000-000000000002';
  select id into v_org from stores where name = 'Feature Test Store';
  execute format(
    'create or replace function pg_temp.org() returns uuid language sql immutable as $f$ select %L::uuid $f$', v_org);
end $$;

-- -----------------------------------------------------------------------------
-- A new tenant holds what their plan sells -- no more, no less
--
-- This block used to assert that everyone held everything, which is what
-- 20260815109000 deliberately shipped so that adding the feature layer changed
-- nothing for anyone. 20260815113000 ended that on purpose: new tenants
-- provision onto BASIC, so BASIC is now what they get.
-- -----------------------------------------------------------------------------

select cmp_ok((select count(*) from core.features), '>', 0::bigint,
  'the catalogue is seeded');

select set_eq(
  $$ select f.code from core.features f
     where core.feature_enabled(pg_temp.org(), f.code) $$,
  $$ select pf.feature_code from core.plan_features pf
     join core.subscription_plans p on p.id = pf.plan_id
     where p.code = 'BASIC' $$,
  'a new tenant holds exactly what BASIC sells -- the plan is the whole story'
);

select ok(core.feature_enabled(pg_temp.org(), 'pos.utang'),
  'including utang, which a sari-sari store lives on');
select ok(not core.feature_enabled(pg_temp.org(), 'inventory.purchase_orders'),
  'but NOT purchase orders -- those start at PRO, and withholding them is the '
  || 'reason the tiers exist');

-- -----------------------------------------------------------------------------
-- Fails closed on anything it does not know
-- -----------------------------------------------------------------------------

select ok(not core.feature_enabled(pg_temp.org(), 'pos.not_a_feature'),
  'an unknown feature is off, not on');
select ok(not core.feature_enabled('00000000-0000-4000-8000-0000000000ff', 'pos.utang'),
  'and so is a feature for an organization that does not exist');

-- Case is not a way in.
select ok(core.feature_enabled(pg_temp.org(), 'POS.UTANG'),
  'feature codes are matched case-insensitively');

-- -----------------------------------------------------------------------------
-- THE MODULE DEPENDENCY. Selling a feature of an application the tenant does
-- not hold would be a contradiction the UI could not render.
-- -----------------------------------------------------------------------------

update core.organization_modules set enabled = false
 where organization_id = pg_temp.org() and module_code = 'INVENTORY';

select ok(not core.feature_enabled(pg_temp.org(), 'inventory.suppliers'),
  'a feature goes dark when its module is switched off');
select is(
  (select enabled from core.organization_features
   where organization_id = pg_temp.org() and feature_code = 'inventory.suppliers'),
  true, 'even though its own row still says enabled -- the module decides');
select ok(core.feature_enabled(pg_temp.org(), 'pos.utang'),
  'and features of OTHER modules are untouched');

update core.organization_modules set enabled = true
 where organization_id = pg_temp.org() and module_code = 'INVENTORY';
select ok(core.feature_enabled(pg_temp.org(), 'inventory.suppliers'),
  're-enabling the module brings its features back');

-- -----------------------------------------------------------------------------
-- A tenant cannot grant themselves anything
-- -----------------------------------------------------------------------------
set local role authenticated;
select pg_temp.act_as('fa100000-0000-4000-8000-000000000001');

select isnt_empty($$ select 1 from public.my_store_features() $$,
  'a tenant can see what they hold');
-- my_store_features() lists the whole catalogue with a flag, not just what is
-- held -- so a BASIC tenant sees the PRO capabilities sitting dark, which is
-- exactly what makes an upgrade legible to them.
select ok((select not bool_and(enabled) from public.my_store_features()),
  'and can see the capabilities they do not hold, greyed rather than hidden');
select set_eq(
  $$ select feature_code from public.my_store_features() where enabled $$,
  $$ select pf.feature_code from core.plan_features pf
     join core.subscription_plans p on p.id = pf.plan_id where p.code = 'BASIC' $$,
  'and the enabled half is precisely their plan'
);
select ok(public.current_store_has_feature('pos.utang'),
  'the gate agrees with the list');

select is((select count(*)::int from public.platform_organization_features(pg_temp.org())), 0,
  'but sees nothing through the console read');
select throws_ok($$ select public.platform_set_feature(pg_temp.org(), 'pos.utang', false, 'x') $$,
  'P0001', 'UNAUTHORIZED_ACTION',
  'and cannot change their own entitlement');

-- -----------------------------------------------------------------------------
-- The operator path
-- -----------------------------------------------------------------------------
select pg_temp.act_as('fb100000-0000-4000-8000-000000000002');

select isnt_empty($$ select 1 from public.platform_organization_features(pg_temp.org()) $$,
  'an administrator sees the tenant''s features');

select throws_ok($$ select public.platform_set_feature(pg_temp.org(), 'pos.nonsense', true) $$,
  'P0001', 'VALIDATION_FAILED: unknown feature pos.nonsense',
  'an unknown feature is refused rather than silently created');

select lives_ok($$ select public.platform_set_feature(pg_temp.org(), 'pos.eload', false, 'not a load retailer') $$,
  'an administrator can take a feature away');
select ok(not core.feature_enabled(pg_temp.org(), 'pos.eload'),
  'and it goes dark immediately');
-- Read through the console function, not the table: core.organization_features
-- is scoped by is_org_member(), and a platform admin is deliberately NOT a
-- member of the tenants they administer. Definer functions are how they see in.
select is((select source from public.platform_organization_features(pg_temp.org())
           where feature_code = 'pos.eload'),
          'MANUAL', 'recorded as a manual decision');

-- -----------------------------------------------------------------------------
-- A manual decision survives a plan change -- and can be handed back.
-- This is the trap the module layer fell into in 20260815099000.
-- -----------------------------------------------------------------------------
select lives_ok($$ select public.platform_set_plan(pg_temp.org(), 'PRO', 'upgrade') $$,
  'the tenant is moved to another plan');
select ok(not core.feature_enabled(pg_temp.org(), 'pos.eload'),
  'the removal SURVIVES the plan change -- intended, and why a reset exists');
select ok(core.feature_enabled(pg_temp.org(), 'pos.utang'),
  'while plan-sourced features are re-derived normally');

select lives_ok($$ select public.platform_reset_feature_to_plan(pg_temp.org(), 'pos.eload', 'reinstated') $$,
  'the override can be handed back to the plan');
select ok(core.feature_enabled(pg_temp.org(), 'pos.eload'),
  'after which the plan governs again');

-- Resetting something with no row at all. Every tenant currently holds every
-- feature, so the row has to be removed first -- which is itself the state a
-- tenant reaches once a feature is taken out of their plan.
reset role;
delete from core.organization_features
 where organization_id = pg_temp.org() and feature_code = 'inventory.transfers';

set local role authenticated;
select pg_temp.act_as('fb100000-0000-4000-8000-000000000002');
select throws_ok($$ select public.platform_reset_feature_to_plan(pg_temp.org(), 'inventory.transfers') $$,
  'P0001', 'VALIDATION_FAILED: no entitlement row for that feature',
  'resetting a feature with no row is refused');

reset role;

select isnt_empty($$
  select 1 from core.platform_audit_logs where action = 'PLATFORM_SET_FEATURE'
$$, 'feature changes are audited');
select isnt_empty($$
  select 1 from core.platform_audit_logs where action = 'PLATFORM_RESET_FEATURE_TO_PLAN'
$$, 'and so are resets');

select * from finish();
rollback;
