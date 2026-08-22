-- =============================================================================
-- pgTAP · Module entitlement semantics
--
-- core.module_enabled() is asked by RLS policies and by both tenant apps.
-- Everything here is about it failing CLOSED: an unknown module, a missing
-- row, an expired grant and a disabled row must all answer false, because
-- each of those is a state a real tenant can be in.
--
-- Run: psql -f supabase/tests/100_entitlement.sql
-- =============================================================================
begin;
set local search_path = public, core, extensions;
select * from no_plan();

-- Fixtures. Inserting an auth.users row is enough: handle_new_user() creates
-- the store and staff, and the core sync triggers mirror them into
-- core.organizations/branches/staff, which in turn grants the default plan.
insert into auth.users (id, email, raw_user_meta_data) values
  ('aa000000-0000-4000-8000-00000000e001', 'ent.owner@test.local',
   '{"store_name":"Entitlement Test Store","owner_name":"Ent Owner"}');

create or replace function pg_temp.org() returns uuid language sql as $$
  select id from core.organizations where name = 'Entitlement Test Store'
$$;

-- The default plan ------------------------------------------------------------
select ok(core.module_enabled(pg_temp.org(), 'POS'),
  'a new organization has POS');
select ok(core.module_enabled(pg_temp.org(), 'INVENTORY'),
  'and INVENTORY, matching what both apps could already do');
select ok(not core.module_enabled(pg_temp.org(), 'ACCOUNTING'),
  'but not ACCOUNTING, which does not exist as an app yet');

-- Fails closed ----------------------------------------------------------------
select ok(not core.module_enabled(pg_temp.org(), 'NOT_A_MODULE'),
  'an unknown module is refused, not assumed');
select ok(not core.module_enabled('00000000-0000-4000-8000-000000000000', 'POS'),
  'an organization with no entitlement rows at all is refused');
select ok(core.module_enabled(pg_temp.org(), 'CORE'),
  'CORE is the one module always on -- it is not sellable');
select ok(core.module_enabled(pg_temp.org(), 'pos'),
  'the check is case-insensitive, so a caller cannot bypass it with casing');

-- Expiry ----------------------------------------------------------------------
update core.organization_modules
   set valid_until = now() - interval '1 day'
 where organization_id = pg_temp.org() and module_code = 'INVENTORY';
select ok(not core.module_enabled(pg_temp.org(), 'INVENTORY'),
  'an expired grant is refused even though the row still says enabled');

update core.organization_modules
   set valid_until = null, valid_from = now() + interval '1 day'
 where organization_id = pg_temp.org() and module_code = 'INVENTORY';
select ok(not core.module_enabled(pg_temp.org(), 'INVENTORY'),
  'a grant that has not started yet is refused');

update core.organization_modules
   set valid_from = now() - interval '1 day'
 where organization_id = pg_temp.org() and module_code = 'INVENTORY';

-- Plan changes ----------------------------------------------------------------
update core.organization_subscriptions
   set plan_id = (select id from core.subscription_plans where code = 'PRO')
 where organization_id = pg_temp.org();
do $$ begin perform core.materialize_subscription_modules(pg_temp.org()); end $$;
select ok(core.module_enabled(pg_temp.org(), 'ACCOUNTING'),
  'upgrading to PRO grants ACCOUNTING');

update core.organization_subscriptions
   set plan_id = (select id from core.subscription_plans where code = 'BASIC')
 where organization_id = pg_temp.org();
do $$ begin perform core.materialize_subscription_modules(pg_temp.org()); end $$;
select ok(not core.module_enabled(pg_temp.org(), 'ACCOUNTING'),
  'downgrading revokes it again');
select isnt_empty($$
  select 1 from core.organization_modules
  where module_code = 'ACCOUNTING'
    and organization_id = (select id from core.organizations where name = 'Entitlement Test Store')
$$, 'but the row survives the downgrade -- data is never destroyed (§08)');

-- A manual grant outranks the plan --------------------------------------------
update core.organization_modules
   set enabled = true, source = 'MANUAL'
 where organization_id = pg_temp.org() and module_code = 'ACCOUNTING';
do $$ begin perform core.materialize_subscription_modules(pg_temp.org()); end $$;
select ok(core.module_enabled(pg_temp.org(), 'ACCOUNTING'),
  'a MANUAL grant survives re-materialization, so a comp does not expire at renewal');

select * from finish();
rollback;
