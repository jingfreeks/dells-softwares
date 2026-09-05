-- =============================================================================
-- pgTAP · Utang payments and receivables aging
--
--   * a payment posts DR Cash / CR Accounts Receivable, once
--   * a credit sale and its payment net to nothing in the ledger
--   * aging is reconstructed oldest-first and lands in the right buckets
--   * customers.balance is the authority, and what cannot be aged is reported
--     as `unaged` rather than folded into a bucket
--   * a settled customer drops off the list entirely
--
-- Run: psql -f supabase/tests/510_accounting_receivables.sql
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
  ('acc50000-0000-4000-8000-000000000001', 'ar.owner@test.local',
   '{"store_name":"Utang Store","owner_name":"Owner"}');

create or replace function pg_temp.org() returns uuid language sql as $$
  select id from stores where name = 'Utang Store'
$$;

insert into core.organization_modules (organization_id, module_code, enabled, source)
select pg_temp.org(), 'ACCOUNTING', true, 'MANUAL'
on conflict (organization_id, module_code) do update set enabled = true;

insert into categories (store_id, name) select pg_temp.org(), 'Test';
insert into products (store_id, category_id, name, price, cost, stock)
select pg_temp.org(), c.id, 'Bigas', 50, 30, 100 from categories c where c.store_id = pg_temp.org();
insert into customers (store_id, name, credit_limit, balance)
values (pg_temp.org(), 'Aling Rosa', 5000, 0), (pg_temp.org(), 'Mang Ben', 5000, 0);

create or replace function pg_temp.cust(p_name text) returns uuid language sql as $$
  select id from customers where store_id = pg_temp.org() and name = p_name
$$;

-- Owner-side fixtures: sales, sale_items, credit_payments and customers.balance
-- are all closed to direct writes by RLS, because the POS owns them.
create or replace function pg_temp.credit_sale(p_customer uuid, p_total numeric, p_days_ago integer)
returns uuid language plpgsql security definer as $$
declare v_id uuid;
begin
  insert into sales (store_id, cashier_id, total, payment_type, status, created_at, customer_id,
                     vat_amount, vatable_sales, vat_exempt_sales, zero_rated_sales, discount_amount)
  values (pg_temp.org(), 'acc50000-0000-4000-8000-000000000001', p_total, 'credit', 'completed',
          now() - make_interval(days => p_days_ago), p_customer, 0, 0, 0, 0, 0)
  returning id into v_id;
  insert into sale_items (sale_id, product_id, name, quantity, price, line_total, cost_at_sale)
  select v_id, id, 'Bigas', 1, p_total, p_total, 30 from products
   where store_id = pg_temp.org() limit 1;
  update customers set balance = balance + p_total where id = p_customer;
  return v_id;
end $$;

create or replace function pg_temp.pay(p_customer uuid, p_amount numeric)
returns uuid language plpgsql security definer as $$
declare v_id uuid; v_bal numeric;
begin
  update customers set balance = balance - p_amount where id = p_customer
  returning balance into v_bal;
  insert into credit_payments (store_id, customer_id, amount, created_by, resulting_balance)
  values (pg_temp.org(), p_customer, p_amount, 'acc50000-0000-4000-8000-000000000001', v_bal)
  returning id into v_id;
  return v_id;
end $$;

set local role authenticated;
select pg_temp.act_as('acc50000-0000-4000-8000-000000000001');

select public.seed_accounting_chart();
select public.open_accounting_period('NOW', current_date - 400, current_date + 30);

create or replace function pg_temp.bal(p_code text) returns numeric language sql as $$
  select coalesce(sum(l.debit - l.credit), 0)
    from accounting.journal_lines l
    join accounting.accounts a on a.id = l.account_id
    join accounting.journal_entries e on e.id = l.entry_id
   where a.organization_id = pg_temp.org() and a.code = p_code and e.status in ('POSTED','REVERSED')
$$;

-- -----------------------------------------------------------------------------
-- 1 · A credit sale and its payment net to nothing
-- -----------------------------------------------------------------------------
select lives_ok(
  $$ select pg_temp.credit_sale(pg_temp.cust('Aling Rosa'), 500, 5) $$,
  'Aling Rosa buys ₱500 on utang'
);

select is(
  (select posted from public.post_sales_to_journal(current_date - 30, current_date)), 1,
  'the sale posts'
);
select is(pg_temp.bal('1030'), 500::numeric, 'Accounts Receivable is ₱500');

select lives_ok($$ select pg_temp.pay(pg_temp.cust('Aling Rosa'), 500) $$, 'she pays it off');

select is(
  (select posted from public.post_customer_payments_to_journal(current_date - 30, current_date)), 1,
  'the payment posts'
);
select is(pg_temp.bal('1030'), 0::numeric, 'and Accounts Receivable is back to nil');
select is(pg_temp.bal('1010'), 500::numeric, 'while Cash on Hand holds the ₱500');

