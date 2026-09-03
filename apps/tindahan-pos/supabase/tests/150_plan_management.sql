-- =============================================================================
-- pgTAP · Plan management, and the flaw it closes
--
-- The console's original only action wrote source = 'MANUAL', which
-- materialization never overwrites -- so changing entitlement permanently
-- opted that module out of plan control. These assertions pin down both the
-- flaw (a MANUAL grant really does survive a plan change) and the escape
-- hatch that makes it survivable (reset hands the module back to the plan).
--
-- Run: psql -f supabase/tests/150_plan_management.sql
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
  ('e1000000-0000-4000-8000-000000000001', 'plan.tenant@test.local',
   '{"store_name":"Plan Test Store","owner_name":"Plan Owner"}'),
  ('e2000000-0000-4000-8000-000000000002', 'plan.admin@test.local',
   '{"full_name":"Plan Admin"}');

do $$
declare v_org uuid;
begin
  perform core.bootstrap_platform_admin('plan.admin@test.local', 'SUPERUSER');
  update core.platform_admins set mfa_verified_at = now()
   where user_id = 'e2000000-0000-4000-8000-000000000002';
  select id into v_org from stores where name = 'Plan Test Store';
  execute format(
    'create or replace function pg_temp.org() returns uuid language sql immutable as $f$ select %L::uuid $f$', v_org);
end $$;

-- -----------------------------------------------------------------------------
-- A tenant must not be able to reach any of this
-- -----------------------------------------------------------------------------
set local role authenticated;
select pg_temp.act_as('e1000000-0000-4000-8000-000000000001');

select is((select count(*)::int from public.platform_plans()), 0,
  'a tenant cannot list plans');
select throws_ok($$ select public.platform_set_plan(pg_temp.org(), 'ENTERPRISE', 'self-upgrade') $$,
  'P0001', 'UNAUTHORIZED_ACTION', 'a tenant cannot change their own plan');
select throws_ok($$ select public.platform_reset_module_to_plan(pg_temp.org(), 'POS') $$,
  'P0001', 'UNAUTHORIZED_ACTION', 'a tenant cannot reset a module');

-- -----------------------------------------------------------------------------
-- The administrator path
-- -----------------------------------------------------------------------------
select pg_temp.act_as('e2000000-0000-4000-8000-000000000002');

select isnt_empty($$ select 1 from public.platform_plans() $$,
  'an administrator can list plans');
select ok((select 'ACCOUNTING' = any(modules) from public.platform_plans() where plan_code = 'ENTERPRISE'),
  'and each plan reports what it includes');

select ok(not core.module_enabled(pg_temp.org(), 'ACCOUNTING'),
  'the tenant starts on BASIC, without ACCOUNTING');

select lives_ok($$ select public.platform_set_plan(pg_temp.org(), 'ENTERPRISE', 'paid upgrade') $$,
  'an administrator can move them to PRO');
select ok(core.module_enabled(pg_temp.org(), 'ACCOUNTING'),
  'which materializes ACCOUNTING on');

select lives_ok($$ select public.platform_set_plan(pg_temp.org(), 'BASIC', 'downgrade') $$,
  'and back down to BASIC');
select ok(not core.module_enabled(pg_temp.org(), 'ACCOUNTING'),
  'which revokes it again -- plan changes actually take effect');

select throws_ok($$ select public.platform_set_plan(pg_temp.org(), 'NONSENSE') $$,
  'P0001', 'VALIDATION_FAILED: unknown or inactive plan NONSENSE',
  'an unknown plan is refused');

-- -----------------------------------------------------------------------------
-- The flaw itself: a MANUAL grant outranks the plan, by design...
-- -----------------------------------------------------------------------------
select lives_ok($$ select public.platform_set_module(pg_temp.org(), 'ACCOUNTING', true, 'comped') $$,
  'a module can still be granted manually');
select is((select source from core.organization_modules
           where organization_id = pg_temp.org() and module_code = 'ACCOUNTING'),
          'MANUAL', 'and it is recorded as a manual grant');

select lives_ok($$ select public.platform_set_plan(pg_temp.org(), 'BASIC', 'downgrade to starter') $$,
  'the tenant is then downgraded all the way to the entry tier');
select ok(core.module_enabled(pg_temp.org(), 'ACCOUNTING'),
  'the comp SURVIVES the downgrade -- intended, but it is why a reset is needed');
-- Asserted on a plan-sourced FEATURE rather than a module. This read
-- `not module_enabled(..., 'INVENTORY')` while the downgrade target was FREE,
-- which carried POS alone. FREE was retired in 20260903110000, and every plan
-- still assignable carries INVENTORY -- ENTERPRISE and BASIC differ by the
-- ACCOUNTING module only, which is precisely the comped one. So there is no
-- module left that this could observe being revoked, and purchase orders make
-- the same point: granted by ENTERPRISE, not by BASIC, and gone once BASIC
-- governs.
select ok(not core.feature_enabled(pg_temp.org(), 'inventory.purchase_orders'),
  'while plan-sourced grants are revoked normally');

-- -----------------------------------------------------------------------------
-- ...and the escape hatch that makes it survivable
-- -----------------------------------------------------------------------------
select lives_ok($$ select public.platform_reset_module_to_plan(pg_temp.org(), 'ACCOUNTING', 'comp ended') $$,
  'the override can be handed back to the plan');
select ok(not core.module_enabled(pg_temp.org(), 'ACCOUNTING'),
  'after which the tenant''s own plan governs and ACCOUNTING is off');

select lives_ok($$ select public.platform_set_plan(pg_temp.org(), 'ENTERPRISE', 'upgrade again') $$,
  'and a later upgrade now reaches that module again');
select ok(core.module_enabled(pg_temp.org(), 'ACCOUNTING'),
  'proving the module is genuinely back under plan control');

select throws_ok($$ select public.platform_reset_module_to_plan(pg_temp.org(), 'NOT_A_MODULE') $$,
  'P0001', 'VALIDATION_FAILED: no entitlement row for that module',
  'resetting a module the tenant has no row for is refused');

reset role;

select isnt_empty($$
  select 1 from core.platform_audit_logs where action = 'PLATFORM_SET_PLAN'
$$, 'plan changes are audited');
select isnt_empty($$
  select 1 from core.platform_audit_logs where action = 'PLATFORM_RESET_MODULE_TO_PLAN'
$$, 'and so are resets');

select * from finish();
rollback;
