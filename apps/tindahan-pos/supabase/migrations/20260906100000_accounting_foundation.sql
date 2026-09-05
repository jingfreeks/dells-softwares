-- Accounting, chunk A2: the schema, the Chart of Accounts, and the module gate
--
-- WHY THIS PR EXISTS AT ALL
--
-- core.modules has seeded ACCOUNTING with is_sellable = true since
-- 20260815093000, core.plan_modules grants it to PRO and ENTERPRISE, and
-- request_addon('ACCOUNTING') exists as a purchase path. Nothing in the
-- database has ever mentioned the module. It is a capability in the price list
-- with nothing behind it -- the same shape as suppliers and receiving before
-- 20260815114000, which were "quietly sold to everyone" for months.
--
-- This migration is the first thing that makes holding ACCOUNTING mean
-- something, and the first thing that makes NOT holding it mean something.
--
-- A MODULE, NOT A NEW SELLABLE FEATURE
--
-- The planning brief §20 lists accounting.view, accounting.create and so on.
-- It labels them "Potential PERMISSIONS", and that is how they are treated
-- here: RBAC, free, about who a staff member is. The sellable unit is the
-- MODULE, which already exists. Inventing accounting.* rows in core.features
-- would add codes to the price list that nobody is selling, and 290_every_
-- feature_is_decided.sql would then -- correctly -- demand enforcement for
-- capabilities that are not products.
--
-- So the gate is current_store_has_module('ACCOUNTING'), shaped exactly like
-- 20260815114000's inventory gate.
--
-- organization_id, NOT store_id
--
-- Both, in effect. 20260815092000 backfilled core.organizations ID-PRESERVED
-- from public.stores and keeps them in step with a trigger, which is why
-- current_store_has_module() can pass auth_store_id() into a function whose
-- parameter is an organization. The POS tables say store_id because they
-- predate core; accounting is new and says what it means. They are the same
-- uuid, and auth_store_id() is still the right scoping expression.
--
-- Affected schemas : accounting (new), public (2 reader/seeder functions,
--                    1 permission row)
-- Rollback         : drop schema accounting cascade;
--                    drop function public.my_accounting_accounts();
--                    drop function public.seed_accounting_chart();
--                    delete from role_permissions where permission_code like 'accounting.%';
--                    delete from permissions where code like 'accounting.%';
-- Risk             : low -- a new schema nobody reads yet. No existing table,
--                    policy or function is altered. A tenant without
--                    ACCOUNTING sees exactly what they see today: nothing.

create schema if not exists accounting;

comment on schema accounting is
  'Financial records: chart of accounts, journals, periods, expenses. Owns no '
  'operational data -- the POS records what happened, accounting records what '
  'it means. Not exposed to PostgREST; reach it through public functions.';

-- -----------------------------------------------------------------------------
-- Vocabulary
-- -----------------------------------------------------------------------------

do $$ begin
  create type accounting.account_type as enum
    ('ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'COST_OF_SALES', 'EXPENSE');
exception when duplicate_object then null; end $$;

do $$ begin
  create type accounting.normal_balance as enum ('DEBIT', 'CREDIT');
exception when duplicate_object then null; end $$;

-- -----------------------------------------------------------------------------
-- The Chart of Accounts
-- -----------------------------------------------------------------------------

create table if not exists accounting.accounts (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references core.organizations (id) on delete cascade,
  code             text not null,
  name             text not null,
  type             accounting.account_type not null,
  normal_balance   accounting.normal_balance not null,
  parent_id        uuid,
  -- Set on the accounts an integration posts to. The design's rule: an account
  -- the POS integration uses cannot be deleted, only deactivated -- otherwise
  -- a posted journal line loses the account it names.
  is_system        boolean not null default false,
  active           boolean not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),

  constraint accounts_code_per_org unique (organization_id, code),
  -- The target of the composite parent FK below, so a parent can never be
  -- borrowed from another tenant. Same device core.branches uses.
  constraint accounts_org_id_key unique (organization_id, id),
  constraint accounts_not_own_parent check (parent_id is distinct from id),
  constraint accounts_code_not_blank check (btrim(code) <> ''),
  constraint accounts_name_not_blank check (btrim(name) <> ''),
  foreign key (organization_id, parent_id)
    references accounting.accounts (organization_id, id) on delete restrict
);

