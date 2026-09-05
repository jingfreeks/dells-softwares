-- Accounting, chunk B1: accounting periods, and what a closed one refuses
--
-- A period is the thing that makes a set of books finishable. Without one,
-- "the September figures" is a query someone can change the answer to next
-- week by posting an entry dated August.
--
-- Nothing posts to the ledger yet -- journal entries are B2. This migration
-- exists first, and separately, because the closed-period rule has to be a
-- property of the database before there is anything to enforce it against.
-- Planning §13 is explicit: "The restriction must be enforced by the
-- backend/database, not only by the UI."
--
-- WHAT posting_allowed() ANSWERS, AND WHY IT REFUSES A DATE WITH NO PERIOD
--
-- A date outside every period is not "fine by default". A tenant who has
-- opened no periods has not started keeping books, and letting entries land
-- in an unbounded nowhere is how a ledger becomes unclosable -- there would be
-- no month to close them into afterwards. So the answer is no, and the client
-- has to open a period first. That is also what the design's create-journal
-- validation already says: "Date must fall in an OPEN period."
--
-- NON-OVERLAP IS A TRIGGER, NOT AN EXCLUSION CONSTRAINT
--
-- The natural expression is `exclude using gist (organization_id with =,
-- daterange(starts_on, ends_on, '[]') with &&)`, which needs btree_gist. This
-- database installs pgcrypto and citext only. Adding an extension to a shared
-- production database to save a twelve-line trigger is not a trade worth
-- making, so the trigger states the same rule and 460's sibling suite pins it.
--
-- CLOSING TAKES A TYPED CONFIRMATION, SERVER-SIDE
--
-- The design puts a type-to-confirm field on the close modal. Checking it only
-- in the client would make it theatre: anything holding the anon key could
-- close a month with a single RPC. The function requires the phrase too, so
-- the safeguard is real rather than decorative. It is derived from the
-- period's own code, so it is deterministic and does not depend on the
-- server's locale.
--
-- Affected schemas : accounting (1 enum, 1 table, 1 trigger, 2 helpers),
--                    public (4 functions, 1 permission row)
-- Rollback         : drop table accounting.periods cascade;
--                    drop type accounting.period_status;
--                    drop function public.open_accounting_period(date,date,text);
--                    drop function public.close_accounting_period(uuid,text);
--                    drop function public.reopen_accounting_period(uuid,text);
--                    drop function public.my_accounting_periods();
--                    drop function public.current_store_posting_allowed(date);
--                    delete from role_permissions where permission_code = 'accounting.period.manage';
--                    delete from permissions where code = 'accounting.period.manage';
-- Risk             : low -- a new table nobody reads yet, and no existing
--                    function or policy is altered.

do $$ begin
  create type accounting.period_status as enum ('OPEN', 'CLOSED');
exception when duplicate_object then null; end $$;

create table if not exists accounting.periods (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references core.organizations (id) on delete cascade,
  -- The tenant's own name for it, e.g. FY2026-09. Also the confirmation
  -- phrase's second half when closing.
  code             text not null,
  starts_on        date not null,
  ends_on          date not null,
  status           accounting.period_status not null default 'OPEN',
  closed_by        uuid references staff (id) on delete set null,
  closed_at        timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),

  constraint periods_code_per_org unique (organization_id, code),
  constraint periods_code_not_blank check (btrim(code) <> ''),
  constraint periods_dates_ordered check (ends_on >= starts_on),
  -- A closed period always names who closed it and when; an open one never
  -- does. Without this the two columns drift into meaning nothing.
  constraint periods_closed_is_stamped check (
    (status = 'CLOSED' and closed_by is not null and closed_at is not null)
    or (status = 'OPEN' and closed_by is null and closed_at is null)
  )
);

comment on table accounting.periods is
  'The windows a set of books is kept in. A date outside every period cannot '
  'be posted to at all, and a date inside a CLOSED one cannot be posted to '
  'either -- see accounting.posting_allowed().';

