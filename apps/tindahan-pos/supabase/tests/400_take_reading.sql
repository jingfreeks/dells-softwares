-- =============================================================================
-- pgTAP · take_reading() -- the Z that stays what it was
--
-- 370 covers the table: its constraints and its refusal to be updated or
-- deleted. This covers the writer, and specifically the three properties that
-- make a reading a closing artefact rather than a cached report:
--
--   the Z-counter never repeats and never skips;
--   the grand total accumulates and cannot decrease, even across a void;
--   a sale that arrives after its period closed lands in the OPEN period and
--   is flagged, leaving the closed Z exactly as it was taken.
--
-- Timestamps use clock_timestamp(), not now(). now() is fixed for the whole
-- transaction, so seeding with it would put every sale and every reading at the
-- same instant, and "since the last Z" would separate nothing -- each sale would
-- fall into every later period and be counted again. That is exactly how the
-- first version of this suite failed. clock_timestamp() advances, so the
-- timeline is genuinely sequential. The one exception is the late entry, whose
-- occurred_at is deliberately in the past while its arrival is not.
--
-- Run: psql -f supabase/tests/400_take_reading.sql
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
  ('4e000000-0000-4000-8000-00000000f001', 'reading.owner@test.local',
   '{"store_name":"Reading Store","owner_name":"Reading Owner"}');

create or replace function pg_temp.store() returns uuid language sql as $$
  select id from stores where name = 'Reading Store'
$$;

-- Seeded as the owner: `sales` carries no INSERT policy at all, so this is the
-- only way to arrange a period without going through checkout_sale and its own
-- unrelated reasons to refuse.
create or replace function pg_temp.sale(
  p_total numeric, p_created timestamptz, p_occurred timestamptz, p_receipt text
) returns uuid language sql as $$
  insert into sales (store_id, cashier_id, total, payment_type, status,
                     receipt_number, created_at, occurred_at, vatable_sales,
                     vat_amount, discount_amount)
  values (pg_temp.store(), '4e000000-0000-4000-8000-00000000f001', p_total,
          'cash', 'completed', p_receipt, p_created, p_occurred,
          round(p_total / 1.12, 2), round(p_total - p_total / 1.12, 2), 0)
  returning id;
$$;

-- Two sales that belong to the register's first, never-closed period.
select pg_temp.sale(100, clock_timestamp(), clock_timestamp(), 'OR-0001');
select pg_temp.sale(150, clock_timestamp(), clock_timestamp(), 'OR-0002');

set local role authenticated;
select pg_temp.act_as('4e000000-0000-4000-8000-00000000f001');

-- -----------------------------------------------------------------------------
-- The first Z closes everything the register has ever taken
-- -----------------------------------------------------------------------------
create temporary table t_z1 as select * from take_reading('Z');

select is((select z_counter from t_z1), 1, 'the first Z on a register is counter 1');
select is((select transaction_count from t_z1), 2, 'it counts both sales');
select is((select net_sales from t_z1), 250.00::numeric, 'and their net');
select is((select grand_total from t_z1), 250.00::numeric,
  'the grand total starts from this register''s whole life, there being no earlier Z');
select is((select beginning_receipt from t_z1), 'OR-0001',
  'the first receipt of the period, ordered by arrival rather than by string');
select is((select ending_receipt from t_z1), 'OR-0002', 'and the last');
select is((select late_entry_count from t_z1), 0, 'nothing is late in a first period');

-- -----------------------------------------------------------------------------
-- A second period. Its sales arrive after the first Z closed.
-- -----------------------------------------------------------------------------
reset role;
select pg_temp.sale(60, clock_timestamp(), clock_timestamp(), 'OR-0003');
set local role authenticated;
select pg_temp.act_as('4e000000-0000-4000-8000-00000000f001');

create temporary table t_x as select * from take_reading('X');

select is((select z_counter from t_x), null, 'an X takes no counter');
select is((select transaction_count from t_x), 1,
  'and sees only the open period -- the closed one is not counted twice');
