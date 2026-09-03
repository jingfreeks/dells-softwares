-- =============================================================================
-- pgTAP · Receiving commits or it does not happen (issue #462)
--
-- receiveStock() used to raise stock line by line and THEN write the receiving
-- record. The two steps are guarded by different conditions --
-- adjust_product_stock() wants inventory.product.manage, while the
-- receiving_entries insert additionally wants the inventory.receiving feature,
-- the INVENTORY module and writes_allowed -- so a supervisor at a store whose
-- feature had been revoked would inflate stock and then be told the save
-- failed. Wrong stock, no record explaining it, and a retry that added it
-- again.
--
-- The property under test is the one that made it a data-integrity bug rather
-- than an inconvenience: WHEN RECEIVING IS REFUSED, STOCK DOES NOT MOVE. Each
-- refusal below is followed by re-reading the stock level, because a guard
-- that rejects the call while leaving the side effect behind fixes nothing.
--
-- Run: psql -f supabase/tests/410_receive_stock_atomic.sql
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
  ('5e000000-0000-4000-8000-000000009001', 'receive.owner@test.local',
   '{"store_name":"Receiving Store","owner_name":"Receiving Owner"}');

create or replace function pg_temp.store() returns uuid language sql as $$
  select id from stores where name = 'Receiving Store'
$$;

insert into categories (store_id, name) select pg_temp.store(), 'Canned';
insert into products (store_id, name, price, stock, category_id)
  select pg_temp.store(), 'Sardinas', 22, 10,
         (select id from categories where store_id = pg_temp.store() limit 1);

create or replace function pg_temp.product() returns uuid language sql as $$
  select id from products where store_id = pg_temp.store() and name = 'Sardinas'
$$;

create or replace function pg_temp.stock() returns integer language sql as $$
  select stock from products where id = pg_temp.product()
$$;

create or replace function pg_temp.lines(p_qty integer) returns jsonb language sql as $$
  select jsonb_build_array(jsonb_build_object(
    'product_id', pg_temp.product(), 'product_name', 'Sardinas',
    'quantity', p_qty, 'cost_each', 15))
$$;

set local role authenticated;
select pg_temp.act_as('5e000000-0000-4000-8000-000000009001');

-- -----------------------------------------------------------------------------
-- The happy path still does everything the client used to do in pieces
-- -----------------------------------------------------------------------------
select lives_ok(
  $$ select receive_stock('Mega Distribution', current_date, pg_temp.lines(5), null, 'DR-42') $$,
  'a delivery is received'
);

select is(pg_temp.stock(), 15, 'stock moved by the delivered quantity');

select is(
  (select count(*)::int from receiving_entries where store_id = pg_temp.store()),
  1,
  'and the receiving entry exists'
);

select is(
  (select count(*)::int from receiving_lines rl
     join receiving_entries re on re.id = rl.receiving_entry_id
    where re.store_id = pg_temp.store()),
  1,
  'with its line'
);

select is(
  (select dr_number from receiving_entries where store_id = pg_temp.store()),
  'DR-42',
  'the DR number is kept'
);

-- The audit row is why stock still moves through adjust_product_stock() rather
-- than a direct update: a receiving that leaves no trace on the product is the
-- gap 20260902100000 closed.
select is(
  (select count(*)::int from audit_log
    where store_id = pg_temp.store() and action = 'stock_adjusted'),
  1,
  'and the stock movement is audited, with receiving named as the reason'
);

select ok(
  (select reason from audit_log
    where store_id = pg_temp.store() and action = 'stock_adjusted' limit 1) like 'Receiving%',
  'the reason says it was a receiving rather than a bare adjustment'
);

-- Moved server-side from the client, so it is asserted here now.
select lives_ok(
  $$ select receive_stock('   ', current_date, pg_temp.lines(1)) $$,
  'a blank supplier name is accepted'
);
-- Counted rather than ordered: created_at defaults to now(), which is frozen
-- for the whole transaction, so both receiving rows share it and "the most
-- recent" is not a question this test can ask.
select is(
  (select count(*)::int from receiving_entries
    where store_id = pg_temp.store() and supplier = 'Unspecified supplier'),
  1,
  'and recorded as an unspecified supplier rather than blank'
);

-- -----------------------------------------------------------------------------
-- The refusals. Each one re-reads the stock, which is the whole point.
-- -----------------------------------------------------------------------------
reset role;
update core.organization_features set enabled = false, source = 'MANUAL'
 where organization_id = pg_temp.store() and feature_code = 'inventory.receiving';
set local role authenticated;
select pg_temp.act_as('5e000000-0000-4000-8000-000000009001');

select throws_ok(
  $$ select receive_stock('Mega Distribution', current_date, pg_temp.lines(7)) $$,
  'P0001', 'FEATURE_NOT_ENABLED: inventory.receiving',
  'a store without the receiving feature is refused'
);

select is(pg_temp.stock(), 16,
  'and NOTHING was added to stock -- the defect was that this read 23');

reset role;
update core.organization_features set enabled = true
 where organization_id = pg_temp.store() and feature_code = 'inventory.receiving';
update core.organization_modules set enabled = false, source = 'MANUAL'
 where organization_id = pg_temp.store() and module_code = 'INVENTORY';
set local role authenticated;
select pg_temp.act_as('5e000000-0000-4000-8000-000000009001');

select throws_ok(
  $$ select receive_stock('Mega Distribution', current_date, pg_temp.lines(7)) $$,
  'P0001', 'MODULE_NOT_ENABLED: INVENTORY',
  'a store without the INVENTORY module is refused'
);

select is(pg_temp.stock(), 16, 'and again nothing moved');

reset role;
update core.organization_modules set enabled = true
 where organization_id = pg_temp.store() and module_code = 'INVENTORY';
update core.organization_subscriptions set status = 'SUSPENDED'
 where organization_id = pg_temp.store();
set local role authenticated;
select pg_temp.act_as('5e000000-0000-4000-8000-000000009001');

select throws_ok(
  $$ select receive_stock('Mega Distribution', current_date, pg_temp.lines(7)) $$,
  'P0001', 'ORG_WRITES_SUSPENDED',
  'a suspended store is refused'
);

select is(pg_temp.stock(), 16, 'and still nothing moved');

-- -----------------------------------------------------------------------------
-- Who may receive
-- -----------------------------------------------------------------------------
reset role;
update core.organization_subscriptions set status = 'ACTIVE'
 where organization_id = pg_temp.store();
update staff set role = 'cashier' where id = '5e000000-0000-4000-8000-000000009001';
set local role authenticated;
select pg_temp.act_as('5e000000-0000-4000-8000-000000009001');

select throws_ok(
  $$ select receive_stock('Mega Distribution', current_date, pg_temp.lines(7)) $$,
  'P0001', 'UNAUTHORIZED_ACTION',
  'a cashier cannot receive a delivery'
);

select is(pg_temp.stock(), 16, 'and a refused cashier moves no stock either');

select * from finish();
rollback;
