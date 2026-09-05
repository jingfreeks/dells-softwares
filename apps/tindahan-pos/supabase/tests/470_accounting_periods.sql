-- =============================================================================
-- pgTAP · Accounting periods
--
-- A period is what makes a set of books finishable. The properties worth
-- pinning are the ones that stop being true quietly:
--
--   * posting_allowed() refuses a CLOSED period AND a date in no period at all
--   * periods cannot overlap within a tenant
--   * closing needs the typed phrase, checked HERE and not only in the client
--   * reopening needs a reason, and there is no way to skip it
--   * a closed period is always stamped with who and when; an open one never is
--   * nothing can delete a period
--
-- Run: psql -f supabase/tests/470_accounting_periods.sql
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
  ('acc10000-0000-4000-8000-000000000001', 'period.owner@test.local',
   '{"store_name":"Period Store","owner_name":"Owner"}');

create or replace function pg_temp.org() returns uuid language sql as $$
  select id from stores where name = 'Period Store'
$$;

insert into core.organization_modules (organization_id, module_code, enabled, source)
select pg_temp.org(), 'ACCOUNTING', true, 'MANUAL'
on conflict (organization_id, module_code) do update set enabled = true;

set local role authenticated;
select pg_temp.act_as('acc10000-0000-4000-8000-000000000001');

-- -----------------------------------------------------------------------------
-- 1 · A date in no period cannot be posted to
-- -----------------------------------------------------------------------------
select ok(
  not accounting.posting_allowed(pg_temp.org(), date '2026-09-15'),
  'with no periods open at all, nothing may be posted -- an unbounded date has '
  'no month to be closed into later'
);

select lives_ok(
  $$ select public.open_accounting_period('FY2026-09', date '2026-09-01', date '2026-09-30') $$,
  'the owner can open a period'
);

select ok(
  accounting.posting_allowed(pg_temp.org(), date '2026-09-15'),
  'and a date inside it becomes postable'
);

select ok(
  not accounting.posting_allowed(pg_temp.org(), date '2026-10-01'),
  'while the day after it still is not'
);

-- The form B2's policies will actually use. It takes no organization, so a
-- client cannot ask the question about somebody else's books.
select ok(
  public.current_store_posting_allowed(date '2026-09-15'),
  'the caller-facing wrapper agrees for the caller''s own store'
);

select ok(
  not public.current_store_posting_allowed(date '2026-10-01'),
  'and refuses the same dates'
);

-- -----------------------------------------------------------------------------
-- 2 · Periods may not overlap
-- -----------------------------------------------------------------------------
select throws_ok(
  $$ select public.open_accounting_period('OVERLAP', date '2026-09-15', date '2026-10-15') $$,
  'P0001', 'PERIOD_OVERLAPS',
  'a period overlapping an existing one is refused'
);

select throws_ok(
  $$ select public.open_accounting_period('INSIDE', date '2026-09-10', date '2026-09-12') $$,
  'P0001', 'PERIOD_OVERLAPS',
  'including one wholly inside another'
);

select lives_ok(
  $$ select public.open_accounting_period('FY2026-10', date '2026-10-01', date '2026-10-31') $$,
  'but an adjacent period is fine -- the boundary is inclusive on both ends '
  'and they do not touch'
);

-- -----------------------------------------------------------------------------
-- 3 · Closing takes the typed phrase, server-side
-- -----------------------------------------------------------------------------
create or replace function pg_temp.sept() returns uuid language sql as $$
  select id from accounting.periods where organization_id = pg_temp.org() and code = 'FY2026-09'
$$;

select throws_ok(
  format($$ select public.close_accounting_period(%L, 'yes') $$, pg_temp.sept()),
  'P0001', 'CONFIRMATION_REQUIRED',
  'closing without the phrase is refused -- the safeguard is not client-side theatre'
);

select ok(
  accounting.posting_allowed(pg_temp.org(), date '2026-09-15'),
  'and the period is still open after the refused attempt'
);

