-- =============================================================================
-- pgTAP · The journal engine
--
-- Four rules, all of which must hold against the DATABASE rather than against
-- a form, because a form is not where the money is:
--
--   1. a posted entry balances                     planning §9
--   2. a posted entry cannot be edited or deleted  planning §12
--   3. a posted entry lands in an OPEN period      planning §13
--   4. one source transaction posts once           planning §11
--
-- Every assertion below attacks the rule DIRECTLY -- writing the table, not
-- calling the helper -- because the helper is the part a future integration
-- will bypass.
--
-- Run: psql -f supabase/tests/480_accounting_journal.sql
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
  ('acc20000-0000-4000-8000-000000000001', 'journal.owner@test.local',
   '{"store_name":"Journal Store","owner_name":"Owner"}');

create or replace function pg_temp.org() returns uuid language sql as $$
  select id from stores where name = 'Journal Store'
$$;

insert into core.organization_modules (organization_id, module_code, enabled, source)
select pg_temp.org(), 'ACCOUNTING', true, 'MANUAL'
on conflict (organization_id, module_code) do update set enabled = true;

set local role authenticated;
select pg_temp.act_as('acc20000-0000-4000-8000-000000000001');

select public.seed_accounting_chart();
select public.open_accounting_period('FY2026-09', date '2026-09-01', date '2026-09-30');

create or replace function pg_temp.acct(p_code text) returns uuid language sql as $$
  select id from accounting.accounts where organization_id = pg_temp.org() and code = p_code
$$;

create or replace function pg_temp.cash_sale(p_amount numeric, p_on date default date '2026-09-15')
returns uuid language sql as $$
  select public.create_journal_entry(
    p_on, 'Cash sale', null,
    jsonb_build_array(
      jsonb_build_object('account_code', '1010', 'debit',  p_amount, 'credit', 0),
      jsonb_build_object('account_code', '4010', 'debit',  0, 'credit', p_amount)
    ));
$$;

-- -----------------------------------------------------------------------------
-- 1 · A draft may be unbalanced; a POSTED entry may not
-- -----------------------------------------------------------------------------
select lives_ok(
  $$ select public.create_journal_entry(date '2026-09-15', 'Half an entry', null,
       jsonb_build_array(jsonb_build_object('account_code','1010','debit',500,'credit',0))) $$,
  'a one-sided draft is allowed -- the design delivers the unbalanced create '
  'screen as a real state, so imbalance is legal until you post'
);

create or replace function pg_temp.half() returns uuid language sql as $$
  select id from accounting.journal_entries
   where organization_id = pg_temp.org() and description = 'Half an entry'
$$;

select throws_ok(
  format($$ select public.post_journal_entry(%L) $$, pg_temp.half()),
  'P0001', 'ENTRY_NEEDS_TWO_LINES',
  'posting a one-line entry is refused'
);

select lives_ok(
  $$ insert into accounting.journal_lines
       (organization_id, entry_id, line_no, account_id, debit, credit)
     select pg_temp.org(), pg_temp.half(), 2, pg_temp.acct('4010'), 0, 300 $$,
  'a second line can be added to a draft'
);

select throws_ok(
  format($$ select public.post_journal_entry(%L) $$, pg_temp.half()),
  'P0001', 'ENTRY_NOT_BALANCED',
  'but 500 debit against 300 credit still will not post -- planning §9'
);

-- Rule 1, attacked directly: not through the function, straight at the column.
select throws_ok(
  format($$ update accounting.journal_entries
               set status='POSTED', entry_no='CHEAT', posted_by=auth.uid(), posted_at=now()
             where id = %L $$, pg_temp.half()),
  'P0001', 'ENTRY_NOT_BALANCED',
  'and writing the status column directly is refused too -- the rule is in the '
  'database, not in post_journal_entry()'
);

-- -----------------------------------------------------------------------------
-- 2 · A line is a debit or a credit, never both and never neither
-- -----------------------------------------------------------------------------
select throws_ok(
  $$ insert into accounting.journal_lines
       (organization_id, entry_id, line_no, account_id, debit, credit)
     select pg_temp.org(), pg_temp.half(), 9, pg_temp.acct('1010'), 100, 100 $$,
  '23514', null,
  'a line cannot be both a debit and a credit'
);

select throws_ok(
  $$ insert into accounting.journal_lines
       (organization_id, entry_id, line_no, account_id, debit, credit)
     select pg_temp.org(), pg_temp.half(), 9, pg_temp.acct('1010'), 0, 0 $$,
  '23514', null,
  'nor neither'
);

