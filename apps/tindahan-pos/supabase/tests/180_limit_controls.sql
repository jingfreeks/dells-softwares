-- =============================================================================
-- pgTAP · The console's view of limits, and its ability to change them
--
-- The property that makes this worth having: the number the console shows an
-- operator must be the number the trigger enforces. They now share
-- core.limit_usage(), and the assertions below check the agreement directly
-- rather than trusting that two implementations stay in step -- because the
-- failure mode is a console reading "2 of 3" next to a refusal, with nothing
-- to explain it.
--
-- Run: psql -f supabase/tests/180_limit_controls.sql
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
  ('ea000000-0000-4000-8000-000000000001', 'lim.owner@test.local',
   '{"store_name":"Limit Console Store","owner_name":"Owner"}'),
  ('eb000000-0000-4000-8000-000000000002', 'lim.admin@test.local',
   '{"full_name":"Limit Admin"}');

-- Baked in as a literal rather than looked up each call. Half of these
-- assertions run as the platform ADMIN, who is not staff of this store --
-- so a lookup against `stores` would be hidden by RLS and silently resolve
-- to NULL, making every later assertion fail for the wrong reason.
do $$
declare v_org uuid;
begin
  perform core.bootstrap_platform_admin('lim.admin@test.local', 'SUPERUSER');
  update core.platform_admins set mfa_verified_at = now()
   where user_id = 'eb000000-0000-4000-8000-000000000002';
  select id into v_org from stores where name = 'Limit Console Store';
  execute format(
    'create or replace function pg_temp.org() returns uuid language sql immutable as $f$ select %L::uuid $f$', v_org);
end $$;

-- -----------------------------------------------------------------------------
-- core.limit_usage: the counting rules, in one place now
-- -----------------------------------------------------------------------------

select is(core.limit_usage(pg_temp.org(), 'warehouses'), 1,
  'a new store has its one default warehouse');
select is(core.limit_usage(pg_temp.org(), 'branches'), 1,
  'and the one branch the backfill synthesized');
select is(core.limit_usage(pg_temp.org(), 'devices'), 0,
  'and no devices');
select is(core.limit_usage(pg_temp.org(), 'not_a_resource'), null,
  'an unknown key counts nothing rather than zero');

-- Retired rows must not count -- the rule most likely to be got wrong.
insert into devices (id, store_id, name, paired_by)
select gen_random_uuid(), pg_temp.org(), 'Till', id from staff where store_id = pg_temp.org() limit 1;
select is(core.limit_usage(pg_temp.org(), 'devices'), 1, 'a paired device counts');

update devices set unpaired_at = now() where store_id = pg_temp.org();
select is(core.limit_usage(pg_temp.org(), 'devices'), 0,
  'an unpaired one does not -- history is not held against them');

-- -----------------------------------------------------------------------------
-- A tenant cannot see or change any of this
-- -----------------------------------------------------------------------------
set local role authenticated;
select pg_temp.act_as('ea000000-0000-4000-8000-000000000001');

select is((select count(*)::int from public.platform_organization_limits(pg_temp.org())), 0,
  'a tenant reading their own limits gets nothing');
select throws_ok($$ select public.platform_set_limit(pg_temp.org(), 'INVENTORY', 'warehouses', 99) $$,
  'P0001', 'UNAUTHORIZED_ACTION',
  'and cannot raise their own ceiling');

-- -----------------------------------------------------------------------------
-- The administrator's view
-- -----------------------------------------------------------------------------
select pg_temp.act_as('eb000000-0000-4000-8000-000000000002');

select isnt_empty($$ select 1 from public.platform_organization_limits(pg_temp.org()) $$,
  'an administrator sees the tenant''s limits');

select is((select cap from public.platform_organization_limits(pg_temp.org())
            where limit_key = 'warehouses'), 3,
  'reporting the BASIC warehouse ceiling');
select is((select current_usage from public.platform_organization_limits(pg_temp.org())
            where limit_key = 'warehouses'), 1,
  'alongside live usage');
select ok((select not at_or_over from public.platform_organization_limits(pg_temp.org())
            where limit_key = 'warehouses'),
  'and flags them as having room');

-- -----------------------------------------------------------------------------
-- THE AGREEMENT. What the console reports and what the trigger enforces must
-- be the same number, or an operator is debugging a phantom.
-- -----------------------------------------------------------------------------
reset role;
insert into warehouses (store_id, name, is_default)
select pg_temp.org(), 'W'||g, false from generate_series(1,2) g;

