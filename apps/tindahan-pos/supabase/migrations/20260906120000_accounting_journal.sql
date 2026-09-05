-- Accounting, chunk B2: journal entries, and the rules that make them a ledger
--
-- This is the engine. Everything after it -- sales integration, expenses,
-- every report -- is a way of producing or reading these two tables.
--
-- Four rules live here, and all four live in the DATABASE rather than in a
-- form, because a form is not where the money is:
--
--   1. a posted entry balances                     planning §9
--   2. a posted entry cannot be edited or deleted  planning §12
--   3. a posted entry lands in an OPEN period      planning §13
--   4. one source transaction posts once           planning §11
--
-- WHY A DRAFT MAY BE UNBALANCED
--
-- The design delivers an unbalanced create-journal screen as a first-class
-- state: a red banner naming the difference, Post and Validate disabled, Save
-- as draft still enabled. So imbalance is a legitimate condition of a draft
-- and only an illegal condition of a POSTED entry. Enforcing balance on every
-- insert would make it impossible to type the first line of a journal.
--
-- The check therefore fires on the transition to POSTED, in a trigger, so it
-- cannot be reached around by writing the status column directly.
--
-- IDEMPOTENCY IS A PARTIAL UNIQUE INDEX
--
-- Planning §11 wants one posted entry per (organization, source_type,
-- source_id). A plain unique constraint would also stop a REVERSED entry from
-- ever being corrected and re-posted, which is the normal way to fix a bad
-- integration run. The index covers posted rows only, so a reversal frees the
-- source to be posted again -- and two live postings of one sale remain
-- impossible.
--
-- Affected schemas : accounting (2 enums, 3 tables, 3 triggers),
--                    public (6 functions, 3 permission rows)
-- Rollback         : drop table accounting.journal_lines, accounting.journal_entries,
--                    accounting.entry_counters cascade;
--                    drop type accounting.journal_status, accounting.journal_source;
--                    drop function public.create_journal_entry(date,text,text,jsonb);
--                    drop function public.post_journal_entry(uuid);
--                    drop function public.reverse_journal_entry(uuid,text);
--                    drop function public.my_journal_entries(date,date);
--                    drop function public.my_journal_lines(uuid);
--                    drop function public.my_general_ledger(date,date);
--                    delete from role_permissions where permission_code like 'accounting.journal%';
--                    delete from permissions where code like 'accounting.journal%';
-- Risk             : low -- new tables nobody reads yet; no existing object altered.

do $$ begin
  create type accounting.journal_status as enum ('DRAFT', 'VALIDATED', 'POSTED', 'REVERSED');
exception when duplicate_object then null; end $$;

-- The vocabulary of where an entry came from. MANUAL is someone typing it;
-- the rest are integrations that C1 and C3 will fill in.
do $$ begin
  create type accounting.journal_source as enum
    ('MANUAL', 'SALE', 'CUSTOMER_PAYMENT', 'PURCHASE', 'SUPPLIER_PAYMENT', 'EXPENSE', 'REVERSAL');
exception when duplicate_object then null; end $$;

-- -----------------------------------------------------------------------------
-- Entry numbering -- one counter per tenant, locked by the update itself
-- -----------------------------------------------------------------------------

create table if not exists accounting.entry_counters (
  organization_id uuid primary key references core.organizations (id) on delete cascade,
  next_no         bigint not null default 1
);

comment on table accounting.entry_counters is
  'Per-tenant journal numbering. `update ... returning` takes a row lock, so '
  'two concurrent posts cannot be handed the same number -- which a '
  'max(entry_no) + 1 would happily do.';

-- -----------------------------------------------------------------------------
-- Entries
-- -----------------------------------------------------------------------------

