-- =============================================================================
-- pgTAP · You may be stopped from starting, never from finishing
--
-- 20260815116000 settled this for utang. 20260815117000 settles it for the two
-- state machines that had the same trap and hid it better: a purchase order
-- stuck at `submitted` and a stock count stuck at `open`, neither able to
-- reach a terminal state once the capability was withdrawn -- and neither
-- raising anything, because an UPDATE whose policy does not match is a silent
-- no-op rather than an error.
--
-- The properties, in the order they would hurt:
--
--   1. work already in flight can always be driven to a close
--   2. CANCELLING still works -- the one action that exists for abandoning
--   3. NEW work is still refused, or the entitlement means nothing
--   4. reads survive throughout (§08)
--   5. a SUSPENDED tenant is still stopped, because that is temporary and
--      nothing is trapped by waiting
--
-- Run: psql -f supabase/tests/270_finish_in_flight.sql
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
  ('fa700000-0000-4000-8000-000000000001', 'flight@test.local',
   '{"store_name":"In Flight Store","owner_name":"Owner"}');

create or replace function pg_temp.org() returns uuid language sql as $$
  select id from stores where name = 'In Flight Store'
$$;

-- Work started while the store still holds both capabilities.
insert into purchase_orders (store_id, warehouse_id, status, created_by)
select pg_temp.org(), w.id, 'submitted', 'fa700000-0000-4000-8000-000000000001'
from warehouses w where w.store_id = pg_temp.org() and w.is_default;

insert into inventory_counts (store_id, warehouse_id, status, created_by)
select pg_temp.org(), w.id, 'open', 'fa700000-0000-4000-8000-000000000001'
from warehouses w where w.store_id = pg_temp.org() and w.is_default;

-- And now the plan changes underneath them.
update core.organization_features set enabled = false
 where organization_id = pg_temp.org()
   and feature_code in ('inventory.purchase_orders', 'inventory.stock_count');

set local role authenticated;
select pg_temp.act_as('fa700000-0000-4000-8000-000000000001');

-- -----------------------------------------------------------------------------
-- 4 first -- §08, because everything else is worthless if this fails
-- -----------------------------------------------------------------------------
select isnt_empty($$ select 1 from purchase_orders where store_id = pg_temp.org() $$,
  'the order they raised is still theirs to read');
select isnt_empty($$ select 1 from inventory_counts where store_id = pg_temp.org() $$,
  'and so is the count they started');

-- -----------------------------------------------------------------------------
-- 3 · new work is still refused
-- -----------------------------------------------------------------------------
select throws_ok($$
  insert into purchase_orders (store_id, warehouse_id, status, created_by)
  select pg_temp.org(), w.id, 'draft', auth.uid()
  from warehouses w where w.store_id = pg_temp.org() and w.is_default
$$, '42501', null, 'a NEW purchase order is still refused -- the entitlement still means something');

select throws_ok($$
  insert into inventory_counts (store_id, warehouse_id, status, created_by)
  select pg_temp.org(), w.id, 'open', auth.uid()
  from warehouses w where w.store_id = pg_temp.org() and w.is_default
$$, '42501', null, 'and so is a NEW stock count');

-- -----------------------------------------------------------------------------
-- 1 and 2 · what is already open can be finished
--
-- Asserted on ROW COUNT, not on the absence of an error. That is the whole
-- lesson of this migration: the broken version raised nothing at all and
-- reported success while changing nothing, so lives_ok() would have passed
-- against the very bug being fixed.
-- -----------------------------------------------------------------------------
update purchase_orders set status = 'received' where store_id = pg_temp.org();
select is(
  (select count(*)::int from purchase_orders
    where store_id = pg_temp.org() and status = 'received'),
  1,
  'the submitted order can be driven to received');

update purchase_orders set status = 'cancelled' where store_id = pg_temp.org();
select is(
  (select count(*)::int from purchase_orders
    where store_id = pg_temp.org() and status = 'cancelled'),
  1,
  'and cancelling works -- the one action that exists for abandoning work');

update inventory_counts set status = 'closed', closed_at = now()
 where store_id = pg_temp.org();
select is(
  (select count(*)::int from inventory_counts
    where store_id = pg_temp.org() and status = 'closed'),
  1,
  'and the open count can finally be closed');

-- -----------------------------------------------------------------------------
-- 5 · suspension is different, and still stops them
--
-- Losing a feature is a permanent change in what the tenant bought, so they
-- must be able to wind down. A suspension is temporary: they settle up and
-- carry on where they left off, and nothing is trapped by waiting.
-- -----------------------------------------------------------------------------
reset role;
insert into purchase_orders (store_id, warehouse_id, status, created_by)
select pg_temp.org(), w.id, 'submitted', 'fa700000-0000-4000-8000-000000000001'
from warehouses w where w.store_id = pg_temp.org() and w.is_default;

update core.organization_subscriptions set status = 'SUSPENDED'
 where organization_id = pg_temp.org();

set local role authenticated;
select pg_temp.act_as('fa700000-0000-4000-8000-000000000001');

update purchase_orders set status = 'cancelled'
 where store_id = pg_temp.org() and status = 'submitted';
select is(
  (select count(*)::int from purchase_orders
    where store_id = pg_temp.org() and status = 'submitted'),
  1,
  'a SUSPENDED tenant cannot move an order -- suspension is a billing state, '
  || 'not a downgrade, and waiting costs them nothing');

select isnt_empty($$ select 1 from purchase_orders where store_id = pg_temp.org() $$,
  'and they can still read every one of them');

select * from finish();
rollback;