select is((select grand_total from t_x), 310.00::numeric,
  'an X shows what the accumulation would be if the register closed now');

-- The X must not have moved the baseline: the Z that follows has to see the
-- same period, or an X taken mid-shift would silently swallow it.
create temporary table t_z2 as select * from take_reading('Z');

select is((select z_counter from t_z2), 2, 'the next Z is counter 2 -- no skip from the X');
select is((select transaction_count from t_z2), 1,
  'and still sees the period the X did not close');
select is((select grand_total from t_z2), 310.00::numeric, 'the accumulation advances by the period');

select is(
  (select grand_total from t_z1),
  250.00::numeric,
  'and the first Z still reads exactly what it read -- nothing recomputed it'
);

-- -----------------------------------------------------------------------------
-- A late entry: it happened before the last Z, and arrived after it
-- -----------------------------------------------------------------------------
reset role;
select pg_temp.sale(40, clock_timestamp(), now() - interval '90 minutes', 'OR-0004');
set local role authenticated;
select pg_temp.act_as('4e000000-0000-4000-8000-00000000f001');

create temporary table t_z3 as select * from take_reading('Z');

select is((select late_entry_count from t_z3), 1,
  'a sale that occurred in a closed period is counted as a late entry');
select is((select late_entry_total from t_z3), 40.00::numeric, 'with its own total');
select is((select transaction_count from t_z3), 1,
  'and it is still counted in the period that received it -- the money is real');
select is((select grand_total from t_z3), 350.00::numeric,
  'so it reaches the accumulation, in the open period rather than the closed one');

-- -----------------------------------------------------------------------------
-- A void does not reach back, and cannot pull the accumulation down
-- -----------------------------------------------------------------------------
reset role;
update sales set status = 'voided', voided_at = clock_timestamp(),
                 voided_by = '4e000000-0000-4000-8000-00000000f001'
 where store_id = pg_temp.store() and receipt_number = 'OR-0001';
set local role authenticated;
select pg_temp.act_as('4e000000-0000-4000-8000-00000000f001');

create temporary table t_z4 as select * from take_reading('Z');

select is((select voided_count from t_z4), 1,
  'a void is an adjustment in the period it was made, not in the one it came from');
select is((select voided_total from t_z4), 100.00::numeric, 'recorded at its own value');
select ok(
  (select grand_total from t_z4) >= (select grand_total from t_z3),
  'and the accumulation does not decrease -- a falling grand total is what a reset check looks for'
);
select is((select grand_total from t_z1), 250.00::numeric,
  'the Z that contained the voided sale is untouched by the void');

-- -----------------------------------------------------------------------------
-- The counter is the register's, and a cashier may not close the books
-- -----------------------------------------------------------------------------
select is(
  (select count(*)::int from register_readings
    where store_id = pg_temp.store() and kind = 'Z'),
  4,
  'four Z readings, and'
);
select is(
  (select array_agg(z_counter order by z_counter)::int[] from register_readings
    where store_id = pg_temp.store() and kind = 'Z'),
  array[1, 2, 3, 4],
  'their counters run 1..4 with no repeat and no gap'
);

-- Demoting the existing staff row rather than adding one: inserting into
-- auth.users auto-provisions its own staff (and store), so a second user is
-- both a collision and a second tenant. 210_permission_unification changes a
-- role the same way.
reset role;
update staff set role = 'cashier' where id = '4e000000-0000-4000-8000-00000000f001';
set local role authenticated;
select pg_temp.act_as('4e000000-0000-4000-8000-00000000f001');

select throws_ok(
  $$ select take_reading('Z') $$,
  'P0001', 'UNAUTHORIZED_ACTION',
  'a cashier cannot close the register''s books'
);

select throws_ok(
  $$ select take_reading('Q') $$,
  'P0001', 'INVALID_READING_KIND',
  'and there are only two kinds of reading'
);

select * from finish();
rollback;
