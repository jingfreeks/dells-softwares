-- =============================================================================
-- pgTAP · The platform admin boundary
--
-- The most dangerous surface in the system. Every public.platform_* function
-- is SECURITY DEFINER and EXECUTE-able by `authenticated`, so any signed-in
-- cashier can call them; they are safe only because each re-asks
-- core.is_platform_admin(). platform_organizations() in particular would be
-- a full tenant dump for any user if its guard were ever dropped.
--
-- These are the deny tests for that. If one of them starts failing, do not
-- adjust the test.
--
-- Run: psql -f supabase/tests/110_platform_admin.sql
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
  ('bb000000-0000-4000-8000-00000000e001', 'pa.tenant@test.local',
   '{"store_name":"PA Tenant Store","owner_name":"PA Tenant"}'),
  ('bb000000-0000-4000-8000-00000000e002', 'pa.admin@test.local',
   '{"full_name":"PA Admin"}');

-- An administrator exists, but has NOT verified a second factor yet.
select core.bootstrap_platform_admin('pa.admin@test.local', 'SUPERUSER') into pg_temp.discard;

-- -----------------------------------------------------------------------------
-- A tenant, holding a perfect aal2 session, must learn nothing
-- -----------------------------------------------------------------------------
set local role authenticated;
select pg_temp.act_as('bb000000-0000-4000-8000-00000000e001');

select is((select count(*)::int from public.platform_me()), 0,
  'a tenant is not a platform admin');
select is((select count(*)::int from public.platform_organizations()), 0,
  'a tenant cannot list organizations -- the whole platform does not leak');
select is((select count(*)::int from public.platform_audit()), 0,
  'a tenant cannot read the platform audit');
select is((select count(*)::int from public.platform_organization_modules(
            (select id from core.organizations limit 1))), 0,
  'a tenant cannot read another organization''s modules');
select throws_ok($$
  select public.platform_set_module(
    (select id from core.organizations limit 1), 'ACCOUNTING', true, 'escalation attempt')
$$, 'P0001', 'UNAUTHORIZED_ACTION',
   'a tenant cannot grant a module');
select throws_ok($$ select public.platform_verify_mfa() $$, 'P0001', 'UNAUTHORIZED_ACTION',
  'a tenant cannot stamp themselves as MFA-verified');

reset role;

-- Break-glass must be unreachable from the browser role entirely.
select ok(not has_function_privilege('authenticated',
            'core.bootstrap_platform_admin(text, text)', 'EXECUTE'),
  'authenticated cannot execute the break-glass bootstrap');
select ok(has_function_privilege('service_role',
            'core.bootstrap_platform_admin(text, text)', 'EXECUTE'),
  'only service_role can');

-- -----------------------------------------------------------------------------
-- A REAL administrator whose second factor is stale gets no access either.
-- This is the failure mode that matters: it must degrade to nothing, not to
-- tenant-wide reads.
-- -----------------------------------------------------------------------------
set local role authenticated;
select pg_temp.act_as('bb000000-0000-4000-8000-00000000e002');

select is((select count(*)::int from public.platform_me()), 1,
  'an administrator can see their own record, so the app can prompt for MFA');
select is((select mfa_fresh from public.platform_me()), false,
  'and mfa_fresh is false, not null -- the client is promised a boolean');
select is((select count(*)::int from public.platform_organizations()), 0,
  'but with a stale second factor they see NO organizations');
select throws_ok($$
  select public.platform_set_module(
    (select id from core.organizations limit 1), 'ACCOUNTING', true, 'stale mfa')
$$, 'P0001', 'UNAUTHORIZED_ACTION',
   'and cannot change entitlement');

-- A password-only session cannot self-certify.
select pg_temp.act_as('bb000000-0000-4000-8000-00000000e002', 'aal1');
select throws_ok($$ select public.platform_verify_mfa() $$, 'P0001',
  'MFA_REQUIRED: platform administration requires a second factor',
  'an aal1 session cannot verify a second factor');

reset role;

