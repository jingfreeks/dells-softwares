-- =============================================================================
-- pgTAP · A stock adjustment leaves a record
--
-- Stock level is the quantity behind cost of goods sold, so an adjustment
-- that nobody can trace is the one inventory operation an examiner would
-- reasonably ask about. adjust_product_stock() wrote nothing to audit_log
-- until 20260902100000 (issue #427), and nothing failed when it didn't --
-- which is exactly how it survived unnoticed while void, price change,
-- reprint and settings edits all gained records around it.
--
-- The property under test is not "an audit row exists". It is "the row says
-- what the level was before" -- an audit that records only the new value
-- cannot answer the question it exists to answer.
--
-- Run: psql -f supabase/tests/210_stock_adjustment_audit.sql
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
  ('ad000000-0000-4000-8000-00000000a001', 'adj.owner@test.local',
   '{"store_name":"Adjust Test Store","owner_name":"Adjust Owner"}');

create or replace function pg_temp.store() returns uuid language sql as $$
  select id from stores where name = 'Adjust Test Store'
$$;

insert into categories (store_id, name) select pg_temp.store(), 'Adjust Cat';
insert into products (store_id, name, price, stock, category_id)
  select pg_temp.store(), 'Adjust Sardinas', 20, 40,
         (select id from categories where store_id = pg_temp.store() and name = 'Adjust Cat');

create or replace function pg_temp.product() returns uuid language sql as $$
  select id from products where store_id = pg_temp.store() and name = 'Adjust Sardinas'
$$;

set local role authenticated;
select pg_temp.act_as('ad000000-0000-4000-8000-00000000a001');

-- -----------------------------------------------------------------------------
-- The adjustment still works exactly as it did
-- -----------------------------------------------------------------------------
select is(
  (select new_stock from adjust_product_stock(pg_temp.product(), 15, 'delivery from supplier')),
  55,
  'the adjustment still applies the delta and returns the new level'
);

select is(
  (select stock from products where id = pg_temp.product()),
  55,
  'and the product row actually moved'
);

-- -----------------------------------------------------------------------------
-- ...and now leaves a record
-- -----------------------------------------------------------------------------
select isnt_empty(
  $$ select 1 from audit_log
      where action = 'stock_adjusted'
        and entity_type = 'product' $$,
  'the adjustment is recorded in audit_log'
);

select is(
  (select previous_value->>'stock' from audit_log
    where action = 'stock_adjusted' and new_value->>'delta' = '15'),
  '40',
  'the record says what the level was before -- the point of the whole row'
);

select is(
  (select new_value->>'stock' from audit_log
    where action = 'stock_adjusted' and new_value->>'delta' = '15'),
  '55',
  'and what it became'
);

select is(
  (select new_value->>'delta' from audit_log
    where action = 'stock_adjusted' and new_value->>'delta' = '15'),
  '15',
  'and by how much, so a correction is distinguishable from a recount'
);

select is(
  (select reason from audit_log
    where action = 'stock_adjusted' and new_value->>'delta' = '15'),
  'delivery from supplier',
  'the operator''s reason is carried through'
);

select is(
  (select actor_id from audit_log
    where action = 'stock_adjusted' and new_value->>'delta' = '15'),
  'ad000000-0000-4000-8000-00000000a001'::uuid,
  'attributed to the staff member who made it, not to the definer'
);

-- -----------------------------------------------------------------------------
-- The old two-argument call still works, and is audited too
-- -----------------------------------------------------------------------------
select is(
  (select new_stock from adjust_product_stock(pg_temp.product(), -5)),
  50,
  'the two-argument form still resolves -- p_reason defaults'
);

select is(
  (select count(*)::int from audit_log where action = 'stock_adjusted'),
  2,
  'and it is audited as well -- no unaudited path survived the change'
);

-- Selected by its delta, not by time: both rows are written inside this
-- one transaction, so created_at is identical for both and "the latest
-- row" is not a thing the database can order.
select is(
  (select previous_value->>'stock' from audit_log
    where action = 'stock_adjusted' and new_value->>'delta' = '-5'),
  '55',
  'the second record reads from the level the first one left behind'
);

-- -----------------------------------------------------------------------------
-- A refused adjustment records nothing
-- -----------------------------------------------------------------------------
select throws_ok(
  $$ select adjust_product_stock('00000000-0000-4000-8000-0000000000ff'::uuid, 5) $$,
  'Product not found in this store',
  'an adjustment against another store''s product is still refused'
);

select is(
  (select count(*)::int from audit_log where action = 'stock_adjusted'),
  2,
  'and leaves no record -- the log holds what happened, not what was attempted'
);

select * from finish();
rollback;
