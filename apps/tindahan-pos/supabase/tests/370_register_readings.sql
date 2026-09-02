-- =============================================================================
-- pgTAP · register_readings -- the constraints that make it an artefact
--
-- Step 1 of XZ-READINGS-DESIGN.md is structure only, so what is worth testing
-- is precisely the structure: a reading that can be edited afterwards is a
-- cache of a recomputable view, not a closing artefact, and the whole reason
-- for the table is that the current Z-Reading changes when yesterday's sales
-- are voided.
--
-- The uniqueness case is the subtle one. device_id is the register and NULL
-- means the store's own machine, so the index coalesces it -- without that,
-- every browser reading would collide on a single null and a shop with no
-- paired device could never take a second Z.
--
-- Run: psql -f supabase/tests/370_register_readings.sql
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
  ('ae000000-0000-4000-8000-00000000a001'::uuid, 'reading.a@test.local',
   '{"store_name":"Reading Store A","owner_name":"Reading Owner A"}'),
  ('ae000000-0000-4000-8000-00000000a002'::uuid, 'reading.b@test.local',
   '{"store_name":"Reading Store B","owner_name":"Reading Owner B"}');

create or replace function pg_temp.store_a() returns uuid language sql as $$
  select id from stores where name = 'Reading Store A' $$;
create or replace function pg_temp.store_b() returns uuid language sql as $$
  select id from stores where name = 'Reading Store B' $$;
create or replace function pg_temp.staff_a() returns uuid language sql as $$
  select id from staff where store_id = pg_temp.store_a() limit 1 $$;

-- A paired device, so "the store's own register" and "a device" can be
-- told apart.
insert into devices (id, store_id, name)
  values ('dd000000-0000-4000-8000-00000000d001'::uuid, pg_temp.store_a(), 'Till 1');

create or replace function pg_temp.reading(
  p_kind text, p_counter integer, p_device uuid, p_grand numeric default 100
) returns uuid language sql as $$
  insert into register_readings (
    store_id, kind, z_counter, business_date, opened_at, grand_total,
    gross_sales, net_sales, total_discounts, vatable_sales, vat_amount,
    vat_exempt, zero_rated, transaction_count, voided_count, voided_total,
    refund_count, refund_total, device_id, taken_by
  ) values (
    pg_temp.store_a(), p_kind, p_counter, current_date, now(), p_grand,
    100, 100, 0, 100, 12, 0, 0, 1, 0, 0, 0, 0, p_device, pg_temp.staff_a()
  ) returning id;
$$;

-- -----------------------------------------------------------------------------
-- A reading cannot be changed once taken
-- -----------------------------------------------------------------------------
select lives_ok($$ select pg_temp.reading('Z', 1, null) $$, 'a Z reading can be taken');

select throws_ok(
  $$ update register_readings set grand_total = 999 where kind = 'Z' $$,
  'P0001', 'REGISTER_READINGS_APPEND_ONLY',
  'a reading cannot be updated -- an artefact that changes afterwards is not one'
);

select throws_ok(
  $$ delete from register_readings where kind = 'Z' $$,
  'P0001', 'REGISTER_READINGS_APPEND_ONLY',
  'nor deleted -- a gap in the counter must mean something happened, not that a row went away'
);

-- -----------------------------------------------------------------------------
-- Only a Z carries a counter
-- -----------------------------------------------------------------------------
select lives_ok($$ select pg_temp.reading('X', null, null) $$,
  'an X reading is taken without a counter');

select throws_ok(
  $$ select pg_temp.reading('X', 5, null) $$,
  '23514', null,
  'an X reading cannot carry a Z-counter'
);

select throws_ok(
  $$ select pg_temp.reading('Z', null, null) $$,
  '23514', null,
  'a Z reading cannot be taken without one'
);

-- -----------------------------------------------------------------------------
-- The counter is per register, and the store's own register is a register
-- -----------------------------------------------------------------------------
select throws_ok(
  $$ select pg_temp.reading('Z', 1, null) $$,
  '23505', null,
  'the same counter cannot be reused on the same register'
);

select lives_ok(
  $$ select pg_temp.reading('Z', 1, 'dd000000-0000-4000-8000-00000000d001'::uuid) $$,
  'but a paired device is a different register and starts its own sequence'
);

select throws_ok(
  $$ select pg_temp.reading('Z', 1, 'dd000000-0000-4000-8000-00000000d001'::uuid) $$,
  '23505', null,
  'and that register cannot reuse its own counter either'
);

select lives_ok($$ select pg_temp.reading('Z', 2, null) $$,
  'the store''s own register continues its sequence independently');

-- -----------------------------------------------------------------------------
-- The grand total cannot go backwards into nonsense
-- -----------------------------------------------------------------------------
select throws_ok(
  $$ select pg_temp.reading('Z', 3, null, -1) $$,
  '23514', null,
  'a negative grand total is refused -- the accumulation only ever grows'
);

-- -----------------------------------------------------------------------------
-- Isolation: readings are a tenant's own
-- -----------------------------------------------------------------------------
set local role authenticated;
select pg_temp.act_as('ae000000-0000-4000-8000-00000000a002'::uuid);
select is_empty(
  $$ select 1 from register_readings $$,
  'another store sees none of these readings'
);
reset role;

set local role authenticated;
select pg_temp.act_as('ae000000-0000-4000-8000-00000000a001'::uuid);
select isnt_empty(
  $$ select 1 from register_readings $$,
  'and the owning store sees its own -- the policy is not simply denying everyone'
);

select throws_ok(
  $$ insert into register_readings (
       store_id, kind, z_counter, business_date, opened_at, grand_total,
       gross_sales, net_sales, total_discounts, vatable_sales, vat_amount,
       vat_exempt, zero_rated, transaction_count, voided_count, voided_total,
       refund_count, refund_total, taken_by
     ) values (
       pg_temp.store_a(), 'Z', 99, current_date, now(), 1,
       1,1,0,1,0,0,0,1,0,0,0,0, pg_temp.staff_a()
     ) $$,
  '42501', null,
  'a client cannot write its own reading -- a client-computed closing artefact is not one'
);
reset role;

select * from finish();
rollback;
