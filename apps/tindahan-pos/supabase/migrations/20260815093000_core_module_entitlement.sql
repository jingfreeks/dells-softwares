-- =============================================================================
-- Core · Module entitlement (Architecture v1 §08, prompt §7)
-- -----------------------------------------------------------------------------
-- "Plans are marketing. Entitlements are truth. The application asks
--  organization_modules, never the plan name."
--
-- This is the schema the Super Admin app needs in order to answer "which
-- applications may this organization use" -- POS, Inventory, and future
-- modules -- and to turn one on or off for one tenant without a deploy.
--
--   subscription_plans --> plan_modules --> organization_subscriptions
--                                                    |
--                                       materialize  v
--                                          organization_modules   <-- truth
--                                                    |
--                                        core.module_enabled(org, module)
--
-- A manual grant by a platform admin (pilot, comp, migration) writes
-- organization_modules directly, bypassing the plan -- which is why the
-- plan is never consulted at runtime.
--
-- SCOPE: schema, seed and backfill only. NOTHING ENFORCES THIS YET -- no
-- application reads core.module_enabled(), and no RLS policy calls it. That
-- makes this migration additive and behaviour-preserving by construction.
-- Enforcement is a deliberate separate step, because switching it on is the
-- moment an entitlement mistake becomes a customer locked out of an app they
-- are paying for.
--
-- Deliberately NOT included, and why:
--   * Limit enforcement. `limits` is seeded as data (branches/devices/
--     products) and is readable, but no constraint trigger enforces it.
--     Architecture v1 specifies enforcement via constraint triggers; adding
--     them here could instantly break a tenant who is ALREADY over a limit
--     we just invented. Enforcement needs an "is anyone already over?" audit
--     first, then its own migration.
--   * Grace/downgrade behaviour (§08's PAST_DUE -> SUSPENDED -> CANCELLED
--     read-only ladder). The subscription statuses exist so the states are
--     representable; the read-only-on-suspend behaviour belongs with
--     enforcement, not with the schema.
--
-- Affected schemas : core (new tables only; no existing table is altered)
-- Rollback         : drop the trigger + 2 functions, then drop tables
--                    organization_modules, organization_subscriptions,
--                    plan_modules, subscription_plans, modules (cascade)
-- Risk             : low -- additive, unreferenced by any application code
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Reference data: what can be sold, and what bundles exist
-- -----------------------------------------------------------------------------

create table core.modules (
  code         text primary key,
  name         text not null,
  description  text,
  -- CORE is always on and is not sellable; see core.module_enabled().
  is_core      boolean not null default false,
  -- Lets the Super Admin list modules that exist but cannot yet be sold.
  is_sellable  boolean not null default true,
  sort_order   int not null default 0,
  created_at   timestamptz not null default now(),

  constraint modules_code_upper check (code = upper(code))
);

comment on table core.modules is
  'Platform reference data: the applications that can be enabled per tenant. '
  'Not tenant-scoped -- the same catalogue for everyone.';

create table core.subscription_plans (
  id           uuid primary key default gen_random_uuid(),
  code         text not null unique,
  name         text not null,
  description  text,
  -- Nullable: ENTERPRISE and bespoke deals are priced per contract.
  price_php    numeric(12, 2),
  -- MONTHLY | YEARLY | null (perpetual/bespoke)
  billing_interval text,
  is_active    boolean not null default true,
  sort_order   int not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),

  constraint subscription_plans_code_upper check (code = upper(code)),
  constraint subscription_plans_price_non_negative check (price_php is null or price_php >= 0)
);

comment on table core.subscription_plans is
  'Marketing packaging. Never consulted at runtime -- plans write into '
  'organization_modules, and that is what gets read.';

create trigger trg_subscription_plans_updated_at
  before update on core.subscription_plans
  for each row execute function core.set_updated_at();

create table core.plan_modules (
  plan_id      uuid not null references core.subscription_plans (id) on delete cascade,
  module_code  text not null references core.modules (code) on delete restrict,
  -- Copied onto organization_modules.limits when the plan is materialized.
  limits       jsonb not null default '{}'::jsonb,

  primary key (plan_id, module_code)
);

-- -----------------------------------------------------------------------------
-- Per-tenant subscription
-- -----------------------------------------------------------------------------

create table core.organization_subscriptions (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references core.organizations (id) on delete restrict,
  plan_id          uuid not null references core.subscription_plans (id) on delete restrict,

  -- TRIALING | ACTIVE | PAST_DUE | SUSPENDED | CANCELLED
  status           text not null default 'ACTIVE',
  trial_ends_at    timestamptz,
  current_period_start timestamptz not null default now(),
  current_period_end   timestamptz,
  cancelled_at     timestamptz,
  notes            text,

  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),

  constraint organization_subscriptions_status_valid
    check (status in ('TRIALING', 'ACTIVE', 'PAST_DUE', 'SUSPENDED', 'CANCELLED'))
);

