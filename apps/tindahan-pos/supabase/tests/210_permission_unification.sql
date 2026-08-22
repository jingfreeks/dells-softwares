-- =============================================================================
-- pgTAP · One permission system
--
-- The change this guards is small to describe and easy to get catastrophically
-- wrong: has_permission() no longer grants everything to staff.role = 'admin'.
-- If any admin does not hold OWNER at that moment, they lose every permission
-- on a live POS.
--
-- So the assertions are ordered around that risk:
--   1. an admin created BEFORE this migration still holds everything
--   2. an admin created AFTER it does too -- the trigger, not the backfill
--   3. a cashier still holds nothing
--   4. the interim proxy is gone, with nothing left calling it
--
-- Run: psql -f supabase/tests/210_permission_unification.sql
-- =============================================================================
begin;
set local search_path = public, core, extensions;
select * from no_plan();

create or replace function pg_temp.act_as(p_user uuid)
returns void language sql as $$
  select set_config('request.jwt.claims',
                    json_build_object('sub', p_user, 'role', 'authenticated')::text, true);
$$;

-- A store, its owner (admin), and a cashier.
insert into auth.users (id, email, raw_user_meta_data) values
  ('da000000-0000-4000-8000-000000000001', 'pu.owner@test.local',
   '{"store_name":"Permission Unify Store","owner_name":"Owner"}');

create or replace function pg_temp.org() returns uuid language sql as $$
  select id from stores where name = 'Permission Unify Store'
$$;

-- A cashier, created the way create-cashier actually does it: the auth user
-- gets a throwaway store from handle_new_user, that store is deleted, and a
-- fresh staff row is inserted against the real one. Faking it with a bare
-- insert fails the FK to auth.users, and short-cutting it by demoting the
-- throwaway admin would exercise a path the application never takes.
insert into auth.users (id, email, raw_user_meta_data) values
  ('db000000-0000-4000-8000-000000000002', 'pu.cashier@test.local',
   '{"store_name":"Throwaway","owner_name":"Cashier"}');

delete from stores where id = (
  select store_id from staff where id = 'db000000-0000-4000-8000-000000000002');

insert into staff (id, store_id, name, email, role)
select 'db000000-0000-4000-8000-000000000002', pg_temp.org(), 'Cashier', 'pu.cashier@test.local', 'cashier';

-- -----------------------------------------------------------------------------
-- The admin shortcut is gone, and nothing depends on it any more
-- -----------------------------------------------------------------------------

select is(
  (select count(*)::int from pg_proc p
   join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'core' and p.proname = 'is_org_wide_staff'),
  0, 'core.is_org_wide_staff no longer exists');

select is(
  (select count(*)::int from pg_policies
   where schemaname = 'core'
     and (coalesce(qual, '') || coalesce(with_check, '')) like '%is_org_wide_staff%'),
  0, 'and no policy still calls it');

select ok(
  pg_get_functiondef('has_permission(text, uuid)'::regprocedure) not like '%role = ''admin''%',
  'has_permission no longer branches on a role name -- Architecture v1 §07');

-- -----------------------------------------------------------------------------
-- THE RISK: an admin must keep every permission across this change
-- -----------------------------------------------------------------------------

select ok(
  exists (select 1 from staff_roles sr
          join roles r on r.id = sr.role_id
          where sr.staff_id = 'da000000-0000-4000-8000-000000000001' and r.code = 'OWNER'),
  'the store owner holds OWNER');

-- Every permission that exists, not a sample -- a new code added later without
-- being granted to OWNER should fail here rather than in production.
select is(
  (select count(*)::int from permissions p
   where not has_permission(p.code, 'da000000-0000-4000-8000-000000000001')),
  0, 'and holds EVERY permission that exists, including the new core.* ones');

select ok(has_permission('core.staff.create', 'da000000-0000-4000-8000-000000000001'),
  'including the codes the interim policies were annotated with');
select ok(has_permission('staff.manage', 'da000000-0000-4000-8000-000000000001'),
  'and the ones that predate this change');

-- -----------------------------------------------------------------------------
-- An admin created AFTER the migration: the trigger, not the one-time backfill
--
-- This is the case that would have been missed by testing only the backfill,
-- and the one that would have broken every new signup.
-- -----------------------------------------------------------------------------

insert into auth.users (id, email, raw_user_meta_data) values
  ('dc000000-0000-4000-8000-000000000003', 'pu.new@test.local',
   '{"store_name":"Brand New Store","owner_name":"New Owner"}');