comment on table accounting.accounts is
  'One tenant''s chart of accounts. Seeded, not hard-coded: the starter '
  'structure is data (see seed_accounting_chart), and integrations must resolve '
  'accounts through configuration rather than by matching names.';

comment on column accounting.accounts.normal_balance is
  'Which side increases this account. Defaulted from the type but stored '
  'separately and deliberately unconstrained, because contra accounts break '
  'the rule: Owner''s Drawings is EQUITY and yet debit-normal, and so is every '
  'other contra account anyone adds later.';

comment on column accounting.accounts.is_system is
  'This account is posted to by an integration. Deactivate, never delete.';

create index if not exists accounts_org_type_idx
  on accounting.accounts (organization_id, type);
create index if not exists accounts_parent_idx
  on accounting.accounts (organization_id, parent_id)
  where parent_id is not null;

-- -----------------------------------------------------------------------------
-- Row level security
--
-- Three conditions on every WRITE, in the order 20260815114000 established:
-- the tenant owns the row, the staff member is allowed, the tenant holds the
-- module -- plus the grace ladder, so a lapsed subscription stops creating
-- records without losing the ones it has.
--
-- READS ARE NOT GATED ON THE MODULE, deliberately. §08: reads and exports
-- survive every state, and 260_suppliers_receiving_enforcement.sql pins it --
-- withdrawing a capability refuses the write and leaves every existing row
-- readable. A tenant who drops from PRO to Starter keeps their books; they
-- simply cannot add to them. Gating the select would turn a downgrade into
-- confiscation of records a business is legally required to keep.
-- -----------------------------------------------------------------------------

alter table accounting.accounts enable row level security;

drop policy if exists "staff can view accounts" on accounting.accounts;
create policy "staff can view accounts"
  on accounting.accounts for select
  using (organization_id = auth_store_id());

drop policy if exists "manage accounts insert" on accounting.accounts;
create policy "manage accounts insert"
  on accounting.accounts for insert
  with check (
    organization_id = auth_store_id()
    and (auth_role() = 'admin' or has_permission('accounting.account.manage'))
    and (select public.current_store_has_module('ACCOUNTING'))
    and (select public.current_store_writes_allowed())
  );

drop policy if exists "manage accounts update" on accounting.accounts;
create policy "manage accounts update"
  on accounting.accounts for update
  using (
    organization_id = auth_store_id()
    and (auth_role() = 'admin' or has_permission('accounting.account.manage'))
    and (select public.current_store_has_module('ACCOUNTING'))
    and (select public.current_store_writes_allowed())
  );

-- No is_system row may be deleted, by anyone, ever -- deactivate it instead.
drop policy if exists "manage accounts delete" on accounting.accounts;
create policy "manage accounts delete"
  on accounting.accounts for delete
  using (
    organization_id = auth_store_id()
    and not is_system
    and (auth_role() = 'admin' or has_permission('accounting.account.manage'))
    and (select public.current_store_has_module('ACCOUNTING'))
    and (select public.current_store_writes_allowed())
  );

-- -----------------------------------------------------------------------------
-- Permissions (RBAC, free -- distinct from the module, which is sold)
-- -----------------------------------------------------------------------------

insert into permissions (code, module_code, description) values
  ('accounting.view',           'ACCOUNTING', 'Open Accounting and read its records'),
  ('accounting.account.manage', 'ACCOUNTING', 'Create, edit and deactivate accounts in the chart of accounts')
on conflict (code) do nothing;