-- One live subscription per organization; cancelled ones are kept as history.
create unique index organization_subscriptions_one_live
  on core.organization_subscriptions (organization_id)
  where status <> 'CANCELLED';

create index organization_subscriptions_org_idx
  on core.organization_subscriptions (organization_id, status);

create trigger trg_organization_subscriptions_updated_at
  before update on core.organization_subscriptions
  for each row execute function core.set_updated_at();

create trigger trg_organization_subscriptions_no_tenant_move
  before update on core.organization_subscriptions
  for each row execute function core.reject_tenant_reassignment();

-- -----------------------------------------------------------------------------
-- The runtime source of truth (DDL per Architecture v1 §08)
-- -----------------------------------------------------------------------------

create table core.organization_modules (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references core.organizations (id) on delete cascade,
  module_code      text not null references core.modules (code) on delete restrict,
  enabled          boolean not null default true,
  -- SUBSCRIPTION | MANUAL | TRIAL
  source           text not null default 'SUBSCRIPTION',
  valid_from       timestamptz not null default now(),
  valid_until      timestamptz,                          -- null = open ended
  limits           jsonb not null default '{}'::jsonb,   -- {"branches":3,"devices":5}
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),

  unique (organization_id, module_code),
  constraint organization_modules_source_valid
    check (source in ('SUBSCRIPTION', 'MANUAL', 'TRIAL'))
);

comment on table core.organization_modules is
  'The only table consulted at runtime to decide whether a tenant may use an '
  'application. Written by plan materialization or by a platform admin grant.';

create index organization_modules_org_idx
  on core.organization_modules (organization_id, module_code);

create trigger trg_organization_modules_updated_at
  before update on core.organization_modules
  for each row execute function core.set_updated_at();

create trigger trg_organization_modules_no_tenant_move
  before update on core.organization_modules
  for each row execute function core.reject_tenant_reassignment();

-- -----------------------------------------------------------------------------
-- The single entitlement check (per Architecture v1 §08)
-- -----------------------------------------------------------------------------

create or replace function core.module_enabled(p_org uuid, p_module text)
returns boolean
language sql
stable
security definer
set search_path = core, pg_temp
as $$
  select coalesce((
    select om.enabled
       and om.valid_from <= now()
       and (om.valid_until is null or om.valid_until > now())
    from core.organization_modules om
    where om.organization_id = p_org and om.module_code = upper(p_module)
  ), p_module ilike 'core');   -- core is always on
$$;

comment on function core.module_enabled is
  'The one entitlement question. Returns FALSE for an unknown module or an '
  'organization with no row -- fails closed. CORE is the sole exception.';

-- What the client asks once, to render its navigation.
create or replace function core.my_modules(p_org uuid)
returns table (module_code text, name text, enabled boolean, limits jsonb)
language sql
stable
security definer
set search_path = core, pg_temp
as $$
  select m.code, m.name,
         core.module_enabled(p_org, m.code),
         coalesce(om.limits, '{}'::jsonb)
  from core.modules m
  left join core.organization_modules om
    on om.organization_id = p_org and om.module_code = m.code
  where core.is_org_member(p_org)   -- not a member: zero rows, not a leak
  order by m.sort_order, m.code;
$$;

-- -----------------------------------------------------------------------------
-- Plan materialization: plan_modules -> organization_modules
-- -----------------------------------------------------------------------------

create or replace function core.materialize_subscription_modules(p_org uuid)
returns int
language plpgsql
security definer
set search_path = core, pg_temp
as $$
declare
  v_plan  uuid;
  v_count int := 0;
begin
  select s.plan_id into v_plan
  from core.organization_subscriptions s
  where s.organization_id = p_org and s.status <> 'CANCELLED'
  limit 1;

  if v_plan is null then
    return 0;
  end if;

  -- Grant/refresh everything the plan includes.
  insert into core.organization_modules (organization_id, module_code, enabled, source, limits)
  select p_org, pm.module_code, true, 'SUBSCRIPTION', pm.limits
  from core.plan_modules pm
  where pm.plan_id = v_plan
  on conflict (organization_id, module_code) do update
    set enabled    = true,
        limits     = excluded.limits,
        updated_at = now()
    -- A manual grant outranks the plan: a comped module must survive a
    -- plan change, or support's promise silently expires on renewal.
    where core.organization_modules.source <> 'MANUAL';

  get diagnostics v_count = row_count;

  -- Revoke anything the plan no longer includes -- again never touching a
  -- manual grant. Disabled, never deleted: §08 requires the data to stay.
  update core.organization_modules om
     set enabled = false, updated_at = now()
   where om.organization_id = p_org
     and om.source = 'SUBSCRIPTION'
     and om.enabled
     and not exists (
       select 1 from core.plan_modules pm
       where pm.plan_id = v_plan and pm.module_code = om.module_code
     );

  return v_count;
