-- =============================================================================
-- pgTAP · A customer's balance and credit limit are not writable by the client
--
-- checkout_sale() reads customers.balance and customers.credit_limit to decide
-- whether a utang sale is allowed. Until 20260903090000 the only UPDATE policy
-- on the table was column-unrestricted, so the store admin -- the party the
-- credit decision is made about -- could PATCH either column directly and
-- either clear a debt or lift their own ceiling, leaving no trace.
--
-- The property under test is two-sided, and the second half matters as much
-- as the first: the direct write is refused AND the supported paths still
-- work. A guard that also breaks record_credit_payment has not fixed
-- anything, it has moved the outage.
--
-- Run: psql -f supabase/tests/380_customer_balance_read_only.sql
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
  ('cb000000-0000-4000-8000-00000000c001', 'ledger.owner@test.local',
   '{"store_name":"Ledger Test Store","owner_name":"Ledger Owner"}');

create or replace function pg_temp.store() returns uuid language sql as $$
  select id from stores where name = 'Ledger Test Store'
$$;

-- Seeded as the owner, before dropping to a client role: this is the state a
-- real store reaches through sales, and the only way to reach it now.
insert into customers (id, store_id, name, phone, credit_limit, balance)
  select 'cb000000-0000-4000-8000-00000000d001', pg_temp.store(),
         'Aling Nena', '09170000001', 1000, 500;

-- Pinned rather than looked up by name: one of the assertions below renames
-- this customer to prove name is still editable, which would leave a
-- name-based helper returning null for everything after it.
create or replace function pg_temp.customer() returns uuid language sql as $$
  select 'cb000000-0000-4000-8000-00000000d001'::uuid
$$;

set local role authenticated;
select pg_temp.act_as('cb000000-0000-4000-8000-00000000c001');

-- -----------------------------------------------------------------------------
-- The direct writes are refused
-- -----------------------------------------------------------------------------
select throws_ok(
  format('update customers set balance = 0 where id = %L', pg_temp.customer()),
  'CUSTOMER_BALANCE_READ_ONLY',
  'an admin cannot clear a utang balance with a direct write'
);

select throws_ok(
  format('update customers set balance = balance - 100 where id = %L', pg_temp.customer()),
  'CUSTOMER_BALANCE_READ_ONLY',
  'and cannot shave it down either -- any change is refused, not just a reset'
);

select throws_ok(
  format('update customers set credit_limit = 99999 where id = %L', pg_temp.customer()),
  'CUSTOMER_CREDIT_LIMIT_READ_ONLY',
  'an admin cannot raise the ceiling the credit check is made against'
);

select is(
  (select balance from customers where id = pg_temp.customer()),
  500::numeric,
  'the balance is unchanged after all three attempts'
);

-- -----------------------------------------------------------------------------
-- INSERT is covered too -- otherwise the same attack just moves one step earlier
-- -----------------------------------------------------------------------------
select throws_ok(
  format('insert into customers (store_id, name, balance) values (%L, %L, -5000)',
         pg_temp.store(), 'Opening Balance Trick'),
  'CUSTOMER_BALANCE_READ_ONLY',
  'a customer cannot be created with a negative opening balance'
);

-- -----------------------------------------------------------------------------
-- The supported paths are untouched
-- -----------------------------------------------------------------------------
select lives_ok(
  format('update customers set name = %L, phone = %L where id = %L',
         'Aling Nena Reyes', '09170000002', pg_temp.customer()),
  'the columns that were always the admin''s to edit still are'
);

select lives_ok(
  format('insert into customers (store_id, name, credit_limit) values (%L, %L, 800)',
         pg_temp.store(), 'Mang Tonyo'),
  'addCustomer still works -- a credit limit is set when the customer is created'
);

select is(
  (select balance from customers where store_id = pg_temp.store() and name = 'Mang Tonyo'),
  0::numeric,
  'and that customer starts at zero'
);

-- The one that would make this fix worse than the defect if it failed.
select is(
  (select new_balance from record_credit_payment(pg_temp.customer(), 200, 'bayad')),
  300::numeric,
  'record_credit_payment still moves the balance -- the RPC path is not blocked'
);

select is(
  (select balance from customers where id = pg_temp.customer()),
  300::numeric,
  'and the customer row actually moved'
);

select * from finish();
rollback;