-- OWNER holds everything. 210_permission_unification.sql asserts this over the
-- WHOLE permissions table rather than a sample, with the reason written into
-- it: "a new code added later without being granted to OWNER should fail here
-- rather than in production." It duly failed here first.
insert into role_permissions (role_id, permission_code)
select r.id, p.code
from roles r
cross join permissions p
where r.code = 'OWNER' and r.store_id is null
  and p.code like 'accounting.%'
on conflict do nothing;

-- SUPERVISOR reads the books and cannot change the chart, which is the split
-- the design's permission matrix states and the reason there is no bookkeeper
-- role: rather than imply a role the backend cannot grant, Accounting reuses
-- the three that exist and says so.
insert into role_permissions (role_id, permission_code)
select r.id, p.code
from roles r
cross join permissions p
where r.code = 'SUPERVISOR' and r.store_id is null
  and p.code = 'accounting.view'
on conflict do nothing;

-- CASHIER gets nothing: the design is explicit that a cashier has no access to
-- Accounting at all, and the no-access screen exists to say so plainly rather
-- than let someone retype a correct password at a permissions wall.

-- -----------------------------------------------------------------------------
-- The starter chart
--
-- Planning §8: "only a starting structure ... do not hard-code account names
-- throughout application logic". So it is seeded as DATA, once, on request --
-- not created for every tenant by this migration, and never consulted by name
-- from application code. Codes follow the brief's example structure.
-- -----------------------------------------------------------------------------

create or replace function public.seed_accounting_chart()
returns integer
language plpgsql
security definer
set search_path = public, accounting, core, pg_temp
as $$
declare
  v_org     uuid := auth_store_id();
  v_before  integer;
  v_after   integer;
begin
  if v_org is null then
    raise exception 'UNAUTHORIZED_ACTION' using hint = 'No store in session';
  end if;
  if not (auth_role() = 'admin' or has_permission('accounting.account.manage')) then
    raise exception 'UNAUTHORIZED_ACTION' using hint = 'accounting.account.manage required';
  end if;
  if not public.current_store_has_module('ACCOUNTING') then
    raise exception 'MODULE_NOT_AVAILABLE' using hint = 'ACCOUNTING';
  end if;
  if not public.current_store_writes_allowed() then
    raise exception 'WRITES_NOT_ALLOWED';
  end if;

  select count(*) into v_before from accounting.accounts where organization_id = v_org;

  -- Parents first, then children resolved by code, so the composite parent FK
  -- is satisfied without hard-coding any uuid.
  insert into accounting.accounts (organization_id, code, name, type, normal_balance, is_system)
  values
    (v_org, '1000', 'Assets',              'ASSET',         'DEBIT',  false),
    (v_org, '2000', 'Liabilities',         'LIABILITY',     'CREDIT', false),
    (v_org, '3000', 'Equity',              'EQUITY',        'CREDIT', false),
    (v_org, '4000', 'Revenue',             'REVENUE',       'CREDIT', false),
    (v_org, '5000', 'Cost of Sales',       'COST_OF_SALES', 'DEBIT',  false),
    (v_org, '6000', 'Expenses',            'EXPENSE',       'DEBIT',  false)
  on conflict (organization_id, code) do nothing;

  insert into accounting.accounts (organization_id, code, name, type, normal_balance, is_system, parent_id)
  select v_org, v.code, v.name, v.type::accounting.account_type,
         v.normal_balance::accounting.normal_balance, v.is_system, p.id
    from (values
      ('1010', 'Cash on Hand',        'ASSET',         'DEBIT',  true,  '1000'),
      ('1020', 'Cash in Bank',        'ASSET',         'DEBIT',  true,  '1000'),
      ('1030', 'Accounts Receivable', 'ASSET',         'DEBIT',  true,  '1000'),
      ('1040', 'Inventory',           'ASSET',         'DEBIT',  true,  '1000'),
      ('2010', 'Accounts Payable',    'LIABILITY',     'CREDIT', true,  '2000'),
      ('2020', 'Other Payables',      'LIABILITY',     'CREDIT', false, '2000'),
      ('3010', 'Owner''s Capital',    'EQUITY',        'CREDIT', false, '3000'),
      -- Contra-equity: EQUITY, yet debit-normal. The reason normal_balance is
      -- its own column rather than derived from the type.
      ('3020', 'Owner''s Drawings',   'EQUITY',        'DEBIT',  false, '3000'),
      ('4010', 'Sales Revenue',       'REVENUE',       'CREDIT', true,  '4000'),
      ('5010', 'Cost of Goods Sold',  'COST_OF_SALES', 'DEBIT',  true,  '5000'),
      ('6010', 'Rent',                'EXPENSE',       'DEBIT',  false, '6000'),
      ('6020', 'Utilities',           'EXPENSE',       'DEBIT',  false, '6000'),
      ('6030', 'Salaries',            'EXPENSE',       'DEBIT',  false, '6000'),
      ('6040', 'Transportation',      'EXPENSE',       'DEBIT',  false, '6000'),
      ('6050', 'Other Expenses',      'EXPENSE',       'DEBIT',  false, '6000')
    ) as v (code, name, type, normal_balance, is_system, parent_code)
    join accounting.accounts p
      on p.organization_id = v_org and p.code = v.parent_code
  on conflict (organization_id, code) do nothing;

  select count(*) into v_after from accounting.accounts where organization_id = v_org;
  return v_after - v_before;