-- -----------------------------------------------------------------------------
-- 3 · A balanced entry posts, and takes its number then
-- -----------------------------------------------------------------------------
select is(
  (select public.post_journal_entry(pg_temp.cash_sale(500))),
  'JE-000001',
  'a balanced entry posts and is numbered'
);

select is(
  (select public.post_journal_entry(pg_temp.cash_sale(250))),
  'JE-000002',
  'and the next one takes the next number -- the unpostable draft consumed none'
);

-- -----------------------------------------------------------------------------
-- 4 · A posted entry is a record, not a document
-- -----------------------------------------------------------------------------
create or replace function pg_temp.posted() returns uuid language sql as $$
  select id from accounting.journal_entries
   where organization_id = pg_temp.org() and entry_no = 'JE-000001'
$$;

select throws_ok(
  format($$ update accounting.journal_entries set description = 'Edited'
             where id = %L $$, pg_temp.posted()),
  'P0001', 'ENTRY_IS_POSTED',
  'a posted entry cannot be edited -- planning §12'
);

select throws_ok(
  format($$ update accounting.journal_lines set debit = 9999
             where entry_id = %L and line_no = 1 $$, pg_temp.posted()),
  'P0001', 'ENTRY_IS_POSTED',
  'nor can its lines, which is the loophole that would unbalance a posted entry'
);

select throws_ok(
  format($$ delete from accounting.journal_lines where entry_id = %L $$, pg_temp.posted()),
  'P0001', 'ENTRY_IS_POSTED',
  'nor can a line be deleted out of one'
);

select lives_ok(
  format($$ delete from accounting.journal_entries where id = %L $$, pg_temp.posted()),
  'deleting a posted entry raises nothing -- the policy filters it, since only '
  'a DRAFT is deletable'
);

select isnt_empty(
  format($$ select 1 from accounting.journal_entries where id = %L $$, pg_temp.posted()),
  'and it is still there'
);

select lives_ok(
  format($$ delete from accounting.journal_entries where id = %L $$, pg_temp.half()),
  'a draft, by contrast, can be deleted -- it was never a record'
);

-- -----------------------------------------------------------------------------
-- 5 · Rule 3 · a closed period refuses the post
-- -----------------------------------------------------------------------------
create or replace function pg_temp.sept() returns uuid language sql as $$
  select id from accounting.periods where organization_id = pg_temp.org() and code = 'FY2026-09'
$$;

select throws_ok(
  $$ select public.post_journal_entry(pg_temp.cash_sale(100, date '2026-10-05')) $$,
  'P0001', 'PERIOD_NOT_OPEN',
  'an entry dated outside every period will not post'
);

select lives_ok(
  format($$ select public.close_accounting_period(%L, 'CLOSE FY2026-09') $$, pg_temp.sept()),
  'close September'
);

select throws_ok(
  $$ select public.post_journal_entry(pg_temp.cash_sale(100)) $$,
  'P0001', 'PERIOD_NOT_OPEN',
  'and once September is closed, a September entry will not post either'
);

select lives_ok(
  format($$ select public.reopen_accounting_period(%L, 'more testing') $$, pg_temp.sept()),
  'reopen it for the rest of the suite'
);

-- -----------------------------------------------------------------------------
-- 6 · Rule 4 · one source transaction posts once
-- -----------------------------------------------------------------------------
create or replace function pg_temp.from_sale(p_sale uuid) returns uuid language plpgsql as $$
declare v_id uuid;
begin
  insert into accounting.journal_entries
    (organization_id, entry_date, description, source_type, source_id, created_by)
  values (pg_temp.org(), date '2026-09-20', 'Sale', 'SALE', p_sale, auth.uid())
  returning id into v_id;
  insert into accounting.journal_lines (organization_id, entry_id, line_no, account_id, debit, credit)
  values (pg_temp.org(), v_id, 1, pg_temp.acct('1010'), 700, 0),
         (pg_temp.org(), v_id, 2, pg_temp.acct('4010'), 0, 700);
  return v_id;
end $$;

create or replace function pg_temp.sale_id() returns uuid language sql as $$
  select 'aaaaaaaa-0000-4000-8000-00000000f001'::uuid
$$;

select lives_ok(
  $$ select public.post_journal_entry(pg_temp.from_sale(pg_temp.sale_id())) $$,
  'a sale posts once'
);

