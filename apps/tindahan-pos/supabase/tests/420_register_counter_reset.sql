-- =============================================================================
-- pgTAP · Resetting a register's accumulating totals
--
-- XZ-READINGS-DESIGN.md §10 question 5, answered: a reset is a platform action.
-- The reset counter is the field an examiner uses to detect a register that
-- quietly started counting again from zero, so who can reach it IS the control
-- (§7). A store owner cannot reset their own register.
--
-- Three properties, and the third is the one that would be easy to get wrong:
--
--   the shop cannot reset itself, and a reset without a reason is refused;
--   the accumulation restarts and the counter is carried by EVERY later
--   reading, not only the first;
--   the reset does not move the period boundary -- sales made between the last
--   Z and the reset are still counted, rather than falling into no reading at
--   all.
--
-- Run: psql -f supabase/tests/420_register_counter_reset.sql
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
  ('6e000000-0000-4000-8000-00000000b001', 'reset.owner@test.local',
   '{"store_name":"Reset Store","owner_name":"Reset Owner"}');

-- The platform engineer. A separate identity, because the whole point is that
-- the shop's own admin cannot do this.
insert into auth.users (id, email) values
  ('6e000000-0000-4000-8000-00000000b002', 'reset.engineer@test.local');

-- Captured into a temp table while still postgres, and read from there.
-- Looking it up in `stores` would work for the shop's own admin and return
-- NULL for the platform engineer, who is not staff of this store and cannot
-- see the row -- which is the whole point of the RLS on it. The first version
-- of this suite did that and passed NULL into the reset, which the function
-- correctly refused as "no such store".
create temporary table t_store as
  select id from stores where name = 'Reset Store';

-- The temp table belongs to postgres, and the assertions below run as
-- `authenticated`, which otherwise cannot read it.
grant select on t_store to authenticated;

create or replace function pg_temp.store() returns uuid language sql as $$
  select id from t_store
$$;

insert into categories (store_id, name) select pg_temp.store(), 'Canned';
insert into products (store_id, name, price, stock, category_id)
  select pg_temp.store(), 'Sardinas', 20, 500,
         (select id from categories where store_id = pg_temp.store() limit 1);

create or replace function pg_temp.sale(p_total numeric, p_receipt text)
returns uuid language sql as $$
  insert into sales (store_id, cashier_id, total, payment_type, status,
                     receipt_number, created_at, occurred_at)
  values (pg_temp.store(), '6e000000-0000-4000-8000-00000000b001', p_total,
          'cash', 'completed', p_receipt, clock_timestamp(), clock_timestamp())
  returning id;
$$;

select pg_temp.sale(100, 'OR-1001');

-- -----------------------------------------------------------------------------
-- The shop closes a day normally
-- -----------------------------------------------------------------------------
set local role authenticated;
select pg_temp.act_as('6e000000-0000-4000-8000-00000000b001');

create temporary table t_z1 as select * from take_reading('Z');
select is((select grand_total from t_z1), 100.00::numeric, 'the accumulation starts at the first period');
select is((select reset_counter from t_z1), 0, 'and no reset has happened');

-- -----------------------------------------------------------------------------
-- The shop cannot reset itself
-- -----------------------------------------------------------------------------
select throws_ok(
  format($$ select platform_reset_register_counter(%L, null, 'trying it on') $$, pg_temp.store()),
  'P0001', 'UNAUTHORIZED_ACTION',
  'a store admin cannot reset their own register -- the control is who can reach it'
);

-- -----------------------------------------------------------------------------
-- Nor can a platform admin without MFA, or without a reason
-- -----------------------------------------------------------------------------
reset role;
insert into core.platform_admins (user_id, scope, status)
  values ('6e000000-0000-4000-8000-00000000b002', 'ENGINEER', 'ACTIVE');
set local role authenticated;
select pg_temp.act_as('6e000000-0000-4000-8000-00000000b002');

select throws_ok(
  format($$ select platform_reset_register_counter(%L, null, 'no mfa yet') $$, pg_temp.store()),
  'P0001', 'UNAUTHORIZED_ACTION',
  'and a rostered engineer who has not verified MFA is still refused'
);

reset role;
update core.platform_admins set mfa_verified_at = now()
 where user_id = '6e000000-0000-4000-8000-00000000b002';
set local role authenticated;
select pg_temp.act_as('6e000000-0000-4000-8000-00000000b002');

select throws_ok(
  format($$ select platform_reset_register_counter(%L, null, '   ') $$, pg_temp.store()),
  'P0001', 'VALIDATION_FAILED: a reset needs a reason',
  'a reset with no reason is refused -- an unexplained reset is what this field exists to expose'
);

-- -----------------------------------------------------------------------------
-- The reset itself
-- -----------------------------------------------------------------------------
select lives_ok(
  format($$ select platform_reset_register_counter(%L, null, 'tablet replaced', 'BIR-2026-014') $$,
         pg_temp.store()),
  'an MFA-verified engineer may reset, with a reason'
);

select is(
  (select reset_counter from register_resets where store_id = pg_temp.store()),
  1,
  'the first reset is number 1'
);

select is(
  (select authority_reference from register_resets where store_id = pg_temp.store()),
  'BIR-2026-014',
  'and the directive reference is kept when there is one'
);

select is(
  (select count(*)::int from core.platform_audit_logs
    where action = 'register_counter_reset' and entity_id = pg_temp.store()),
  1,
  'the reset appears in the platform audit trail'
);

-- Append-only: correcting a reset means recording another one.
select throws_ok(
  format($$ update register_resets set reason = 'changed my mind' where store_id = %L $$, pg_temp.store()),
  'REGISTER_RESETS_APPEND_ONLY',
  'a recorded reset cannot be edited afterwards'
);

-- -----------------------------------------------------------------------------
-- What the next readings say
-- -----------------------------------------------------------------------------
reset role;
select pg_temp.sale(60, 'OR-1002');
set local role authenticated;
select pg_temp.act_as('6e000000-0000-4000-8000-00000000b001');

create temporary table t_z2 as select * from take_reading('Z');

select is((select grand_total from t_z2), 60.00::numeric,
  'the accumulation restarts from the reset -- 60, not 160');
select is((select reset_counter from t_z2), 1, 'and the reading carries the reset counter');
select is((select transaction_count from t_z2), 1,
  'the sale made after the last Z is still counted -- a reset does not move the period');

select is((select grand_total from t_z1), 100.00::numeric,
  'the Z taken before the reset is untouched, as it was true when taken');

reset role;
select pg_temp.sale(25, 'OR-1003');
set local role authenticated;
select pg_temp.act_as('6e000000-0000-4000-8000-00000000b001');

create temporary table t_z3 as select * from take_reading('Z');

select is((select reset_counter from t_z3), 1,
  'every later reading carries the counter too, not only the first after the reset'
);
select is((select grand_total from t_z3), 85.00::numeric,
  'and the new accumulation keeps accumulating'
);

select * from finish();
rollback;