create table if not exists accounting.journal_entries (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references core.organizations (id) on delete cascade,
  entry_no         text,
  entry_date       date not null,
  reference        text,
  description      text not null,
  status           accounting.journal_status not null default 'DRAFT',
  source_type      accounting.journal_source not null default 'MANUAL',
  -- The originating record, for an integration. Null for a manual entry.
  source_id        uuid,
  created_by       uuid references staff (id) on delete set null,
  created_at       timestamptz not null default now(),
  posted_by        uuid references staff (id) on delete set null,
  posted_at        timestamptz,
  reversed_at      timestamptz,
  -- Set on the CORRECTING entry, pointing at what it undoes.
  reverses_id      uuid references accounting.journal_entries (id) on delete restrict,
  reversal_reason  text,
  updated_at       timestamptz not null default now(),

  constraint journal_description_not_blank check (btrim(description) <> ''),
  constraint journal_entry_no_per_org unique (organization_id, entry_no),
  constraint journal_org_id_key unique (organization_id, id),
  -- A posted entry always carries its number and stamp; a draft never does.
  constraint journal_posted_is_stamped check (
    (status in ('POSTED', 'REVERSED') and entry_no is not null
       and posted_by is not null and posted_at is not null)
    or (status in ('DRAFT', 'VALIDATED') and entry_no is null
       and posted_by is null and posted_at is null)
  ),
  constraint journal_reversed_is_stamped check (
    (status = 'REVERSED') = (reversed_at is not null)
  ),
  -- An integration entry names its source; a manual one must not pretend to.
  constraint journal_source_is_consistent check (
    (source_type = 'MANUAL' and source_id is null)
    or (source_type <> 'MANUAL' and source_id is not null)
  )
);

comment on table accounting.journal_entries is
  'The ledger. A posted row is immutable: it can be reversed by a new entry, '
  'never edited and never deleted.';

-- Rule 4. Partial, so a reversal frees the source to be posted again.
create unique index if not exists journal_one_posting_per_source
  on accounting.journal_entries (organization_id, source_type, source_id)
  where status = 'POSTED' and source_id is not null;

create index if not exists journal_org_date_idx
  on accounting.journal_entries (organization_id, entry_date);
create index if not exists journal_org_status_idx
  on accounting.journal_entries (organization_id, status);

-- -----------------------------------------------------------------------------
-- Lines
-- -----------------------------------------------------------------------------

create table if not exists accounting.journal_lines (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null,
  entry_id         uuid not null,
  line_no          integer not null,
  account_id       uuid not null,
  description      text,
  debit            numeric(14, 2) not null default 0,
  credit           numeric(14, 2) not null default 0,

  constraint journal_lines_line_per_entry unique (entry_id, line_no),
  constraint journal_lines_amounts_non_negative check (debit >= 0 and credit >= 0),
  -- A line is a debit or a credit, never both and never neither. Half of
  -- double-entry is this constraint; the other half is the balance trigger.
  constraint journal_lines_one_side_only check (
    (debit > 0 and credit = 0) or (credit > 0 and debit = 0)
  ),
  -- Composite, so a line can never point at another tenant's entry or account.
  foreign key (organization_id, entry_id)
    references accounting.journal_entries (organization_id, id) on delete cascade,
  foreign key (organization_id, account_id)
    references accounting.accounts (organization_id, id) on delete restrict
);

comment on table accounting.journal_lines is
  'One side of one entry. The composite foreign keys are what stop a line '
  'borrowing an account or an entry from another tenant.';

create index if not exists journal_lines_entry_idx on accounting.journal_lines (entry_id);
create index if not exists journal_lines_account_idx
  on accounting.journal_lines (organization_id, account_id);

-- -----------------------------------------------------------------------------
-- Rules 1, 2 and 3, as one trigger on the lifecycle
-- -----------------------------------------------------------------------------

create or replace function accounting.enforce_journal_lifecycle()
returns trigger
language plpgsql
set search_path = accounting, public, pg_temp
as $$
declare
  v_debit  numeric(14, 2);
  v_credit numeric(14, 2);
  v_lines  integer;