select is(
  (select posted from public.post_customer_payments_to_journal(current_date - 30, current_date)), 0,
  'running it again posts nothing'
);

-- -----------------------------------------------------------------------------
-- 2 · A settled customer is not on the receivables list
-- -----------------------------------------------------------------------------
select is(
  (select count(*)::int from public.my_receivables() where customer_name = 'Aling Rosa'), 0,
  'a customer who owes nothing is off the list entirely, rather than sitting '
  'at ₱0.00 among the people who do owe'
);

-- -----------------------------------------------------------------------------
-- 3 · Aging, reconstructed oldest-first
-- -----------------------------------------------------------------------------
select lives_ok($$ select pg_temp.credit_sale(pg_temp.cust('Mang Ben'), 100, 100) $$, 'a charge 100 days old');
select lives_ok($$ select pg_temp.credit_sale(pg_temp.cust('Mang Ben'), 200, 45)  $$, 'one 45 days old');
select lives_ok($$ select pg_temp.credit_sale(pg_temp.cust('Mang Ben'), 300, 10)  $$, 'one 10 days old');

select is(
  (select outstanding from public.my_receivables() where customer_name = 'Mang Ben'),
  600::numeric,
  'the total comes from customers.balance, which is the authority'
);

select is(
  (select d90_plus from public.my_receivables() where customer_name = 'Mang Ben'),
  100::numeric, 'the 100-day-old charge ages into 90+'
);
select is(
  (select d31_60 from public.my_receivables() where customer_name = 'Mang Ben'),
  200::numeric, 'the 45-day-old one into 31-60'
);
select is(
  (select d1_30 from public.my_receivables() where customer_name = 'Mang Ben'),
  300::numeric, 'and the 10-day-old one into 1-30'
);
select is(
  (select oldest_unpaid from public.my_receivables() where customer_name = 'Mang Ben'),
  (current_date - 100), 'the oldest unpaid charge is dated'
);

-- -----------------------------------------------------------------------------
-- 4 · A payment clears the OLDEST charge first
-- -----------------------------------------------------------------------------
select lives_ok($$ select pg_temp.pay(pg_temp.cust('Mang Ben'), 100) $$, 'he pays ₱100');

select is(
  (select d90_plus from public.my_receivables() where customer_name = 'Mang Ben'),
  0::numeric,
  'the oldest charge is the one that clears -- what a shop does in practice, '
  'and what a ledger assumes absent an instruction'
);
select is(
  (select d31_60 from public.my_receivables() where customer_name = 'Mang Ben'),
  200::numeric, 'while the 45-day-old charge is untouched'
);

-- -----------------------------------------------------------------------------
-- 5 · What cannot be aged is reported, not hidden
-- -----------------------------------------------------------------------------
reset role;
-- An opening balance: money owed with no sale behind it, which is exactly what
-- a shop migrating onto the POS starts with.
update customers set balance = balance + 250 where id = pg_temp.cust('Mang Ben');
set local role authenticated;
select pg_temp.act_as('acc50000-0000-4000-8000-000000000001');

select is(
  (select unaged from public.my_receivables() where customer_name = 'Mang Ben'),
  250::numeric,
  'a balance with no sale behind it is reported as unaged rather than folded '
  'into a bucket -- a number that cannot be aged is more useful said out loud'
);

select is(
  (select outstanding from public.my_receivables() where customer_name = 'Mang Ben'),
  750::numeric,
  'and the total still matches customers.balance'
);

-- -----------------------------------------------------------------------------
-- 6 · A voided credit sale is not aged
-- -----------------------------------------------------------------------------
reset role;
update sales set status = 'voided', voided_at = now()
 where store_id = pg_temp.org() and total = 300 and payment_type = 'credit';
update customers set balance = balance - 300 where id = pg_temp.cust('Mang Ben');
set local role authenticated;
select pg_temp.act_as('acc50000-0000-4000-8000-000000000001');

select is(
  (select d1_30 from public.my_receivables() where customer_name = 'Mang Ben'),
  0::numeric,
  'a voided credit sale stops being aged -- the POS reverses the balance, so '
  'counting it would age money nobody owes'
);

-- -----------------------------------------------------------------------------
-- 7 · Entitlement
-- -----------------------------------------------------------------------------
reset role;
update core.organization_modules set enabled = false
 where organization_id = pg_temp.org() and module_code = 'ACCOUNTING';
set local role authenticated;
select pg_temp.act_as('acc50000-0000-4000-8000-000000000001');

select throws_ok(
  $$ select public.post_customer_payments_to_journal(current_date - 30, current_date) $$,
  'P0001', 'MODULE_NOT_AVAILABLE',
  'a store without the module posts nothing'
);

select isnt_empty(
  $$ select 1 from public.my_receivables() $$,
  'but still reads its receivables -- §08'
);

select * from finish();
rollback;