end;
$$;

comment on function public.seed_accounting_chart is
  'Install the starter chart of accounts for the caller''s store. Idempotent: '
  'returns how many accounts it actually added, 0 on a second call. The eight '
  'accounts integrations post to are marked is_system.';

-- -----------------------------------------------------------------------------
-- Reader
--
-- The accounting schema is not exposed to PostgREST, deliberately -- core is
-- not either, and everything a client needs from it arrives through a public
-- function. That keeps one place to refuse from.
-- -----------------------------------------------------------------------------

create or replace function public.my_accounting_accounts()
returns table (
  id              uuid,
  code            text,
  name            text,
  type            text,
  normal_balance  text,
  parent_code     text,
  is_system       boolean,
  active          boolean
)
language plpgsql
security invoker
set search_path = public, accounting, core, pg_temp
as $$
begin
  -- No module check here, and that is not an oversight: §08 keeps reads alive
  -- through every subscription state. The select policy holds the tenant
  -- boundary; this only refuses a staff member who may not look.
  if not (auth_role() = 'admin' or has_permission('accounting.view')) then
    raise exception 'UNAUTHORIZED_ACTION' using hint = 'accounting.view required';
  end if;

  return query
    select a.id, a.code, a.name, a.type::text, a.normal_balance::text,
           p.code, a.is_system, a.active
      from accounting.accounts a
      left join accounting.accounts p on p.id = a.parent_id
     order by a.code;
end;
$$;

comment on function public.my_accounting_accounts is
  'The caller''s chart of accounts. Readable in every subscription state (§08); '
  'it is adding to the chart that requires the module.';

-- -----------------------------------------------------------------------------
-- Grants
--
-- Being explicit rather than trusting a revoke: Supabase''s default privileges
-- hand EXECUTE to anon and service_role as NAMED grantees, so "revoke from
-- public" leaves them holding it. Nothing here is granted to anon.
-- -----------------------------------------------------------------------------

revoke all on schema accounting from public;
grant usage on schema accounting to authenticated;

revoke all on accounting.accounts from public;
grant select, insert, update, delete on accounting.accounts to authenticated;

revoke all on function public.seed_accounting_chart()   from public, anon;
revoke all on function public.my_accounting_accounts()  from public, anon;
grant execute on function public.seed_accounting_chart()  to authenticated;
grant execute on function public.my_accounting_accounts() to authenticated;