begin
  -- Rule 2. A posted entry is a record, not a document. The only change it
  -- may undergo is being marked reversed by its correcting entry.
  if old.status = 'POSTED' and new.status <> 'REVERSED' then
    raise exception 'ENTRY_IS_POSTED' using errcode = 'P0001',
      hint = 'Correct a posted entry by posting a reversing entry';
  end if;
  if old.status = 'REVERSED' then
    raise exception 'ENTRY_IS_REVERSED' using errcode = 'P0001';
  end if;

  if new.status = old.status then
    return new;
  end if;

  if not (
    (old.status = 'DRAFT'     and new.status in ('VALIDATED', 'POSTED'))
    or (old.status = 'VALIDATED' and new.status in ('DRAFT', 'POSTED'))
    or (old.status = 'POSTED'    and new.status = 'REVERSED')
  ) then
    raise exception 'ILLEGAL_TRANSITION' using errcode = 'P0001',
      hint = old.status::text || ' -> ' || new.status::text;
  end if;

  if new.status = 'POSTED' then
    select coalesce(sum(debit), 0), coalesce(sum(credit), 0), count(*)
      into v_debit, v_credit, v_lines
      from accounting.journal_lines where entry_id = new.id;

    -- Rule 1. Planning §9: total debits = total credits, or it is not an entry.
    if v_lines < 2 then
      raise exception 'ENTRY_NEEDS_TWO_LINES' using errcode = 'P0001';
    end if;
    if v_debit <> v_credit then
      raise exception 'ENTRY_NOT_BALANCED' using errcode = 'P0001',
        hint = 'debits ' || v_debit::text || ' vs credits ' || v_credit::text;
    end if;

    -- Rule 3. Asked of the period table, which is B1's whole purpose.
    if not accounting.posting_allowed(new.organization_id, new.entry_date) then
      raise exception 'PERIOD_NOT_OPEN' using errcode = 'P0001',
        hint = new.entry_date::text;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_journal_lifecycle on accounting.journal_entries;
create trigger trg_journal_lifecycle
  before update on accounting.journal_entries
  for each row execute function accounting.enforce_journal_lifecycle();

-- Rule 2 again, from the other side: the lines of a posted entry are as fixed
-- as the entry. Without this, a balanced posted entry could be quietly
-- unbalanced afterwards by editing a line.
create or replace function accounting.enforce_lines_are_draft_only()
returns trigger
language plpgsql
set search_path = accounting, pg_temp
as $$
declare
  v_status accounting.journal_status;
  v_entry  uuid := coalesce(new.entry_id, old.entry_id);
begin
  select status into v_status from accounting.journal_entries where id = v_entry;
  if v_status is not null and v_status not in ('DRAFT', 'VALIDATED') then
    raise exception 'ENTRY_IS_POSTED' using errcode = 'P0001',
      hint = 'The lines of a posted entry cannot be changed';
  end if;
  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_journal_lines_draft_only on accounting.journal_lines;
create trigger trg_journal_lines_draft_only
  before insert or update or delete on accounting.journal_lines
  for each row execute function accounting.enforce_lines_are_draft_only();

drop trigger if exists trg_journal_audit on accounting.journal_entries;
create trigger trg_journal_audit
  after insert or update or delete on accounting.journal_entries
  for each row execute function core.audit_trigger('ACCOUNTING', 'JournalEntry');

-- -----------------------------------------------------------------------------
-- Row level security. Writes need the module; reads survive every state (§08).
-- -----------------------------------------------------------------------------

alter table accounting.journal_entries enable row level security;
alter table accounting.journal_lines   enable row level security;
alter table accounting.entry_counters  enable row level security;

drop policy if exists "staff can view entries" on accounting.journal_entries;
create policy "staff can view entries"
  on accounting.journal_entries for select
  using (organization_id = auth_store_id());