-- -----------------------------------------------------------------------------
-- With a verified second factor, the console works
-- -----------------------------------------------------------------------------
update core.platform_admins set mfa_verified_at = now()
 where user_id = 'bb000000-0000-4000-8000-00000000e002';

set local role authenticated;
select pg_temp.act_as('bb000000-0000-4000-8000-00000000e002');

select ok((select mfa_fresh from public.platform_me()),
  'a verified second factor opens the window');
select isnt_empty($$ select 1 from public.platform_organizations() $$,
  'and the administrator can now see tenants');
select lives_ok($$
  select public.platform_set_module(
    (select organization_id from public.platform_organizations()
     where name = 'PA Tenant Store'), 'ACCOUNTING', true, 'pgtap')
$$, 'and can grant a module');
select throws_ok($$
  select public.platform_set_module(
    (select organization_id from public.platform_organizations()
     where name = 'PA Tenant Store'), 'CORE', false, 'pgtap')
$$, 'P0001', 'VALIDATION_FAILED: the CORE module cannot be disabled',
   'CORE can never be switched off');

reset role;

-- The grant reached the tenant, and was recorded.
select ok(core.module_enabled(
            (select id from core.organizations where name = 'PA Tenant Store'), 'ACCOUNTING'),
  'the tenant is genuinely entitled afterwards');
select isnt_empty($$
  select 1 from core.platform_audit_logs where action = 'PLATFORM_ENABLE_MODULE'
$$, 'and the platform audit recorded it');

-- -----------------------------------------------------------------------------
-- Audit immutability, and the last-superuser guard
-- -----------------------------------------------------------------------------
select throws_ok($$ update core.platform_audit_logs set action = 'TAMPERED' where id > 0 $$,
  'P0001', null, 'platform audit rows cannot be rewritten');
select throws_ok($$ delete from core.platform_audit_logs where id > 0 $$,
  'P0001', null, 'platform audit rows cannot be deleted');

set local role authenticated;
select pg_temp.act_as('bb000000-0000-4000-8000-00000000e002');
select throws_ok($$
  select core.revoke_platform_admin('bb000000-0000-4000-8000-00000000e002', 'pgtap')
$$, 'P0001', 'LAST_SUPERUSER: promote another superuser before revoking this one',
   'the last superuser cannot revoke themselves and lock everyone out');
reset role;

-- -----------------------------------------------------------------------------
-- Every platform_* function is executable by authenticated and nobody else.
--
-- Added after running security-surface.sql against the real staging project
-- and finding all fifteen granted to anon and service_role too, a pre-existing
-- default-privilege characteristic of the hosted project that no migration in
-- this repository had introduced or noticed (20260815119000 revoked it). That
-- was caught by hand, once, by pointing a snippet at a real database. This is
-- the version of the same check that runs every time -- locally, in CI, on
-- every future platform_* function -- so the next one is not the sixteenth
-- silent over-grant sitting undetected until someone happens to check staging
-- again.
--
-- anon: the console signs in through Supabase Auth like any other app; there
-- is no pre-login platform_* call anywhere in super-admin's client code.
-- service_role: no Edge Function in this codebase calls a platform_* RPC --
-- platform administration is a human-in-the-loop console action, not
-- something automation performs.
-- -----------------------------------------------------------------------------
select is_empty(
  $$
  select p.proname || ' -> ' || coalesce(r.rolname, 'PUBLIC')
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  cross join lateral aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a
  left join pg_roles r on r.oid = a.grantee
  where n.nspname = 'public' and p.proname like 'platform\_%'
    and a.privilege_type = 'EXECUTE'
    and coalesce(r.rolname, 'PUBLIC') not in ('authenticated', 'postgres')
  $$,
  'no platform_* function is executable by anon, service_role, or PUBLIC'
);

select ok(
  (select bool_and(has_function_privilege('authenticated', p.oid, 'EXECUTE'))
   from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.proname like 'platform\_%'),
  'and authenticated can still call every one of them -- the console is unaffected'
);

select * from finish();
rollback;