select throws_ok(
  $$ select public.post_journal_entry(pg_temp.from_sale(pg_temp.sale_id())) $$,
  '23505', null,
  'and the same sale cannot post twice -- planning §11, enforced by a unique '
  'index rather than by an integration remembering'
);

-- -----------------------------------------------------------------------------
-- 7 · Reversal
-- -----------------------------------------------------------------------------
create or replace function pg_temp.to_reverse() returns uuid language sql as $$
  select id from accounting.journal_entries
   where organization_id = pg_temp.org() and entry_no = 'JE-000002'
$$;

select throws_ok(
  format($$ select public.reverse_journal_entry(%L, '  ') $$, pg_temp.to_reverse()),
  'P0001', 'REASON_REQUIRED',
  'reversing without a reason is refused'
);

-- The reversal is dated today, so today needs an open period. Written
-- conditionally because the fixture dates are September 2026: run inside that
-- month, today is already covered by FY2026-09 and opening another would
-- overlap; run outside it, one is needed. An unconditional insert here passes
-- today and fails next month, which is the kind of test that gets deleted
-- rather than understood.
create or replace function pg_temp.ensure_today_open() returns void language plpgsql as $x$
begin
  if not accounting.posting_allowed(pg_temp.org(), current_date) then
    perform public.open_accounting_period('CURRENT', current_date, current_date);
  end if;
end $x$;

select lives_ok(
  $$ select pg_temp.ensure_today_open() $$,
  'today is in an open period, so a reversal has somewhere to land'
);

select lives_ok(
  format($$ select public.reverse_journal_entry(%L, 'Wrong customer') $$, pg_temp.to_reverse()),
  'reversing with a reason works'
);

select is(
  (select status from accounting.journal_entries where entry_no = 'JE-000002'),
  'REVERSED',
  'the original reads as reversed'
);

select is(
  (select sum(debit) - sum(credit) from accounting.journal_lines l
    join accounting.journal_entries e on e.id = l.entry_id
   where e.organization_id = pg_temp.org()
     and e.id in (select id from accounting.journal_entries where entry_no = 'JE-000002')
        or e.reverses_id in (select id from accounting.journal_entries where entry_no = 'JE-000002')),
  0::numeric,
  'and the pair nets to nothing -- the reversal mirrors the original rather '
  'than recalculating it, so the two cannot disagree'
);

select throws_ok(
  format($$ select public.reverse_journal_entry(%L, 'again') $$, pg_temp.to_reverse()),
  'P0001', 'ENTRY_NOT_POSTED',
  'a reversed entry cannot be reversed a second time'
);

-- -----------------------------------------------------------------------------
-- 8 · The ledger shows posted work only
-- -----------------------------------------------------------------------------
select is(
  (select count(*)::int from public.my_general_ledger(date '2026-09-01', date '2026-09-30')
    where entry_no is null),
  0,
  'the general ledger contains no drafts -- what the design says on the page'
);

select isnt_empty(
  $$ select 1 from public.my_general_ledger(date '2026-09-01', date '2026-09-30')
      where account_code = '4010' $$,
  'and does contain the revenue side of the posted sales'
);

-- -----------------------------------------------------------------------------
-- 9 · Losing the module refuses the next post and keeps the ledger readable
-- -----------------------------------------------------------------------------
reset role;
update core.organization_modules set enabled = false
 where organization_id = pg_temp.org() and module_code = 'ACCOUNTING';
set local role authenticated;
select pg_temp.act_as('acc20000-0000-4000-8000-000000000001');

select throws_ok(
  $$ select public.post_journal_entry(pg_temp.cash_sale(10)) $$,
  'P0001', 'MODULE_NOT_AVAILABLE',
  'a downgraded store cannot even draft a new entry, let alone post one'
);

-- And the policy refuses it too, which is the claim that matters: the function
-- above could be bypassed, a policy cannot.
select throws_ok(
  $$ insert into accounting.journal_entries
       (organization_id, entry_date, description, created_by)
     select pg_temp.org(), date '2026-09-15', 'Straight at the table', auth.uid() $$,
  '42501', null,
  'writing the table directly is refused as well'
);

select isnt_empty(
  $$ select 1 from public.my_general_ledger(date '2026-09-01', date '2026-09-30') $$,
  'but its ledger is still readable -- §08'
);

select * from finish();
rollback;