drop policy if exists "manage entries insert" on accounting.journal_entries;
create policy "manage entries insert"
  on accounting.journal_entries for insert
  with check (
    organization_id = auth_store_id()
    and (auth_role() = 'admin' or has_permission('accounting.journal.manage'))
    and (select public.current_store_has_module('ACCOUNTING'))
    and (select public.current_store_writes_allowed())
  );

drop policy if exists "manage entries update" on accounting.journal_entries;
create policy "manage entries update"
  on accounting.journal_entries for update
  using (
    organization_id = auth_store_id()
    and (auth_role() = 'admin' or has_permission('accounting.journal.manage'))
    and (select public.current_store_has_module('ACCOUNTING'))
    and (select public.current_store_writes_allowed())
  );

-- Deleting a DRAFT is legitimate -- it was never a record. The trigger above
-- refuses the rest, so this policy does not have to restate it.
drop policy if exists "manage entries delete" on accounting.journal_entries;
create policy "manage entries delete"
  on accounting.journal_entries for delete
  using (
    organization_id = auth_store_id()
    and status = 'DRAFT'
    and (auth_role() = 'admin' or has_permission('accounting.journal.manage'))
    and (select public.current_store_has_module('ACCOUNTING'))
  );

drop policy if exists "staff can view lines" on accounting.journal_lines;
create policy "staff can view lines"
  on accounting.journal_lines for select
  using (organization_id = auth_store_id());

drop policy if exists "manage lines" on accounting.journal_lines;
create policy "manage lines"
  on accounting.journal_lines for all
  using (
    organization_id = auth_store_id()
    and (auth_role() = 'admin' or has_permission('accounting.journal.manage'))
    and (select public.current_store_has_module('ACCOUNTING'))
  )
  with check (
    organization_id = auth_store_id()
    and (auth_role() = 'admin' or has_permission('accounting.journal.manage'))
    and (select public.current_store_has_module('ACCOUNTING'))
    and (select public.current_store_writes_allowed())
  );

-- The counter is never touched by a client. post_journal_entry() is security
-- definer and owns it; no policy grants anybody else a way in.
drop policy if exists "no direct counter access" on accounting.entry_counters;

-- -----------------------------------------------------------------------------
-- Permissions
-- -----------------------------------------------------------------------------

insert into permissions (code, module_code, description) values
  ('accounting.journal.manage',  'ACCOUNTING', 'Create and edit draft journal entries'),
  ('accounting.journal.post',    'ACCOUNTING', 'Post a journal entry to the general ledger'),
  ('accounting.journal.reverse', 'ACCOUNTING', 'Reverse a posted journal entry')
on conflict (code) do nothing;

-- OWNER holds every permission -- 210_permission_unification.sql asserts it
-- over the whole table, and a new code granted to nobody fails there.
insert into role_permissions (role_id, permission_code)
select r.id, p.code
from roles r cross join permissions p
where r.code = 'OWNER' and r.store_id is null and p.code like 'accounting.journal%'
on conflict do nothing;

-- SUPERVISOR gets none of these. The design's journal list greys out "New
-- journal entry" for a Supervisor, and reading is already accounting.view.

-- -----------------------------------------------------------------------------
-- Creating a draft
-- -----------------------------------------------------------------------------