end;
$$;

comment on function core.materialize_subscription_modules is
  'Re-derives organization_modules from the org''s live subscription. '
  'Idempotent. MANUAL grants are never overwritten.';

-- -----------------------------------------------------------------------------
-- Seed: the catalogue
-- -----------------------------------------------------------------------------

insert into core.modules (code, name, description, is_core, is_sellable, sort_order) values
  ('CORE',       'Core Platform', 'Organizations, staff, branches, audit. Always enabled.', true,  false, 0),
  ('POS',        'Point of Sale', 'Register, checkout, receipts, cash sessions, shifts.',   false, true,  1),
  ('INVENTORY',  'Inventory',     'Products, suppliers, purchasing, warehouses, stock.',    false, true,  2),
  ('ACCOUNTING', 'Accounting',    'Chart of accounts, journals, expenses, tax.',            false, true,  3)
on conflict (code) do nothing;

insert into core.subscription_plans (code, name, description, price_php, billing_interval, sort_order) values
  ('FREE',       'Free',       'A single register. POS only.',                   0,    'MONTHLY', 0),
  ('BASIC',      'Basic',      'POS and Inventory.',                             null, 'MONTHLY', 1),
  ('PRO',        'Pro',        'POS, Inventory and Accounting.',                 null, 'MONTHLY', 2),
  ('ENTERPRISE', 'Enterprise', 'Everything, with limits agreed per contract.',   null, null,      3)
on conflict (code) do nothing;

-- Plan contents. Limits are seeded as DATA ONLY -- nothing enforces them yet.
insert into core.plan_modules (plan_id, module_code, limits)
select p.id, v.module_code, v.limits
from (values
  ('FREE',       'POS',        '{"branches":1,"devices":1,"products":300}'::jsonb),
  ('BASIC',      'POS',        '{"branches":1,"devices":3,"products":5000}'::jsonb),
  ('BASIC',      'INVENTORY',  '{"warehouses":3}'::jsonb),
  ('PRO',        'POS',        '{"branches":5,"devices":10,"products":50000}'::jsonb),
  ('PRO',        'INVENTORY',  '{"warehouses":20}'::jsonb),
  ('PRO',        'ACCOUNTING', '{}'::jsonb),
  ('ENTERPRISE', 'POS',        '{}'::jsonb),
  ('ENTERPRISE', 'INVENTORY',  '{}'::jsonb),
  ('ENTERPRISE', 'ACCOUNTING', '{}'::jsonb)
) as v(plan_code, module_code, limits)
join core.subscription_plans p on p.code = v.plan_code
on conflict (plan_id, module_code) do nothing;

-- -----------------------------------------------------------------------------
-- Backfill: every organization that exists today
--
-- BASIC, because that is exactly what these tenants can already do: both
-- tindahan-pos and inventory-app point at this one project, and any staff
-- member can sign into either. Granting less would REMOVE access the moment
-- enforcement lands; granting PRO would hand out an Accounting module that
-- does not exist yet. Preserving today's behaviour is the whole point.
--
-- Which plan a new customer should actually get is a commercial decision,
-- not a migration decision -- see the note on the trigger below.
-- -----------------------------------------------------------------------------

insert into core.organization_subscriptions (organization_id, plan_id, status, notes)
select o.id, p.id, 'ACTIVE',
       'Backfilled at core integration. Mirrors pre-integration access (POS + Inventory).'
from core.organizations o
cross join core.subscription_plans p
where p.code = 'BASIC'
  and o.status <> 'CANCELLED'
  and not exists (
    select 1 from core.organization_subscriptions s
    where s.organization_id = o.id and s.status <> 'CANCELLED'
  );

select core.materialize_subscription_modules(o.id)
from core.organizations o
where o.status <> 'CANCELLED';

-- -----------------------------------------------------------------------------
-- Going forward: a new organization gets the default plan automatically.
--
-- Without this, core.module_enabled() answers FALSE for every module of a
-- brand-new tenant -- so the first customer to sign up after enforcement
-- lands would reach an empty application. The default is BASIC to match
-- what a signup can do today; tightening it (e.g. FREE, or a trial) is a
-- pricing decision to make deliberately, by changing this one code.
-- -----------------------------------------------------------------------------