select ok(
  exists (select 1 from staff_roles sr
          join roles r on r.id = sr.role_id
          where sr.staff_id = 'dc000000-0000-4000-8000-000000000003' and r.code = 'OWNER'),
  'a brand-new admin is granted OWNER automatically');

select is(
  (select count(*)::int from permissions p
   where not has_permission(p.code, 'dc000000-0000-4000-8000-000000000003')),
  0, 'and therefore holds every permission, with no shortcut to rely on');

-- -----------------------------------------------------------------------------
-- A cashier is unchanged: still holds nothing
-- -----------------------------------------------------------------------------

select is(
  (select count(*)::int from permissions p
   where has_permission(p.code, 'db000000-0000-4000-8000-000000000002')),
  0, 'a plain cashier still holds no permissions at all');

select ok(not has_permission('core.staff.create', 'db000000-0000-4000-8000-000000000002'),
  'and specifically cannot create staff');

-- A SUPERVISOR gets the two read-only core codes and neither of the sharp
-- ones. Assigned by the owner, because assign_staff_role checks who is asking
-- as well as who is being changed -- calling it with no session would test a
-- path no operator ever takes.
do $$
begin
  perform pg_temp.act_as('da000000-0000-4000-8000-000000000001');
  perform assign_staff_role('db000000-0000-4000-8000-000000000002', 'SUPERVISOR');
  perform set_config('request.jwt.claims', '', true);
end $$;

select ok(has_permission('core.staff.view', 'db000000-0000-4000-8000-000000000002'),
  'a supervisor can see the staff directory');
select ok(has_permission('core.audit.view', 'db000000-0000-4000-8000-000000000002'),
  'and read the audit log');
select ok(not has_permission('core.staff.assign_role', 'db000000-0000-4000-8000-000000000002'),
  'but cannot change what anyone may do -- that stays owner-only');
select ok(not has_permission('core.organization.manage', 'db000000-0000-4000-8000-000000000002'),
  'nor edit the organization itself');

-- -----------------------------------------------------------------------------
-- Demotion has to actually demote
--
-- Once the role shortcut is gone, staff_roles is the ONLY thing deciding what
-- someone may do. An admin demoted to cashier who kept OWNER would be demoted
-- in name only -- and that is reachable through the "admin can update staff in
-- own store" policy from 0001_init.
-- -----------------------------------------------------------------------------

insert into auth.users (id, email, raw_user_meta_data) values
  ('dd000000-0000-4000-8000-000000000004', 'pu.demote@test.local',
   '{"store_name":"Demotion Store","owner_name":"Demote Me"}');

select ok(has_permission('staff.manage', 'dd000000-0000-4000-8000-000000000004'),
  'an admin starts with full permissions');

update staff set role = 'cashier' where id = 'dd000000-0000-4000-8000-000000000004';

select ok(not has_permission('staff.manage', 'dd000000-0000-4000-8000-000000000004'),
  'and loses them on demotion -- OWNER is revoked, not merely unused');
select is(
  (select count(*)::int from permissions p
   where has_permission(p.code, 'dd000000-0000-4000-8000-000000000004')),
  0, 'holding nothing at all afterwards');

-- And back again, so the trigger is symmetric rather than one-way.
update staff set role = 'admin' where id = 'dd000000-0000-4000-8000-000000000004';
select ok(has_permission('staff.manage', 'dd000000-0000-4000-8000-000000000004'),
  'promotion restores them');

-- -----------------------------------------------------------------------------
-- The policies still work, as a real session rather than as postgres
-- -----------------------------------------------------------------------------
set local role authenticated;
select pg_temp.act_as('da000000-0000-4000-8000-000000000001');

select lives_ok($$ update core.organizations set name = name where id = pg_temp.org() $$,
  'an owner can still update their organization through the rewritten policy');

select isnt_empty($$ select 1 from core.audit_logs $$,
  'and still reads their own audit log');

reset role;
set local role authenticated;
select pg_temp.act_as('db000000-0000-4000-8000-000000000002');

-- A supervisor holds core.audit.view but must still only see their own org.
select is(
  (select count(*)::int from core.audit_logs where organization_id <> pg_temp.org()),
  0, 'a supervisor with core.audit.view sees no other organization''s log');

reset role;
select * from finish();
rollback;