create or replace function public.create_journal_entry(
  p_entry_date  date,
  p_description text,
  p_reference   text,
  -- [{"account_code":"1010","debit":500,"credit":0,"description":"..."}, ...]
  p_lines       jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = public, accounting, core, pg_temp
as $$
declare
  v_org   uuid := auth_store_id();
  v_entry uuid;
  v_line  jsonb;
  v_no    integer := 0;
  v_acct  uuid;
begin
  if v_org is null then
    raise exception 'UNAUTHORIZED_ACTION' using errcode = 'P0001', hint = 'No store in session';
  end if;
  if not public.current_store_has_module('ACCOUNTING') then
    raise exception 'MODULE_NOT_AVAILABLE' using errcode = 'P0001', hint = 'ACCOUNTING';
  end if;

  insert into accounting.journal_entries
    (organization_id, entry_date, description, reference, created_by)
  values (v_org, p_entry_date, btrim(p_description), nullif(btrim(coalesce(p_reference, '')), ''), auth.uid())
  returning id into v_entry;

  for v_line in select * from jsonb_array_elements(coalesce(p_lines, '[]'::jsonb))
  loop
    v_no := v_no + 1;

    -- Resolved by CODE, never by name. Planning §8: "Do not hard-code account
    -- names throughout application logic."
    select id into v_acct from accounting.accounts
     where organization_id = v_org and code = (v_line ->> 'account_code');
    if v_acct is null then
      raise exception 'ACCOUNT_NOT_FOUND' using errcode = 'P0001',
        hint = coalesce(v_line ->> 'account_code', '(null)');
    end if;

    insert into accounting.journal_lines
      (organization_id, entry_id, line_no, account_id, description, debit, credit)
    values (
      v_org, v_entry, v_no, v_acct,
      nullif(btrim(coalesce(v_line ->> 'description', '')), ''),
      coalesce((v_line ->> 'debit')::numeric, 0),
      coalesce((v_line ->> 'credit')::numeric, 0)
    );
  end loop;

  return v_entry;
end;
$$;

comment on function public.create_journal_entry is
  'Create a DRAFT entry with its lines. A draft may be unbalanced -- that is a '
  'state the design delivers on purpose, and posting is where balance is '
  'demanded.';

-- -----------------------------------------------------------------------------
-- Posting
-- -----------------------------------------------------------------------------

create or replace function public.post_journal_entry(p_entry uuid)
returns text
language plpgsql
security definer
set search_path = public, accounting, core, pg_temp
as $$
declare
  v_org   uuid := auth_store_id();
  v_entry accounting.journal_entries;
  v_no    bigint;
begin
  if not (auth_role() = 'admin' or has_permission('accounting.journal.post')) then
    raise exception 'UNAUTHORIZED_ACTION' using errcode = 'P0001',
      hint = 'accounting.journal.post required';
  end if;
  if not public.current_store_has_module('ACCOUNTING') then
    raise exception 'MODULE_NOT_AVAILABLE' using errcode = 'P0001', hint = 'ACCOUNTING';
  end if;
  if not public.current_store_writes_allowed() then
    raise exception 'WRITES_NOT_ALLOWED' using errcode = 'P0001';
  end if;

  select * into v_entry from accounting.journal_entries
   where id = p_entry and organization_id = v_org;
  if v_entry.id is null then
    raise exception 'ENTRY_NOT_FOUND' using errcode = 'P0001';
  end if;

  -- The number is taken here rather than at creation, so a draft that is
  -- never posted does not consume one and leave a hole in the sequence.
  insert into accounting.entry_counters (organization_id, next_no)
  values (v_org, 1)
  on conflict (organization_id) do nothing;

  update accounting.entry_counters
     set next_no = next_no + 1
   where organization_id = v_org
  returning next_no - 1 into v_no;

  -- Every rule that makes this a ledger entry is checked by the lifecycle
  -- trigger on this update, not here: balance, line count and open period.
  -- Putting them there means a caller who bypasses this function still meets
  -- them.
  update accounting.journal_entries
     set status    = 'POSTED',
         entry_no  = 'JE-' || lpad(v_no::text, 6, '0'),
         posted_by = auth.uid(),
         posted_at = now(),
         updated_at = now()
   where id = p_entry;

  return 'JE-' || lpad(v_no::text, 6, '0');
end;
$$;

comment on function public.post_journal_entry is
  'Post a draft to the general ledger. Balance, two-line minimum and open '
  'period are enforced by the lifecycle trigger, so they hold for any caller.';

-- -----------------------------------------------------------------------------
-- Reversing
-- -----------------------------------------------------------------------------

create or replace function public.reverse_journal_entry(p_entry uuid, p_reason text)
returns uuid
language plpgsql
security definer
set search_path = public, accounting, core, pg_temp
as $$
declare
  v_org      uuid := auth_store_id();
  v_entry    accounting.journal_entries;
  v_new      uuid;
  v_no       bigint;
  v_on       date := current_date;
begin
  if not (auth_role() = 'admin' or has_permission('accounting.journal.reverse')) then
    raise exception 'UNAUTHORIZED_ACTION' using errcode = 'P0001',
      hint = 'accounting.journal.reverse required';
  end if;
  if not public.current_store_has_module('ACCOUNTING') then
    raise exception 'MODULE_NOT_AVAILABLE' using errcode = 'P0001', hint = 'ACCOUNTING';
  end if;
  if btrim(coalesce(p_reason, '')) = '' then
    raise exception 'REASON_REQUIRED' using errcode = 'P0001';
  end if;

  select * into v_entry from accounting.journal_entries
   where id = p_entry and organization_id = v_org;
  if v_entry.id is null then
    raise exception 'ENTRY_NOT_FOUND' using errcode = 'P0001';
  end if;
  if v_entry.status <> 'POSTED' then
    raise exception 'ENTRY_NOT_POSTED' using errcode = 'P0001',
      hint = 'Only a posted entry can be reversed; delete a draft instead';
  end if;

  -- Dated today, not on the original date: the original month may be closed,
  -- and reopening it to file a correction would undo the point of closing it.
  -- The correction belongs to the period in which it was made.
  if not accounting.posting_allowed(v_org, v_on) then
    raise exception 'PERIOD_NOT_OPEN' using errcode = 'P0001', hint = v_on::text;
  end if;

  insert into accounting.journal_entries
    (organization_id, entry_date, description, reference, source_type, source_id,
     created_by, reverses_id, reversal_reason)
  values (
    v_org, v_on, 'Reversal of ' || coalesce(v_entry.entry_no, '(draft)'),
    v_entry.reference, 'REVERSAL', v_entry.id, auth.uid(), v_entry.id, btrim(p_reason)
  )
  returning id into v_new;

  -- Debits become credits. Nothing is recalculated, so a reversal can never
  -- disagree with what it undoes.
  insert into accounting.journal_lines
    (organization_id, entry_id, line_no, account_id, description, debit, credit)
  select v_org, v_new, l.line_no, l.account_id, l.description, l.credit, l.debit
    from accounting.journal_lines l
   where l.entry_id = v_entry.id;

  update accounting.entry_counters set next_no = next_no + 1
   where organization_id = v_org
  returning next_no - 1 into v_no;

  update accounting.journal_entries
     set status = 'POSTED', entry_no = 'JE-' || lpad(v_no::text, 6, '0'),
         posted_by = auth.uid(), posted_at = now(), updated_at = now()
   where id = v_new;

  update accounting.journal_entries
     set status = 'REVERSED', reversed_at = now(), reversal_reason = btrim(p_reason),
         updated_at = now()
   where id = v_entry.id;

  perform core.write_audit(
    v_org, 'JOURNAL_REVERSE', 'JournalEntry', v_entry.id, 'ACCOUNTING',
    jsonb_build_object('entry_no', v_entry.entry_no),
    jsonb_build_object('reversal_id', v_new), btrim(p_reason)
  );

  return v_new;
end;
$$;

comment on function public.reverse_journal_entry is
  'Reverse a posted entry with a mirrored correcting entry dated today. '
  'Requires a reason, stored on the entry and on the audit record.';

-- -----------------------------------------------------------------------------
-- Readers
-- -----------------------------------------------------------------------------

create or replace function public.my_journal_entries(p_from date, p_to date)
returns table (
  id           uuid,
  entry_no     text,
  entry_date   date,
  reference    text,
  description  text,
  status       text,
  source_type  text,
  total        numeric
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
    select e.id, e.entry_no, e.entry_date, e.reference, e.description,
           e.status::text, e.source_type::text,
           coalesce((select sum(l.debit) from accounting.journal_lines l
                      where l.entry_id = e.id), 0)
      from accounting.journal_entries e
     where e.entry_date between p_from and p_to
     order by e.entry_date desc, e.entry_no desc nulls first;
end;
$$;

comment on function public.my_journal_entries is
  'Entries in a date range, newest first, drafts included and labelled. The '
  'total is the debit side, which equals the credit side on anything posted.';

create or replace function public.my_journal_lines(p_entry uuid)
returns table (
  line_no        integer,
  account_code   text,
  account_name   text,
  description    text,
  debit          numeric,
  credit         numeric
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
    select l.line_no, a.code, a.name, l.description, l.debit, l.credit
      from accounting.journal_lines l
      join accounting.accounts a on a.id = l.account_id
     where l.entry_id = p_entry
     order by l.line_no;
end;
$$;

create or replace function public.my_general_ledger(p_from date, p_to date)
returns table (
  account_code    text,
  account_name    text,
  entry_date      date,
  entry_no        text,
  description     text,
  source_type     text,
  debit           numeric,
  credit          numeric
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

  -- POSTED only, and REVERSED entries stay in: a reversal is part of the
  -- history, and its correcting entry is posted alongside it, so the two net
  -- to nothing without either disappearing. Drafts are excluded, which the
  -- design's ledger screen states on the page rather than leaving to be
  -- discovered.
  return query
    select a.code, a.name, e.entry_date, e.entry_no, e.description,
           e.source_type::text, l.debit, l.credit
      from accounting.journal_lines l
      join accounting.journal_entries e on e.id = l.entry_id
      join accounting.accounts a on a.id = l.account_id
     where e.status in ('POSTED', 'REVERSED')
       and e.entry_date between p_from and p_to
     order by a.code, e.entry_date, e.entry_no;
end;
$$;

comment on function public.my_general_ledger is
  'Every posted line in a range, ordered by account then date. Drafts are '
  'excluded; reversed entries are not, because their correcting entry is '
  'posted too and the pair nets to nothing in plain sight.';

-- -----------------------------------------------------------------------------
-- Grants. Explicit: a revoke alone leaves anon and service_role holding
-- EXECUTE as named grantees.
-- -----------------------------------------------------------------------------

revoke all on accounting.journal_entries from public;
revoke all on accounting.journal_lines   from public;
revoke all on accounting.entry_counters  from public;
grant select, insert, update, delete on accounting.journal_entries to authenticated;
grant select, insert, update, delete on accounting.journal_lines   to authenticated;
-- Nothing on entry_counters: post_journal_entry() is security definer and is
-- the only thing that may take a number.

revoke all on function public.create_journal_entry(date, text, text, jsonb) from public, anon;
revoke all on function public.post_journal_entry(uuid)                      from public, anon;
revoke all on function public.reverse_journal_entry(uuid, text)             from public, anon;
revoke all on function public.my_journal_entries(date, date)                from public, anon;
revoke all on function public.my_journal_lines(uuid)                        from public, anon;
revoke all on function public.my_general_ledger(date, date)                 from public, anon;
grant execute on function public.create_journal_entry(date, text, text, jsonb) to authenticated;
grant execute on function public.post_journal_entry(uuid)                      to authenticated;
grant execute on function public.reverse_journal_entry(uuid, text)             to authenticated;
grant execute on function public.my_journal_entries(date, date)                to authenticated;
grant execute on function public.my_journal_lines(uuid)                        to authenticated;
grant execute on function public.my_general_ledger(date, date)                 to authenticated;