create or replace function core.grant_default_subscription()
returns trigger
language plpgsql
security definer
set search_path = core, pg_temp
as $$
declare
  v_plan uuid;
begin
  select id into v_plan from core.subscription_plans where code = 'BASIC';
  if v_plan is null then
    return new;
  end if;

  insert into core.organization_subscriptions (organization_id, plan_id, status, notes)
  values (new.id, v_plan, 'ACTIVE', 'Default plan granted on organization creation.')
  on conflict do nothing;

  perform core.materialize_subscription_modules(new.id);

  return new;
exception
  when others then
    -- A signup must not fail because entitlement provisioning did.
    raise warning 'core.grant_default_subscription failed for org %: %', new.id, sqlerrm;
    return new;
end;
$$;

create trigger trg_organizations_default_subscription
  after insert on core.organizations
  for each row execute function core.grant_default_subscription();

-- -----------------------------------------------------------------------------
-- RLS
--
-- Reference data (modules, plans, plan contents) is readable by any signed-in
-- user -- an upgrade prompt has to be able to name what it is selling.
-- Per-tenant rows are readable by that tenant's members only. Writes are
-- platform-admin only: entitlement is sold, never self-granted.
-- -----------------------------------------------------------------------------

alter table core.modules                    enable row level security;
alter table core.modules                    force  row level security;
alter table core.subscription_plans         enable row level security;
alter table core.subscription_plans         force  row level security;
alter table core.plan_modules               enable row level security;
alter table core.plan_modules               force  row level security;
alter table core.organization_subscriptions enable row level security;
alter table core.organization_subscriptions force  row level security;
alter table core.organization_modules       enable row level security;
alter table core.organization_modules       force  row level security;

create policy modules_select on core.modules
  for select to authenticated
  using ( (select core.current_user_id()) is not null );

create policy modules_write on core.modules
  for all to authenticated
  using      ( (select core.is_platform_admin()) )
  with check ( (select core.is_platform_admin()) );

create policy subscription_plans_select on core.subscription_plans
  for select to authenticated
  using ( (select core.current_user_id()) is not null );

create policy subscription_plans_write on core.subscription_plans
  for all to authenticated
  using      ( (select core.is_platform_admin('BILLING')) )
  with check ( (select core.is_platform_admin('BILLING')) );

create policy plan_modules_select on core.plan_modules
  for select to authenticated
  using ( (select core.current_user_id()) is not null );

create policy plan_modules_write on core.plan_modules
  for all to authenticated
  using      ( (select core.is_platform_admin('BILLING')) )
  with check ( (select core.is_platform_admin('BILLING')) );

-- A tenant may SEE what it is subscribed to; only billing may change it.
create policy organization_subscriptions_select on core.organization_subscriptions
  for select to authenticated
  using ( (select core.is_org_member(organization_id)) or (select core.is_platform_admin()) );

create policy organization_subscriptions_write on core.organization_subscriptions
  for all to authenticated
  using      ( (select core.is_platform_admin('BILLING')) )
  with check ( (select core.is_platform_admin('BILLING')) );

create policy organization_modules_select on core.organization_modules
  for select to authenticated
  using ( (select core.is_org_member(organization_id)) or (select core.is_platform_admin()) );

create policy organization_modules_write on core.organization_modules
  for all to authenticated
  using      ( (select core.is_platform_admin()) )
  with check ( (select core.is_platform_admin()) );

-- -----------------------------------------------------------------------------
-- Grants. As elsewhere in core: grant the verb broadly, let RLS decide rows.
-- No DELETE anywhere -- entitlement history is disabled, never removed.
-- -----------------------------------------------------------------------------

grant select on core.modules, core.subscription_plans, core.plan_modules,
                core.organization_subscriptions, core.organization_modules
  to authenticated, app_pos, app_inv, app_acc, app_admin;

grant insert, update on core.modules, core.subscription_plans, core.plan_modules,
                         core.organization_subscriptions, core.organization_modules
  to authenticated;

grant execute on function core.module_enabled(uuid, text)                to authenticated, app_pos, app_inv, app_acc, app_admin;
grant execute on function core.my_modules(uuid)                          to authenticated;
grant execute on function core.materialize_subscription_modules(uuid)    to authenticated;

-- Audit every entitlement change: who turned Accounting on for whom, and when.
create trigger trg_organization_modules_audit
  after insert or update or delete on core.organization_modules
  for each row execute function core.audit_trigger('CORE', 'OrganizationModule');

create trigger trg_organization_subscriptions_audit
  after insert or update or delete on core.organization_subscriptions
  for each row execute function core.audit_trigger('CORE', 'OrganizationSubscription');
