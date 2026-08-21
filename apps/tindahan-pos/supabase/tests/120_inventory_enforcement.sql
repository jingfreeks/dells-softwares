-- =============================================================================
-- pgTAP · INVENTORY module enforcement -- allow AND deny, per §12
--
-- The property that makes this safe to ship is not "writes are blocked", it
-- is "writes are blocked AND reads are not". Architecture v1 §08 keeps
-- reading and exporting available in every subscription state, so a tenant
-- whose module lapses must never lose sight of their own records.
--
-- Run: psql -f supabase/tests/120_inventory_enforcement.sql
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
  ('cc000000-0000-4000-8000-00000000e001', 'enf.owner@test.local',
   '{"store_name":"Enforcement Test Store","owner_name":"Enf Owner"}');

create or replace function pg_temp.org() returns uuid language sql as $$
  select id from core.organizations where name = 'Enforcement Test Store'
$$;

-- This suite exercises module entitlement, not numeric limits, and its flow
-- legitimately creates a fourth warehouse -- which BASIC caps at 3 as of
-- 20260815102000. Lift the ceiling for this fixture so a limit failure can
-- never be mistaken for the gating failure being tested here. Limits have
-- their own suite, 170_plan_limits.
update core.organization_modules set limits = '{}'::jsonb
 where organization_id = pg_temp.org() and module_code = 'INVENTORY';

-- Something to read later, created while still entitled.
insert into warehouses (store_id, name, is_default)
  select pg_temp.org(), 'Back Room', false;

-- No grant needed here any more. These policies are only reachable by the API
-- roles, and 20260815101000 grants them for real -- so `authenticated` being
-- stopped below is RLS doing its job, not a missing privilege. Leaving the
-- compensating grant in would hide a regression in that migration.

-- -----------------------------------------------------------------------------
-- ALLOW: entitled tenant can write
-- -----------------------------------------------------------------------------
set local role authenticated;
select pg_temp.act_as('cc000000-0000-4000-8000-00000000e001');

select ok(public.current_store_has_module('INVENTORY'),
  'the store starts entitled to INVENTORY');
select lives_ok($$
  insert into warehouses (store_id, name, is_default)
  select id, 'Allowed While Entitled', false from stores
$$, 'an entitled tenant can create a warehouse');

reset role;

-- Seeded here, while the module is STILL HELD, so the read-survives assertion
-- further down has a real row to find rather than passing on an empty table.
insert into suppliers (store_id, name) select id, 'Aling Nena Trading' from stores;

-- -----------------------------------------------------------------------------
-- DENY: the same tenant, module switched off
-- -----------------------------------------------------------------------------
update core.organization_modules set enabled = false
 where organization_id = pg_temp.org() and module_code = 'INVENTORY';

set local role authenticated;
select pg_temp.act_as('cc000000-0000-4000-8000-00000000e001');

select ok(not public.current_store_has_module('INVENTORY'),
  'the module is now off');

select throws_ok($$
  insert into warehouses (store_id, name, is_default)
  select id, 'Should Be Blocked', false from stores
$$, '42501', null, 'creating a warehouse is refused');

select throws_ok($$
  insert into purchase_orders (store_id, warehouse_id, status, created_by)
  select s.id, w.id, 'draft', auth.uid()
  from stores s join warehouses w on w.store_id = s.id and w.is_default limit 1
$$, '42501', null, 'creating a purchase order is refused');

select throws_ok($$
  select transfer_stock(
    (select id from warehouses where is_default limit 1),
    (select id from warehouses where not is_default limit 1),
    (select id from products limit 1), 1)
$$, 'P0001', 'MODULE_NOT_ENABLED',
   'transfer_stock raises the real error code, not an opaque policy denial');

-- The point of §08: the data is still theirs.
select isnt_empty($$ select 1 from warehouses $$,
  'READS still work -- warehouses remain visible');
select isnt_empty($$ select 1 from warehouses where name = 'Back Room' $$,
  'including records created before the module lapsed');

-- Suppliers used to be the exception here: tindahan-pos exposes the table, so
-- gating it on the Inventory module would have broken a POS-only store, and
-- whether it belonged to the Inventory plan was recorded as an unmade pricing
-- decision. 20260815113000 made that decision -- inventory.suppliers is a
-- BASIC feature of the INVENTORY module -- and 20260815114000 enforced it.
-- core.feature_enabled() requires the owning module, so a tenant without
-- INVENTORY no longer holds the feature either.
select throws_ok($$
  insert into suppliers (store_id, name) select id, 'No Longer Allowed' from stores
$$, '42501', null,
   'suppliers now follow the module too -- the pricing decision was made in 113000');

select isnt_empty($$ select 1 from suppliers $$,
  'and the suppliers already on file remain readable -- §08 is unchanged');

reset role;

-- -----------------------------------------------------------------------------
-- Re-enabling restores writes
-- -----------------------------------------------------------------------------
update core.organization_modules set enabled = true
 where organization_id = pg_temp.org() and module_code = 'INVENTORY';

set local role authenticated;
select pg_temp.act_as('cc000000-0000-4000-8000-00000000e001');
select lives_ok($$
  insert into warehouses (store_id, name, is_default)
  select id, 'Allowed Again', false from stores
$$, 're-enabling the module restores write access');
reset role;

select * from finish();
rollback;
