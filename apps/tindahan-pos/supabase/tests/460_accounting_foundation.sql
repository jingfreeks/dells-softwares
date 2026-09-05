-- =============================================================================
-- pgTAP · Accounting foundation
--
-- ACCOUNTING has been in core.modules with is_sellable = true, and on the PRO
-- and ENTERPRISE plans, since 20260815093000. Nothing in the database had ever
-- mentioned it. This suite is what makes holding it -- and not holding it --
-- mean something.
--
-- The properties worth pinning:
--
--   * a store without the module cannot start a set of books
--   * a store WITH it can, once, idempotently
--   * withdrawing the module later refuses the next write and leaves every
--     existing account readable (§08 -- the rule 260 pins for suppliers)
--   * one tenant never sees another's chart
--   * an account an integration posts to cannot be deleted by anyone
--
-- Run: psql -f supabase/tests/460_accounting_foundation.sql
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
  ('acc00000-0000-4000-8000-000000000001', 'acct.owner@test.local',
   '{"store_name":"Books Store","owner_name":"Owner"}'),
  ('acc00000-0000-4000-8000-000000000002', 'other.owner@test.local',
   '{"store_name":"Other Store","owner_name":"Other"}');

create or replace function pg_temp.org() returns uuid language sql as $$
  select id from stores where name = 'Books Store'
$$;
create or replace function pg_temp.other_org() returns uuid language sql as $$
  select id from stores where name = 'Other Store'
$$;

create or replace function pg_temp.grant_accounting(p_org uuid, p_on boolean)
returns void language sql as $$
  insert into core.organization_modules (organization_id, module_code, enabled, source)
  values (p_org, 'ACCOUNTING', p_on, 'MANUAL')
  on conflict (organization_id, module_code)
    do update set enabled = p_on, source = 'MANUAL';
$$;

-- -----------------------------------------------------------------------------
-- 1 · Without the module, there are no books to start
-- -----------------------------------------------------------------------------
select pg_temp.grant_accounting(pg_temp.org(), false);

set local role authenticated;
select pg_temp.act_as('acc00000-0000-4000-8000-000000000001');

select throws_ok(
  $$ select public.seed_accounting_chart() $$,
  'P0001', 'MODULE_NOT_AVAILABLE',
  'a store without ACCOUNTING cannot install a chart of accounts'
);

select throws_ok(
  $$ insert into accounting.accounts (organization_id, code, name, type, normal_balance)
     select pg_temp.org(), '9999', 'Smuggled', 'ASSET', 'DEBIT' $$,
  '42501', null,
  'nor write one directly -- the policy refuses, not just the function'
);

-- -----------------------------------------------------------------------------
-- 2 · With the module, the starter chart installs once
-- -----------------------------------------------------------------------------
reset role;
select pg_temp.grant_accounting(pg_temp.org(), true);
set local role authenticated;
select pg_temp.act_as('acc00000-0000-4000-8000-000000000001');

select is(
  (select public.seed_accounting_chart()), 22,
  -- Sixteen, not fifteen, since C1 added 2030 Output VAT Payable: VAT
  -- collected is money held for the BIR and had nowhere to go before that.
  'the starter chart installs six groups and sixteen accounts'
);

select is(
  (select public.seed_accounting_chart()), 0,
  'and a second call adds nothing -- seeding is idempotent, not doubled'
);

select is(
  (select count(*)::int from public.my_accounting_accounts()), 22,
  'the reader returns every account'
);

select is(
  (select normal_balance from public.my_accounting_accounts() where code = '3020'),
  'DEBIT',
  'Owner''s Drawings is EQUITY yet debit-normal -- why normal_balance is not '
  'derived from the type'
);

select is(
  (select parent_code from public.my_accounting_accounts() where code = '1010'),
  '1000',
  'children are parented by code, without hard-coding a uuid'
);

-- -----------------------------------------------------------------------------
-- 3 · A system account cannot be deleted, by anyone
-- -----------------------------------------------------------------------------
select lives_ok(
  $$ delete from accounting.accounts
      where organization_id = pg_temp.org() and code = '6050' $$,
  'an ordinary account can be removed'
);

select is(
  (select count(*)::int from accounting.accounts
    where organization_id = pg_temp.org() and code = '1030'),
  1,
  'Accounts Receivable is still there after a delete attempt below'
);

select lives_ok(
  $$ delete from accounting.accounts
      where organization_id = pg_temp.org() and code = '1030' $$,
  'deleting a system account raises nothing -- RLS filters rather than throws'
);

select isnt_empty(
  $$ select 1 from accounting.accounts
      where organization_id = pg_temp.org() and code = '1030' $$,
  'but Accounts Receivable survives it: an account an integration posts to is '
  'deactivated, never deleted'
);

-- -----------------------------------------------------------------------------
-- 4 · Tenant isolation
-- -----------------------------------------------------------------------------
reset role;
select pg_temp.grant_accounting(pg_temp.other_org(), true);
insert into accounting.accounts (organization_id, code, name, type, normal_balance)
values (pg_temp.other_org(), '1010', 'Cash on Hand', 'ASSET', 'DEBIT');

set local role authenticated;
select pg_temp.act_as('acc00000-0000-4000-8000-000000000001');

select is(
  (select count(*)::int from accounting.accounts
    where organization_id = pg_temp.other_org()),
  0,
  'one tenant cannot see another tenant''s chart of accounts'
);

select throws_ok(
  $$ insert into accounting.accounts (organization_id, code, name, type, normal_balance)
     select pg_temp.other_org(), '4010', 'Planted', 'REVENUE', 'CREDIT' $$,
  '42501', null,
  'nor plant an account in it'
);

-- -----------------------------------------------------------------------------
-- 5 · §08 · losing the module refuses the next write and keeps every read
-- -----------------------------------------------------------------------------
reset role;
select pg_temp.grant_accounting(pg_temp.org(), false);
set local role authenticated;
select pg_temp.act_as('acc00000-0000-4000-8000-000000000001');

select throws_ok(
  $$ insert into accounting.accounts (organization_id, code, name, type, normal_balance)
     select pg_temp.org(), '6060', 'After downgrade', 'EXPENSE', 'DEBIT' $$,
  '42501', null,
  'a downgraded store cannot add to its books'
);

select is(
  (select count(*)::int from public.my_accounting_accounts()), 21,
  'but every account it already had stays readable -- a downgrade is not '
  'confiscation of records the business must keep'
);

select * from finish();
rollback;
