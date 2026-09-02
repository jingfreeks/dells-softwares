-- =============================================================================
-- pgTAP · The drawer variance counts every cash movement
--
-- The variance is the number a shop owner reads to decide whether a cashier
-- is short, so the property under test is not "a variance is produced" -- it
-- is "the expected figure accounts for every way cash entered or left the
-- drawer". Before 20260902170000 it counted the opening float and cash sales
-- only, so a shift that collected utang reported an overage and one that
-- refunded reported a shortage (issue #452).
--
-- The asymmetry is why this is asserted rather than eyeballed: P500 of
-- collected utang would mask P500 genuinely missing, which is the direction
-- that costs someone their job.
--
-- Note on timestamps: now() is frozen for a transaction, so every row
-- inserted here would otherwise share one instant and the session's
-- `created_at >= v_session.created_at` window would match the *other*
-- shift's sales too. Each fixture is given an explicit time so the two
-- shifts are genuinely disjoint -- which is what the function's window
-- assumes in production, where they are hours apart.
--
-- Run: psql -f supabase/tests/360_drawer_variance.sql
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
  ('da000000-0000-4000-8000-00000000d001', 'drawer.owner@test.local',
   '{"store_name":"Drawer Test Store","owner_name":"Drawer Owner"}');

create or replace function pg_temp.store() returns uuid language sql as $$
  select id from stores where name = 'Drawer Test Store'
$$;

create or replace function pg_temp.staff() returns uuid language sql as $$
  select id from staff where store_id = pg_temp.store() limit 1
$$;

insert into customers (store_id, name)
  select pg_temp.store(), 'Drawer Test Customer';

-- -----------------------------------------------------------------------------
-- A shift that only sold for cash: the original formula was already right
-- here, and must stay right.
-- -----------------------------------------------------------------------------
insert into cashier_sessions (token, store_id, staff_id, created_by, opening_float, expires_at, created_at)
  values ('drawer-token-1', pg_temp.store(), pg_temp.staff(), pg_temp.staff(), 1000,
          now() + interval '1 day', now() - interval '6 hours');

insert into sales (store_id, cashier_id, total, payment_type, status, receipt_number, created_at)
  values (pg_temp.store(), pg_temp.staff(), 250, 'cash', 'completed', 'DRW-000001',
          now() - interval '5 hours');

set local role authenticated;
select pg_temp.act_as('da000000-0000-4000-8000-00000000d001');
select lives_ok($$ select end_cashier_session('drawer-token-1', 1250) $$,
  'a cash-only shift closes');
reset role;

select is(
  (select variance from cashier_sessions where token = 'drawer-token-1'),
  0::numeric,
  'float 1000 + cash sales 250, counted 1250 -- no variance'
);

-- -----------------------------------------------------------------------------
-- A shift that also collected utang and gave a refund.
-- -----------------------------------------------------------------------------
-- A second shift, starting after the first one's sale.
insert into cashier_sessions (token, store_id, staff_id, created_by, opening_float, expires_at, created_at)
  values ('drawer-token-2', pg_temp.store(), pg_temp.staff(), pg_temp.staff(), 1000,
          now() + interval '1 day', now() - interval '3 hours');

insert into sales (store_id, cashier_id, total, payment_type, status, receipt_number, created_at)
  values (pg_temp.store(), pg_temp.staff(), 200, 'cash', 'completed', 'DRW-000002',
          now() - interval '2 hours');

-- Cash in: a customer settles their utang at the counter.
insert into credit_payments (store_id, customer_id, amount, created_by, resulting_balance, created_at)
  select pg_temp.store(),
         (select id from customers where store_id = pg_temp.store()),
         500, pg_temp.staff(), 0, now() - interval '2 hours';

-- Cash out: money handed back.
insert into refunds (store_id, sale_id, actor_id, total_amount, reason, created_at)
  select pg_temp.store(),
         (select id from sales where receipt_number = 'DRW-000002'),
         pg_temp.staff(), 100, 'test refund', now() - interval '1 hour';

set local role authenticated;
select pg_temp.act_as('da000000-0000-4000-8000-00000000d001');
-- 1000 float + 200 cash sales + 500 utang collected - 100 refunded = 1600.
select lives_ok($$ select end_cashier_session('drawer-token-2', 1600) $$,
  'a shift with utang and a refund closes');
reset role;

select is(
  (select variance from cashier_sessions where token = 'drawer-token-2'),
  0::numeric,
  'a correctly counted drawer shows no variance once utang and refunds are counted'
);

select is(
  (select expected_closing from cashier_sessions where token = 'drawer-token-2'),
  1600::numeric,
  'expected = float + cash sales + utang collected - refunds'
);

-- The regression this replaced: the old formula gave 1000 + 200 = 1200, so a
-- correctly counted 1600 drawer looked P400 OVER. Worse in the other
-- direction -- a cashier P400 short would have counted 1200 and looked exact.
select isnt(
  (select expected_closing from cashier_sessions where token = 'drawer-token-2'),
  1200::numeric,
  'and is not the old float-plus-cash-sales figure, which was wrong by the '
  'utang collected and the refund given'
);

-- -----------------------------------------------------------------------------
-- The components are recorded, so a disputed variance can be explained.
-- -----------------------------------------------------------------------------
select is(
  (select (new_value->>'credit_payments')::numeric from audit_log
    where action = 'cashier_session_ended'
      and new_value->>'expected_closing' = '1600'
    limit 1),
  500::numeric,
  'the audit row shows the utang collected, not just the result'
);

select is(
  (select (new_value->>'refunds')::numeric from audit_log
    where action = 'cashier_session_ended'
      and new_value->>'expected_closing' = '1600'
    limit 1),
  100::numeric,
  'and the refund given'
);

-- -----------------------------------------------------------------------------
-- Skipping the count still records nothing and computes nothing.
-- -----------------------------------------------------------------------------
insert into cashier_sessions (token, store_id, staff_id, created_by, opening_float, expires_at, created_at)
  values ('drawer-token-3', pg_temp.store(), pg_temp.staff(), pg_temp.staff(), 1000,
          now() + interval '1 day', now() - interval '30 minutes');

set local role authenticated;
select pg_temp.act_as('da000000-0000-4000-8000-00000000d001');
select lives_ok($$ select end_cashier_session('drawer-token-3') $$,
  'a shift can still be ended without a count');
reset role;

select is(
  (select variance from cashier_sessions where token = 'drawer-token-3'),
  null::numeric,
  'skipping the count leaves no variance rather than inventing a zero'
);

select * from finish();
rollback;
