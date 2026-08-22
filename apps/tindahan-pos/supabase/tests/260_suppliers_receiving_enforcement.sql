-- =============================================================================
-- pgTAP · Suppliers and receiving are finally guarded
--
-- These two were the last capabilities in the POS that the server sold and did
-- not withhold. Until 20260815114000 their write policies checked the store
-- and the caller's role and nothing else -- no module, no grace ladder, no
-- feature. It did not matter while every plan sold everything; the tier split
-- made FREE omit both, and an unenforced entitlement is not an entitlement.
--
-- Three separate gates now stand in front of each write, and each is tested on
-- its own, because a test that revokes all three at once cannot tell which one
-- is actually holding the door:
--
--   1. the FEATURE       -- inventory.suppliers / inventory.receiving
--   2. the MODULE        -- INVENTORY, which FREE does not grant either
--   3. the GRACE LADDER  -- a SUSPENDED tenant may not write
--
-- And the fourth property, which outranks all of them: §08 says reads and
-- exports survive every state. Whatever is switched off, the tenant can still
-- open the page and read what they already recorded.
--
-- Run: psql -f supabase/tests/260_suppliers_receiving_enforcement.sql
-- =============================================================================
begin;
set local search_path = public, core, extensions;
select * from no_plan();

create or replace function pg_temp.act_as(p_user uuid)
returns void language sql as $$
  select set_config('request.jwt.claims',
                    json_build_object('sub', p_user, 'role', 'authenticated')::text, true);
$$;

insert into auth.users (id, email, raw_user_meta_data) values
  ('ec300000-0000-4000-8000-000000000001', 'sr.owner@test.local',
   '{"store_name":"Supplier Store","owner_name":"Owner"}');

create or replace function pg_temp.org() returns uuid language sql as $$
  select id from stores where name = 'Supplier Store'
$$;

-- Something that exists BEFORE anything is withdrawn, so the read-survives
-- assertions have a real row to find rather than passing on an empty table.
insert into suppliers (store_id, name) select pg_temp.org(), 'Existing Supplier';

set local role authenticated;
select pg_temp.act_as('ec300000-0000-4000-8000-000000000001');

-- -----------------------------------------------------------------------------
-- Baseline: a BASIC store holds both, so both writes work
-- -----------------------------------------------------------------------------
select lives_ok(
  $$ insert into suppliers (store_id, name) select pg_temp.org(), 'Bagong Supplier' $$,
  'a BASIC store can add a supplier -- BASIC sells inventory.suppliers'
);

select lives_ok(
  $$ insert into receiving_entries (store_id, warehouse_id, supplier, received_on, created_by)
     select pg_temp.org(), w.id, 'Aling Nena Trading', current_date, auth.uid()
     from warehouses w where w.store_id = pg_temp.org() and w.is_default limit 1 $$,
  'and can record a delivery -- BASIC sells inventory.receiving'
);

-- -----------------------------------------------------------------------------
-- Gate 1 · the feature
-- -----------------------------------------------------------------------------
reset role;
update core.organization_features set enabled = false
 where organization_id = pg_temp.org() and feature_code = 'inventory.suppliers';
set local role authenticated;
select pg_temp.act_as('ec300000-0000-4000-8000-000000000001');

select throws_ok(
  $$ insert into suppliers (store_id, name) select pg_temp.org(), 'Refused Supplier' $$,
  '42501', null,
  'withdrawing inventory.suppliers refuses the write'
);

select isnt_empty(
  $$ select 1 from suppliers where store_id = pg_temp.org() $$,
  'but every supplier already on file is still readable -- §08, data is never '
  'destroyed on downgrade'
);

select lives_ok(
  $$ insert into receiving_entries (store_id, warehouse_id, supplier, received_on, created_by)
     select pg_temp.org(), w.id, 'Aling Nena Trading', current_date, auth.uid()
     from warehouses w where w.store_id = pg_temp.org() and w.is_default limit 1 $$,
  'and receiving is untouched -- the two features are withheld independently'
);

reset role;
update core.organization_features set enabled = true
 where organization_id = pg_temp.org() and feature_code = 'inventory.suppliers';
set local role authenticated;
select pg_temp.act_as('ec300000-0000-4000-8000-000000000001');

select lives_ok(
  $$ insert into suppliers (store_id, name) select pg_temp.org(), 'Restored Supplier' $$,
  'granting it back restores the write immediately'
);

-- -----------------------------------------------------------------------------
-- Gate 2 · the module
--
-- FREE grants POS and not INVENTORY, so this is the gate a FREE tenant would
-- actually meet -- before the feature check ever came into it.
-- -----------------------------------------------------------------------------
reset role;
update core.organization_modules set enabled = false
 where organization_id = pg_temp.org() and module_code = 'INVENTORY';
set local role authenticated;
select pg_temp.act_as('ec300000-0000-4000-8000-000000000001');

select throws_ok(
  $$ insert into suppliers (store_id, name) select pg_temp.org(), 'No Module' $$,
  '42501', null,
  'dropping the INVENTORY module refuses suppliers even while the feature is held'
);

select throws_ok(
  $$ insert into receiving_entries (store_id, warehouse_id, supplier, received_on, created_by)
     select pg_temp.org(), w.id, 'Aling Nena Trading', current_date, auth.uid()
     from warehouses w where w.store_id = pg_temp.org() and w.is_default limit 1 $$,
  '42501', null,
  'and refuses receiving too'
);

select isnt_empty(
  $$ select 1 from suppliers where store_id = pg_temp.org() $$,
  'and STILL the existing suppliers read back'
);

reset role;
update core.organization_modules set enabled = true
 where organization_id = pg_temp.org() and module_code = 'INVENTORY';

-- -----------------------------------------------------------------------------
-- Gate 3 · the grace ladder
--
-- This one was never applied to these tables at all, so before 114000 a
-- suspended tenant could go on receiving stock indefinitely.
-- -----------------------------------------------------------------------------
update core.organization_subscriptions set status = 'SUSPENDED'
 where organization_id = pg_temp.org();
set local role authenticated;
select pg_temp.act_as('ec300000-0000-4000-8000-000000000001');

select throws_ok(
  $$ insert into suppliers (store_id, name) select pg_temp.org(), 'Suspended' $$,
  '42501', null,
  'a SUSPENDED tenant cannot add a supplier'
);

select throws_ok(
  $$ insert into receiving_entries (store_id, warehouse_id, supplier, received_on, created_by)
     select pg_temp.org(), w.id, 'Aling Nena Trading', current_date, auth.uid()
     from warehouses w where w.store_id = pg_temp.org() and w.is_default limit 1 $$,
  '42501', null,
  'nor receive stock -- which they could have done indefinitely before 114000'
);

select isnt_empty(
  $$ select 1 from suppliers where store_id = pg_temp.org() $$,
  'but reads survive suspension, which is the entire point of the ladder'
);

select isnt_empty(
  $$ select 1 from receiving_entries where store_id = pg_temp.org() $$,
  'including every delivery already recorded'
);

reset role;
update core.organization_subscriptions set status = 'ACTIVE'
 where organization_id = pg_temp.org();
set local role authenticated;
select pg_temp.act_as('ec300000-0000-4000-8000-000000000001');

select lives_ok(
  $$ insert into suppliers (store_id, name) select pg_temp.org(), 'Reinstated' $$,
  'and paying up restores the write'
);

select * from finish();
rollback;
