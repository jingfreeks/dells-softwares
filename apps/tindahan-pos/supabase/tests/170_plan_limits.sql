-- =============================================================================
-- pgTAP · Plan limit enforcement
--
-- Three properties, and the second and third matter as much as the first:
--
--   1. a limit actually stops the next row
--   2. absent/missing limits mean UNLIMITED, never zero -- an unprovisioned
--      tenant must not be capped into uselessness
--   3. it holds for service_role, which bypasses RLS. The device limit is
--      reachable only through the pair-device Edge Function on a service_role
--      client, so a policy would have enforced it against nobody.
--
-- Run: psql -f supabase/tests/170_plan_limits.sql
-- =============================================================================
begin;
set local search_path = public, core, extensions;
select * from no_plan();

insert into auth.users (id, email, raw_user_meta_data) values
  ('fa000000-0000-4000-8000-000000000001', 'limit.owner@test.local',
   '{"store_name":"Limit Test Store","owner_name":"Limit Owner"}');

-- Resolved through public.stores rather than core.organizations: half of
-- these assertions run as service_role, which has no grant on core -- and
-- store.id IS organization.id, preserved by the Step 3 backfill.
create or replace function pg_temp.org() returns uuid language sql as $$
  select id from stores where name = 'Limit Test Store'
$$;

create or replace function pg_temp.staff() returns uuid language sql as $$
  select id from staff where store_id = pg_temp.org() limit 1
$$;

-- -----------------------------------------------------------------------------
-- The cap lookup
-- -----------------------------------------------------------------------------

select is(core.limit_for(pg_temp.org(), 'INVENTORY', 'warehouses'), 3,
  'a BASIC tenant has a warehouse ceiling of 3');
select is(core.limit_for(pg_temp.org(), 'POS', 'devices'), 3,
  'and a device ceiling of 3');

select is(core.limit_for(pg_temp.org(), 'POS', 'not_a_limit'), null,
  'an unknown key is unlimited, not zero');
select is(core.limit_for(pg_temp.org(), 'ACCOUNTING', 'devices'), null,
  'so is a module the tenant has no row for');
select is(core.limit_for('00000000-0000-4000-8000-0000000000ff', 'POS', 'devices'), null,
  'and so is an organization that does not exist -- fails open');

-- -----------------------------------------------------------------------------
-- warehouses: the store is created with one, so two more are allowed
-- -----------------------------------------------------------------------------

select is((select count(*)::int from warehouses where store_id = pg_temp.org()), 1,
  'the store starts with its default warehouse');

select lives_ok($$ insert into warehouses (store_id, name, is_default)
                   select pg_temp.org(), 'Second', false $$,
  'a second warehouse is allowed');
select lives_ok($$ insert into warehouses (store_id, name, is_default)
                   select pg_temp.org(), 'Third', false $$,
  'and a third reaches the ceiling');

select throws_ok($$ insert into warehouses (store_id, name, is_default)
                    select pg_temp.org(), 'Fourth', false $$,
  'P0001', 'LIMIT_EXCEEDED: warehouses (max 3)',
  'the fourth is refused, naming the limit and the cap');

-- Nothing was taken away in the process.
select is((select count(*)::int from warehouses where store_id = pg_temp.org()), 3,
  'and the three they have are untouched');

-- Raising the ceiling takes effect immediately, with no re-materialization.
update core.organization_modules
   set limits = limits || '{"warehouses":4}'::jsonb
 where organization_id = pg_temp.org() and module_code = 'INVENTORY';

select lives_ok($$ insert into warehouses (store_id, name, is_default)
                   select pg_temp.org(), 'Fourth, allowed now', false $$,
  'raising the limit lets the next one through at once');

-- -----------------------------------------------------------------------------
-- A tenant ALREADY over keeps everything and is simply capped
-- -----------------------------------------------------------------------------
update core.organization_modules
   set limits = limits || '{"warehouses":1}'::jsonb
 where organization_id = pg_temp.org() and module_code = 'INVENTORY';

select is((select count(*)::int from warehouses where store_id = pg_temp.org()), 4,
  'lowering the cap below the current count deletes nothing');
select isnt_empty($$ select 1 from warehouses where store_id = pg_temp.org() $$,
  'and hides nothing -- the records are still theirs');
select throws_ok($$ insert into warehouses (store_id, name, is_default)
                    select pg_temp.org(), 'One too many', false $$,
  'P0001', 'LIMIT_EXCEEDED: warehouses (max 1)',
  'they simply cannot add another');

-- -----------------------------------------------------------------------------
-- devices: the case that proves a policy would not have been enough.
--
-- Inserted here as service_role, exactly as the pair-device Edge Function
-- does. RLS is bypassed; the trigger is not.
-- -----------------------------------------------------------------------------
set local role service_role;

select lives_ok($$ insert into devices (id, store_id, name, paired_by)
                   values (gen_random_uuid(), pg_temp.org(), 'Till 1', pg_temp.staff()) $$,
  'service_role can pair a device');
select lives_ok($$ insert into devices (id, store_id, name, paired_by)
                   values (gen_random_uuid(), pg_temp.org(), 'Till 2', pg_temp.staff()) $$,
  'and a second');
select lives_ok($$ insert into devices (id, store_id, name, paired_by)
                   values (gen_random_uuid(), pg_temp.org(), 'Till 3', pg_temp.staff()) $$,
  'and a third, reaching the ceiling');

select throws_ok($$ insert into devices (id, store_id, name, paired_by)
                    values (gen_random_uuid(), pg_temp.org(), 'Till 4', pg_temp.staff()) $$,
  'P0001', 'LIMIT_EXCEEDED: devices (max 3)',
  'the fourth is refused EVEN FOR service_role -- RLS would never have caught this');

reset role;

-- Retiring one frees a slot. Pairing always inserts a new row and unpairing
-- only stamps unpaired_at, so counting history would penalise a store for
-- replacing a broken terminal.
update devices set unpaired_at = now()
 where store_id = pg_temp.org() and name = 'Till 2';

set local role service_role;
select lives_ok($$ insert into devices (id, store_id, name, paired_by)
                   values (gen_random_uuid(), pg_temp.org(), 'Till 2 replacement', pg_temp.staff()) $$,
  'unpairing a device frees its slot -- history does not count against them');
select is((select count(*)::int from devices
            where store_id = pg_temp.org() and unpaired_at is null), 3,
  'and they are back at exactly the ceiling');
reset role;

-- -----------------------------------------------------------------------------
-- Unlimited really is unlimited
-- -----------------------------------------------------------------------------
update core.organization_modules set limits = '{}'::jsonb
 where organization_id = pg_temp.org() and module_code = 'INVENTORY';

select lives_ok($$ insert into warehouses (store_id, name, is_default)
                   select pg_temp.org(), 'No ceiling at all', false $$,
  'an empty limits object means no ceiling -- as ENTERPRISE ships');

-- -----------------------------------------------------------------------------
-- Other tenants are unaffected by one tenant's ceiling
-- -----------------------------------------------------------------------------
insert into auth.users (id, email, raw_user_meta_data) values
  ('fb000000-0000-4000-8000-000000000002', 'limit.other@test.local',
   '{"store_name":"Other Limit Store","owner_name":"Other"}');

select lives_ok($$
  insert into warehouses (store_id, name, is_default)
  select id, 'Theirs', false from stores where name = 'Other Limit Store'
$$, 'a different tenant is counted separately');

select * from finish();
rollback;