select lives_ok(
  format($$ select public.close_accounting_period(%L, 'close fy2026-09') $$, pg_temp.sept()),
  'the phrase is accepted case-insensitively, since the user is typing it'
);

select ok(
  not accounting.posting_allowed(pg_temp.org(), date '2026-09-15'),
  'a closed period refuses posting -- the rule planning §13 says must live in '
  'the database, not the UI'
);

select is(
  (select status from public.my_accounting_periods() where code = 'FY2026-09'),
  'CLOSED',
  'and the period reads as closed'
);

select isnt(
  (select closed_at from public.my_accounting_periods() where code = 'FY2026-09'),
  null,
  'stamped with when'
);

select isnt(
  (select closed_by from public.my_accounting_periods() where code = 'FY2026-09'),
  null,
  'and with who'
);

select throws_ok(
  format($$ select public.close_accounting_period(%L, 'CLOSE FY2026-09') $$, pg_temp.sept()),
  'P0001', 'PERIOD_ALREADY_CLOSED',
  'closing a closed period is refused rather than silently repeated'
);

-- -----------------------------------------------------------------------------
-- 4 · Reopening always has a reason
-- -----------------------------------------------------------------------------
select throws_ok(
  format($$ select public.reopen_accounting_period(%L, '   ') $$, pg_temp.sept()),
  'P0001', 'REASON_REQUIRED',
  'reopening without a reason is refused -- whitespace is not a reason'
);

select lives_ok(
  format($$ select public.reopen_accounting_period(%L, 'Late supplier invoice for 28 Sep') $$,
         pg_temp.sept()),
  'reopening with a reason works'
);

select is(
  (select closed_at from public.my_accounting_periods() where code = 'FY2026-09'),
  null,
  'and the close stamp is cleared, so the two columns never disagree with the status'
);

reset role;
select is(
  (select reason from core.audit_logs
    where organization_id = pg_temp.org() and action = 'PERIOD_REOPEN'
    order by id desc limit 1),
  'Late supplier invoice for 28 Sep',
  'the reason is on the audit record, which answers handoff open question 6'
);

select isnt_empty(
  $$ select 1 from core.audit_logs
      where organization_id = pg_temp.org() and action = 'PERIOD_CLOSE' $$,
  'and the close is still on the record after the reopen -- history is not '
  'rewritten by undoing the thing'
);
set local role authenticated;
select pg_temp.act_as('acc10000-0000-4000-8000-000000000001');

-- -----------------------------------------------------------------------------
-- 5 · Nothing deletes a period
-- -----------------------------------------------------------------------------
-- Stronger than the accounts table, and deliberately different. There, DELETE
-- is granted and the policy filters system rows out, so a delete succeeds and
-- removes nothing. Here the privilege was never granted at all, so the
-- statement is refused before RLS is consulted.
select throws_ok(
  $$ delete from accounting.periods where organization_id = pg_temp.org() $$,
  '42501', null,
  'nothing can delete a period -- DELETE is not granted on the table, so this '
  'is refused before any policy is consulted'
);

select is(
  (select count(*)::int from accounting.periods where organization_id = pg_temp.org()),
  2,
  'and both periods are still there: a period that has been posted into is '
  'part of the record'
);

-- -----------------------------------------------------------------------------
-- 6 · Losing the module refuses the next period and keeps the existing ones
-- -----------------------------------------------------------------------------
reset role;
update core.organization_modules set enabled = false
 where organization_id = pg_temp.org() and module_code = 'ACCOUNTING';
set local role authenticated;
select pg_temp.act_as('acc10000-0000-4000-8000-000000000001');

select throws_ok(
  $$ select public.open_accounting_period('FY2026-11', date '2026-11-01', date '2026-11-30') $$,
  'P0001', 'MODULE_NOT_AVAILABLE',
  'a downgraded store cannot open a new period'
);

select is(
  (select count(*)::int from public.my_accounting_periods()), 2,
  'but still reads the periods it has -- §08 again'
);

select * from finish();
rollback;