create index if not exists periods_org_range_idx
  on accounting.periods (organization_id, starts_on, ends_on);

-- -----------------------------------------------------------------------------
-- Periods may not overlap within a tenant
-- -----------------------------------------------------------------------------

create or replace function accounting.reject_overlapping_period()
returns trigger
language plpgsql
as $$
begin
  if exists (
    select 1 from accounting.periods p
     where p.organization_id = new.organization_id
       and p.id is distinct from new.id
       and p.starts_on <= new.ends_on
       and p.ends_on   >= new.starts_on
  ) then
    raise exception 'PERIOD_OVERLAPS' using errcode = 'P0001',
      hint = 'Another period already covers part of that range';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_periods_no_overlap on accounting.periods;
create trigger trg_periods_no_overlap
  before insert or update of organization_id, starts_on, ends_on
  on accounting.periods
  for each row execute function accounting.reject_overlapping_period();

-- Every change to a period is audited, including the ones made by the
-- functions below -- so a close is on the record even if someone later
-- reopens it and closes it again.
drop trigger if exists trg_periods_audit on accounting.periods;
create trigger trg_periods_audit
  after insert or update or delete on accounting.periods
  for each row execute function core.audit_trigger('ACCOUNTING', 'AccountingPeriod');

-- -----------------------------------------------------------------------------
-- The question B2 will ask on every post
-- -----------------------------------------------------------------------------

create or replace function accounting.posting_allowed(p_org uuid, p_on date)
returns boolean
language sql
stable
security definer
set search_path = accounting, pg_temp
as $$
  select exists (
    select 1 from accounting.periods
     where organization_id = p_org
       and status = 'OPEN'
       and p_on between starts_on and ends_on
  );
$$;

comment on function accounting.posting_allowed is
  'May an entry dated p_on be posted? FALSE when the date falls in a CLOSED '
  'period AND when it falls in no period at all -- an unbounded date has no '
  'month to be closed into later.';

-- The caller-facing form, and the one B2's policies will use.
--
-- accounting.posting_allowed() takes an organization and is therefore never
-- granted to anyone: a client holding it could ask whether ANOTHER tenant has
-- an open period on a given date. This wrapper takes only the date and answers
-- for the caller's own store, which is the same shape -- and the same reason --
-- as current_store_has_module().
--
-- A policy expression runs with the querying role's privileges, so without
-- this B2 would either fail for `authenticated` or be tempted into granting
-- the org-taking form.
create or replace function public.current_store_posting_allowed(p_on date)
returns boolean
language sql
stable
security definer
set search_path = public, accounting, pg_temp
as $$
  select accounting.posting_allowed(auth_store_id(), p_on);
$$;

comment on function public.current_store_posting_allowed is
  'May the calling staff member''s store post an entry dated p_on? FALSE for a '
  'closed period and for a date in no period at all.';

-- -----------------------------------------------------------------------------
-- Row level security. Writes need the module; reads survive every state (§08).
-- -----------------------------------------------------------------------------

alter table accounting.periods enable row level security;

drop policy if exists "staff can view periods" on accounting.periods;
create policy "staff can view periods"
  on accounting.periods for select
  using (organization_id = auth_store_id());

-- Insert and update go through the functions below, which check far more than
-- a policy can express. The policy is the floor, not the whole rule.
drop policy if exists "manage periods insert" on accounting.periods;
create policy "manage periods insert"
  on accounting.periods for insert
  with check (
    organization_id = auth_store_id()
    and (auth_role() = 'admin' or has_permission('accounting.period.manage'))
    and (select public.current_store_has_module('ACCOUNTING'))
    and (select public.current_store_writes_allowed())
  );

