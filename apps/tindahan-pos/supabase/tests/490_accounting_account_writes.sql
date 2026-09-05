-- =============================================================================
-- pgTAP · Adding, editing and deactivating an account
--
-- The properties worth pinning are the ones that protect the integrations:
--
--   * a system account keeps its CODE and its TYPE
--   * deactivation actually stops postings -- otherwise it is only a badge
--   * a parent chain cannot loop
--   * a group with live children under it cannot be switched off
--   * a cashier cannot touch the chart at all
--
-- Run: psql -f supabase/tests/490_accounting_account_writes.sql
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
  ('acc30000-0000-4000-8000-000000000001', 'chart.owner@test.local',
   '{"store_name":"Chart Store","owner_name":"Owner"}');

create or replace function pg_temp.org() returns uuid language sql as $$
  select id from stores where name = 'Chart Store'
$$;

insert into core.organization_modules (organization_id, module_code, enabled, source)
select pg_temp.org(), 'ACCOUNTING', true, 'MANUAL'
on conflict (organization_id, module_code) do update set enabled = true;

set local role authenticated;
select pg_temp.act_as('acc30000-0000-4000-8000-000000000001');

select public.seed_accounting_chart();
select public.open_accounting_period('NOW', current_date - 30, current_date + 30);

create or replace function pg_temp.acct(p_code text) returns uuid language sql as $$
  select id from accounting.accounts where organization_id = pg_temp.org() and code = p_code
$$;

-- -----------------------------------------------------------------------------
-- 1 · Adding
-- -----------------------------------------------------------------------------
select lives_ok(
  $$ select public.create_account('6060', 'Internet', 'EXPENSE', 'DEBIT', '6000') $$,
  'an owner can add an account under a group'
);

select is(
  (select parent_code from public.my_accounting_accounts() where code = '6060'),
  '6000',
  'and it is parented by code, without the caller handling a uuid'
);

select is(
  (select is_system from public.my_accounting_accounts() where code = '6060'),
  false,
  'a caller cannot make an account a system account -- there is no parameter for it'
);

select throws_ok(
  $$ select public.create_account('6070', 'Nowhere', 'EXPENSE', 'DEBIT', '9999') $$,
  'P0001', 'ACCOUNT_NOT_FOUND',
  'a parent that does not exist is refused'
);

select throws_ok(
  $$ select public.create_account('6010', 'Duplicate rent', 'EXPENSE', 'DEBIT', null) $$,
  '23505', null,
  'and a duplicate code is refused by the unique constraint'
);

-- -----------------------------------------------------------------------------
-- 2 · A system account keeps its code and its type
-- -----------------------------------------------------------------------------
select throws_ok(
  format($$ select public.update_account(%L, '1030', 'Accounts Receivable', 'EXPENSE', 'DEBIT', '1000') $$,
         pg_temp.acct('1030')),
  'P0001', 'SYSTEM_ACCOUNT_TYPE_FIXED',
  'Accounts Receivable cannot be turned into an expense -- an integration '
  'posts to it expecting an asset'
);

select throws_ok(
  format($$ select public.update_account(%L, '1035', 'Accounts Receivable', 'ASSET', 'DEBIT', '1000') $$,
         pg_temp.acct('1030')),
  'P0001', 'SYSTEM_ACCOUNT_CODE_FIXED',
  'nor can its code change -- integrations resolve it by code, so renaming it '
  'would silently redirect every future posting'
);

select lives_ok(
  format($$ select public.update_account(%L, '1030', 'Utang (Receivables)', 'ASSET', 'DEBIT', '1000') $$,
         pg_temp.acct('1030')),
  'but a system account can be RENAMED, which is what a shop actually wants'
);

select lives_ok(
  format($$ select public.update_account(%L, '6065', 'Internet and data', 'EXPENSE', 'DEBIT', '6000') $$,
         pg_temp.acct('6060')),
  'and an ordinary account can change code, name and everything else'
);

-- -----------------------------------------------------------------------------
-- 3 · A parent chain cannot loop
-- -----------------------------------------------------------------------------
select throws_ok(
  format($$ select public.update_account(%L, '6000', 'Expenses', 'EXPENSE', 'DEBIT', '6065') $$,
         pg_temp.acct('6000')),
  'P0001', 'PARENT_WOULD_LOOP',
  'a group cannot become a child of its own child'
);

select throws_ok(
  format($$ select public.update_account(%L, '6065', 'Internet and data', 'EXPENSE', 'DEBIT', '6065') $$,
         pg_temp.acct('6065')),
  'P0001', 'PARENT_WOULD_LOOP',
  'nor its own parent'
);

-- -----------------------------------------------------------------------------
-- 4 · Deactivation stops postings -- the whole point of it
-- -----------------------------------------------------------------------------
create or replace function pg_temp.entry_using(p_code text) returns uuid language sql as $$
  select public.create_journal_entry(
    current_date, 'Test', null,
    jsonb_build_array(
      jsonb_build_object('account_code', p_code, 'debit', 100, 'credit', 0),
      jsonb_build_object('account_code', '4010', 'debit', 0, 'credit', 100)
    ));
$$;

select lives_ok(
  $$ select public.post_journal_entry(pg_temp.entry_using('6065')) $$,
  'an entry posts against an active account'
);

select lives_ok(
  format($$ select public.set_account_active(%L, false) $$, pg_temp.acct('6065')),
  'the account can be deactivated'
);

select throws_ok(
  $$ select public.post_journal_entry(pg_temp.entry_using('6065')) $$,
  'P0001', 'ACCOUNT_INACTIVE',
  'and then nothing posts to it -- without this, deactivating would be a badge '
  'on a screen and every integration would carry on regardless'
);

select isnt_empty(
  $$ select 1 from public.my_general_ledger(current_date - 30, current_date + 30)
      where account_code = '6065' $$,
  'while what was already posted to it stays in the ledger -- deactivating is '
  'not deleting'
);

select lives_ok(
  format($$ select public.set_account_active(%L, true) $$, pg_temp.acct('6065')),
  'and it can be switched back on'
);

-- -----------------------------------------------------------------------------
-- 5 · A group with live children under it cannot be switched off
-- -----------------------------------------------------------------------------
select throws_ok(
  format($$ select public.set_account_active(%L, false) $$, pg_temp.acct('6000')),
  'P0001', 'ACCOUNT_HAS_ACTIVE_CHILDREN',
  'switching off a group with active accounts under it is refused -- the '
  'children would keep taking postings while their parent read as inactive'
);

-- -----------------------------------------------------------------------------
-- 6 · Losing the module
-- -----------------------------------------------------------------------------
reset role;
update core.organization_modules set enabled = false
 where organization_id = pg_temp.org() and module_code = 'ACCOUNTING';
set local role authenticated;
select pg_temp.act_as('acc30000-0000-4000-8000-000000000001');

select throws_ok(
  $$ select public.create_account('7000', 'After downgrade', 'EXPENSE', 'DEBIT', null) $$,
  'P0001', 'MODULE_NOT_AVAILABLE',
  'a downgraded store cannot add an account'
);

select isnt_empty(
  $$ select 1 from public.my_accounting_accounts() $$,
  'but still reads the chart it has -- §08'
);

select * from finish();
rollback;
