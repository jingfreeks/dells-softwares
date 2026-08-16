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

-- And nothing outside the Inventory module was collaterally gated.
select lives_ok($$
  insert into suppliers (store_id, name) select id, 'Still Allowed' from stores
$$, 'suppliers are untouched -- tindahan-pos uses them too');

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