drop policy if exists "manage periods update" on accounting.periods;
create policy "manage periods update"
  on accounting.periods for update
  using (
    organization_id = auth_store_id()
    and (auth_role() = 'admin' or has_permission('accounting.period.manage'))
    and (select public.current_store_has_module('ACCOUNTING'))
    and (select public.current_store_writes_allowed())
  );

-- Deliberately no delete policy. A period that has been posted into is part of
-- the record; removing it would orphan every entry that named it. Nothing can
-- delete one, which is a stronger statement than a policy nobody satisfies.

-- -----------------------------------------------------------------------------
-- Permission. Owner-only by grant, matching the design: closing and reopening
-- are Owner actions, and Supervisor reads.
-- -----------------------------------------------------------------------------

insert into permissions (code, module_code, description) values
  ('accounting.period.manage', 'ACCOUNTING',
   'Open, close and reopen accounting periods')
on conflict (code) do nothing;

insert into role_permissions (role_id, permission_code)
select r.id, 'accounting.period.manage'
from roles r
where r.code = 'OWNER' and r.store_id is null
on conflict do nothing;

-- -----------------------------------------------------------------------------
-- Opening a period
-- -----------------------------------------------------------------------------

create or replace function public.open_accounting_period(
  p_code      text,
  p_starts_on date,
  p_ends_on   date
)
returns uuid
language plpgsql
security invoker
set search_path = public, accounting, core, pg_temp
as $$
declare
  v_org uuid := auth_store_id();
  v_id  uuid;
begin
  if v_org is null then
    raise exception 'UNAUTHORIZED_ACTION' using errcode = 'P0001', hint = 'No store in session';
  end if;
  if not public.current_store_has_module('ACCOUNTING') then
    raise exception 'MODULE_NOT_AVAILABLE' using errcode = 'P0001', hint = 'ACCOUNTING';
  end if;

  -- security invoker: the insert policy above is what actually authorises
  -- this, so a caller without the permission is refused by RLS rather than by
  -- a check this function could forget to make.
  insert into accounting.periods (organization_id, code, starts_on, ends_on)
  values (v_org, btrim(p_code), p_starts_on, p_ends_on)
  returning id into v_id;

  return v_id;
end;
$$;

comment on function public.open_accounting_period is
  'Open a new accounting period. Refuses a range overlapping an existing one.';

-- -----------------------------------------------------------------------------
-- Closing -- a controlled action
-- -----------------------------------------------------------------------------

create or replace function public.close_accounting_period(
  p_period  uuid,
  p_confirm text
)
returns void
language plpgsql
security invoker
set search_path = public, accounting, core, pg_temp
as $$
declare
  v_org    uuid := auth_store_id();
  v_period accounting.periods;
  v_phrase text;
begin
  select * into v_period from accounting.periods
   where id = p_period and organization_id = v_org;

  -- Not found and not yours are the same answer on purpose: a caller must not
  -- learn that a period id exists in another tenant.
  if v_period.id is null then
    raise exception 'PERIOD_NOT_FOUND' using errcode = 'P0001';
  end if;
  if v_period.status = 'CLOSED' then
    raise exception 'PERIOD_ALREADY_CLOSED' using errcode = 'P0001';
  end if;

  v_phrase := 'CLOSE ' || upper(v_period.code);
  if upper(btrim(coalesce(p_confirm, ''))) is distinct from v_phrase then
    raise exception 'CONFIRMATION_REQUIRED' using errcode = 'P0001', hint = v_phrase;
  end if;

  update accounting.periods
     set status = 'CLOSED', closed_by = auth.uid(), closed_at = now(), updated_at = now()
   where id = p_period;

  -- The row trigger already records the change. This second entry records the
  -- INTENT -- a deliberate close, with the phrase that was typed -- which is
  -- what an auditor reads rather than a diff of two status values.
  perform core.write_audit(
    v_org, 'PERIOD_CLOSE', 'AccountingPeriod', p_period, 'ACCOUNTING',
    null, jsonb_build_object('code', v_period.code), v_phrase
  );