set local role authenticated;
select pg_temp.act_as('eb000000-0000-4000-8000-000000000002');

select is((select current_usage from public.platform_organization_limits(pg_temp.org())
            where limit_key = 'warehouses'), 3,
  'the console now reports 3 of 3');
select ok((select at_or_over from public.platform_organization_limits(pg_temp.org())
            where limit_key = 'warehouses'),
  'and flags them at the ceiling');

reset role;
select throws_ok($$ insert into warehouses (store_id, name, is_default)
                    select pg_temp.org(), 'One more', false $$,
  'P0001', 'LIMIT_EXCEEDED: warehouses (max 3)',
  'and the trigger refuses the next one -- the report and the enforcement agree');

-- -----------------------------------------------------------------------------
-- Raising it is the operator's answer to that support ticket
-- -----------------------------------------------------------------------------
set local role authenticated;
select pg_temp.act_as('eb000000-0000-4000-8000-000000000002');

select lives_ok($$ select public.platform_set_limit(pg_temp.org(), 'INVENTORY', 'warehouses', 5, 'paid add-on') $$,
  'an administrator can raise the ceiling');
select is((select cap from public.platform_organization_limits(pg_temp.org())
            where limit_key = 'warehouses'), 5,
  'the new ceiling is reported back');

reset role;
select lives_ok($$ insert into warehouses (store_id, name, is_default)
                   select pg_temp.org(), 'Allowed now', false $$,
  'and the tenant can immediately add another');

-- Clearing the key means unlimited, not zero.
set local role authenticated;
select pg_temp.act_as('eb000000-0000-4000-8000-000000000002');
select lives_ok($$ select public.platform_set_limit(pg_temp.org(), 'INVENTORY', 'warehouses', null, 'uncapped') $$,
  'and can remove the ceiling entirely');
select is((select count(*)::int from public.platform_organization_limits(pg_temp.org())
            where limit_key = 'warehouses'), 0,
  'after which the key is simply absent');

reset role;
select lives_ok($$ insert into warehouses (store_id, name, is_default)
                   select pg_temp.org(), 'No ceiling', false $$,
  'and no ceiling applies -- absent means unlimited, never zero');

-- -----------------------------------------------------------------------------
-- Guards on the setter
-- -----------------------------------------------------------------------------
set local role authenticated;
select pg_temp.act_as('eb000000-0000-4000-8000-000000000002');

select throws_ok($$ select public.platform_set_limit(pg_temp.org(), 'INVENTORY', 'warehouses', -1) $$,
  'P0001', 'VALIDATION_FAILED: a limit cannot be negative',
  'a negative ceiling is refused');
select throws_ok($$ select public.platform_set_limit(pg_temp.org(), 'NOPE', 'warehouses', 5) $$,
  'P0001', 'VALIDATION_FAILED: no entitlement row for that module',
  'so is a module the tenant does not have');

-- Zero is a real, if harsh, answer -- and distinct from removing the key.
select lives_ok($$ select public.platform_set_limit(pg_temp.org(), 'INVENTORY', 'warehouses', 0, 'freeze') $$,
  'zero is allowed, and means zero');
reset role;
select throws_ok($$ insert into warehouses (store_id, name, is_default)
                    select pg_temp.org(), 'Blocked', false $$,
  'P0001', 'LIMIT_EXCEEDED: warehouses (max 0)',
  'blocking every new one -- which is why removing the key is spelled separately');

-- -----------------------------------------------------------------------------
-- Changing a ceiling must not opt the module out of plan control.
--
-- platform_set_module() writes source = MANUAL by design. If the limit setter
-- had gone through it, adjusting a number would silently detach the module
-- from its plan -- the exact trap 20260815099000 exists to close.
-- -----------------------------------------------------------------------------
select is((select source from core.organization_modules
            where organization_id = pg_temp.org() and module_code = 'INVENTORY'),
          'SUBSCRIPTION',
  'the module is STILL plan-sourced after all those limit changes');

select isnt_empty($$
  select 1 from core.platform_audit_logs
   where action = 'PLATFORM_SET_LIMIT' and reason = 'paid add-on'
$$, 'and every change is audited with its reason');

select * from finish();
rollback;