end;
$$;

comment on function public.close_accounting_period is
  'Close a period. Requires the phrase "CLOSE <code>", checked here and not '
  'only in the client, so the safeguard is real rather than decorative.';

-- -----------------------------------------------------------------------------
-- Reopening -- rarer, and never without a reason
-- -----------------------------------------------------------------------------

create or replace function public.reopen_accounting_period(
  p_period uuid,
  p_reason text
)
returns void
language plpgsql
security invoker
set search_path = public, accounting, core, pg_temp
as $$
declare
  v_org    uuid := auth_store_id();
  v_period accounting.periods;
begin
  select * into v_period from accounting.periods
   where id = p_period and organization_id = v_org;

  if v_period.id is null then
    raise exception 'PERIOD_NOT_FOUND' using errcode = 'P0001';
  end if;
  if v_period.status = 'OPEN' then
    raise exception 'PERIOD_ALREADY_OPEN' using errcode = 'P0001';
  end if;

  -- A reason is not optional. Reopening a closed month is the single action
  -- most likely to be asked about later, and "someone reopened it" without a
  -- why is not an answer.
  if btrim(coalesce(p_reason, '')) = '' then
    raise exception 'REASON_REQUIRED' using errcode = 'P0001';
  end if;

  update accounting.periods
     set status = 'OPEN', closed_by = null, closed_at = null, updated_at = now()
   where id = p_period;

  perform core.write_audit(
    v_org, 'PERIOD_REOPEN', 'AccountingPeriod', p_period, 'ACCOUNTING',
    jsonb_build_object('closed_at', v_period.closed_at),
    jsonb_build_object('code', v_period.code),
    btrim(p_reason)
  );
end;
$$;

comment on function public.reopen_accounting_period is
  'Reopen a closed period. Requires a reason, stored on the audit entry. The '
  'Settings switch that disables reopening entirely arrives with chunk F1.';

-- -----------------------------------------------------------------------------
-- Reader
-- -----------------------------------------------------------------------------

create or replace function public.my_accounting_periods()
returns table (
  id         uuid,
  code       text,
  starts_on  date,
  ends_on    date,
  status     text,
  closed_at  timestamptz,
  closed_by  text
)
language plpgsql
security invoker
set search_path = public, accounting, core, pg_temp
as $$
begin
  if not (auth_role() = 'admin' or has_permission('accounting.view')) then
    raise exception 'UNAUTHORIZED_ACTION' using errcode = 'P0001',
      hint = 'accounting.view required';
  end if;

  return query
    select p.id, p.code, p.starts_on, p.ends_on, p.status::text, p.closed_at, s.name
      from accounting.periods p
      left join staff s on s.id = p.closed_by
     order by p.starts_on desc;
end;
$$;

comment on function public.my_accounting_periods is
  'The caller''s accounting periods, newest first. Readable in every '
  'subscription state (§08).';

-- -----------------------------------------------------------------------------
-- Grants. Explicit, because a revoke alone leaves anon and service_role
-- holding EXECUTE as named grantees.
-- -----------------------------------------------------------------------------

revoke all on accounting.periods from public;
grant select, insert, update on accounting.periods to authenticated;

revoke all on function public.open_accounting_period(text, date, date) from public, anon;
revoke all on function public.close_accounting_period(uuid, text)      from public, anon;
revoke all on function public.reopen_accounting_period(uuid, text)     from public, anon;
revoke all on function public.my_accounting_periods()                  from public, anon;
revoke all on function public.current_store_posting_allowed(date)      from public, anon;
grant execute on function public.open_accounting_period(text, date, date) to authenticated;
grant execute on function public.close_accounting_period(uuid, text)      to authenticated;
grant execute on function public.reopen_accounting_period(uuid, text)     to authenticated;
grant execute on function public.my_accounting_periods()                  to authenticated;
grant execute on function public.current_store_posting_allowed(date)     to authenticated;
