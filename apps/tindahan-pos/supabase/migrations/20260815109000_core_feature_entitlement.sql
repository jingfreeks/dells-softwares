-- =============================================================================
-- Feature entitlement · sell capabilities, not just whole applications
-- -----------------------------------------------------------------------------
-- The platform can currently express three things about what a tenant may
-- use: which of three MODULES they hold (POS, INVENTORY, ACCOUNTING), four
-- numeric LIMITS, and two global feature flags that are kill switches for
-- everyone at once rather than per-tenant entitlements.
--
-- That cannot express the thing the business actually needs: a sari-sari
-- store and a convenience store are both "POS", but they do not want or pay
-- for the same POS. Utang and e-load matter enormously to a neighbourhood
-- shop and not at all to a chain; shift handovers, drawer counts and BIR
-- receipting are the reverse. Today POS is indivisible, so both segments get
-- an identical product.
--
-- This adds the missing layer, mirroring the module design exactly rather
-- than inventing a second vocabulary:
--
--   subscription_plans --> plan_features --> organization_features  <-- truth
--                                                    |
--                                       core.feature_enabled(org, feature)
--
-- A feature belongs to a module. Holding the module is necessary but no
-- longer sufficient, which is what makes tiering possible.
--
-- NOTHING IS ENFORCED HERE, and that is deliberate -- the same discipline
-- 20260815093000 used for modules. This migration is schema, catalogue and
-- backfill only: no policy calls core.feature_enabled(), no application reads
-- it. Switching enforcement on is the moment an entitlement mistake becomes a
-- shop that cannot take utang on a Saturday, and it deserves its own
-- migration with its own audit.
--
-- BEHAVIOUR-PRESERVING BY CONSTRUCTION. Every feature in the catalogue below
-- already ships to every tenant today, so every plan gets every feature and
-- the backfill grants all of them to everyone. Applying this changes nothing
-- for anyone.
--
-- WHICH FEATURES BELONG TO WHICH TIER IS NOT DECIDED HERE. That is a pricing
-- decision, and making it inside a migration would bury it. The machinery and
-- the console are what this delivers; moving a feature out of BASIC is then a
-- one-row change an operator makes deliberately, and the audit records who
-- did it.
--
-- Affected schemas : core (3 new tables, 2 functions, 2 audit triggers)
-- Rollback         : drop the trigger + functions, then the three tables
-- Risk             : low -- additive, unreferenced by any application code,
--                    and every tenant ends holding everything they hold now
-- =============================================================================

-- -----------------------------------------------------------------------------
-- The catalogue: what can be sold separately.
--
-- Every code below names a capability that EXISTS in the app today. Nothing
-- aspirational -- an entitlement for a feature nobody has written is a
-- promise the product cannot keep.
-- -----------------------------------------------------------------------------

create table core.features (
  code         text primary key,
  module_code  text not null references core.modules (code),
  name         text not null,
  description  text,
  -- Lets the catalogue carry something that exists but is not yet sellable,
  -- the same way core.modules does.
  is_sellable  boolean not null default true,
  sort_order   int not null default 0,
  created_at   timestamptz not null default now(),

  constraint features_code_lower check (code = lower(code))
);

comment on table core.features is
  'Platform reference data: capabilities that can be granted per tenant, '
  'each belonging to a module. Holding the module is necessary but not '
  'sufficient -- that is what allows two tenants on POS to have different '
  'POS products.';

create table core.plan_features (
  plan_id      uuid not null references core.subscription_plans (id) on delete cascade,
  feature_code text not null references core.features (code) on delete cascade,
  primary key (plan_id, feature_code)
);

-- The runtime source of truth, shaped like core.organization_modules so the
-- two are read and reasoned about the same way.
create table core.organization_features (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references core.organizations (id) on delete cascade,
  feature_code     text not null references core.features (code),
  enabled          boolean not null default true,
  -- SUBSCRIPTION | MANUAL | TRIAL, exactly as organization_modules.source
  source           text not null default 'SUBSCRIPTION',
  valid_from       timestamptz not null default now(),
  valid_until      timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),

  unique (organization_id, feature_code),
  constraint organization_features_source_valid
    check (source in ('SUBSCRIPTION', 'MANUAL', 'TRIAL'))
);

create index organization_features_org_idx
  on core.organization_features (organization_id, feature_code);

create trigger trg_organization_features_updated_at
  before update on core.organization_features
  for each row execute function core.set_updated_at();

create trigger trg_organization_features_no_tenant_move
  before update on core.organization_features
  for each row execute function core.reject_tenant_reassignment();

alter table core.features                enable row level security;
alter table core.features                force  row level security;
alter table core.plan_features           enable row level security;
alter table core.plan_features           force  row level security;
alter table core.organization_features   enable row level security;
alter table core.organization_features   force  row level security;

-- Reference data: readable by any signed-in staff member, matching the shape
-- core.modules and core.subscription_plans use. `is not null` rather than
-- `true` so an unauthenticated session sees nothing even if it somehow
-- reaches the table -- and so scripts/check-rls-coverage.mjs does not have to
-- carry another blanket-read exemption.
create policy features_select on core.features
  for select to authenticated
  using ( (select core.current_user_id()) is not null );

create policy plan_features_select on core.plan_features
  for select to authenticated
  using ( (select core.current_user_id()) is not null );

-- Tenant-scoped: a store sees only its own entitlements.
create policy organization_features_select on core.organization_features
  for select to authenticated
  using ( (select core.is_org_member(organization_id)) );

-- -----------------------------------------------------------------------------
-- The one question.
--
-- Fails CLOSED for an unknown feature or a tenant with no row, matching
-- core.module_enabled(). That is only safe because the backfill below grants
-- every existing feature to every existing tenant -- an entitlement layer
-- that fails closed over an unseeded catalogue is an outage.
-- -----------------------------------------------------------------------------

create or replace function core.feature_enabled(p_org uuid, p_feature text)
returns boolean
language sql
stable
security definer
set search_path = core, pg_temp
as $$
  select coalesce((
    select f.enabled
       and f.valid_from <= now()
       and (f.valid_until is null or f.valid_until > now())
       -- Holding the feature means nothing without the module it belongs to:
       -- selling "utang" to a tenant who does not hold POS would be a
       -- contradiction the UI could not render.
       and core.module_enabled(p_org, (select module_code from core.features where code = lower(p_feature)))
    from core.organization_features f
    where f.organization_id = p_org and f.feature_code = lower(p_feature)
  ), false);
$$;

comment on function core.feature_enabled is
  'The one feature question. FALSE for an unknown feature, a tenant with no '
  'row, or a tenant who does not hold the owning module -- fails closed.';

-- What the client asks once, to decide what to render.
create or replace function core.my_features(p_org uuid)
returns table (feature_code text, module_code text, name text, enabled boolean)
language sql
stable
security definer
set search_path = core, pg_temp
as $$
  select f.code, f.module_code, f.name, core.feature_enabled(p_org, f.code)
  from core.features f
  where core.is_org_member(p_org)   -- not a member: zero rows, not a leak
  order by f.module_code, f.sort_order, f.code;
$$;

-- -----------------------------------------------------------------------------
-- Materialization, mirroring core.materialize_subscription_modules().
-- -----------------------------------------------------------------------------

create or replace function core.materialize_subscription_features(p_org uuid)
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

  insert into core.organization_features (organization_id, feature_code, enabled, source)
  select p_org, pf.feature_code, true, 'SUBSCRIPTION'
  from core.plan_features pf
  where pf.plan_id = v_plan
  on conflict (organization_id, feature_code) do update
    set enabled    = true,
        updated_at = now()
    -- A manual grant outranks the plan, exactly as for modules: a comped
    -- feature must survive a plan change rather than expiring on renewal.
    where core.organization_features.source <> 'MANUAL';

  get diagnostics v_count = row_count;

  update core.organization_features f
     set enabled = false, updated_at = now()
   where f.organization_id = p_org
     and f.source = 'SUBSCRIPTION'
     and f.enabled
     and not exists (
       select 1 from core.plan_features pf
       where pf.plan_id = v_plan and pf.feature_code = f.feature_code
     );

  return v_count;
end;
$$;

comment on function core.materialize_subscription_features is
  'Re-derives organization_features from the org''s live subscription. '
  'Idempotent. MANUAL grants are never overwritten.';

-- Table grants, mirroring what 20260815093000 gives the module tables. RLS is
-- still the boundary; without the grant the policies above would be dead
-- letters and these tables would behave differently from their module
-- counterparts for no reason.
grant select on core.features, core.plan_features, core.organization_features
  to authenticated, app_pos, app_inv, app_acc, app_admin;

grant insert, update on core.features, core.plan_features, core.organization_features
  to authenticated;

grant execute on function core.feature_enabled(uuid, text)                  to authenticated, app_pos, app_inv, app_acc, app_admin;
grant execute on function core.my_features(uuid)                            to authenticated;
grant execute on function core.materialize_subscription_features(uuid)      to authenticated;

create trigger trg_organization_features_audit
  after insert or update or delete on core.organization_features
  for each row execute function core.audit_trigger('CORE', 'OrganizationFeature');

-- -----------------------------------------------------------------------------
-- Seed: capabilities that exist in the app today.
-- -----------------------------------------------------------------------------

insert into core.features (code, module_code, name, description, sort_order) values
  ('pos.utang',          'POS', 'Utang (customer credit)', 'Sell on credit, track balances, record payments.',          1),
  ('pos.eload',          'POS', 'E-load and cash-in',      'Sell load and record GCash cash-in as services.',           2),
  ('pos.shifts',         'POS', 'Shifts and drawer',       'Cashier sessions, opening float, drawer variance.',         3),
  ('pos.void',           'POS', 'Void a sale',             'Reverse a completed sale, with reason and audit.',          4),
  ('pos.discounts',      'POS', 'Discounts',               'Apply a discount at checkout.',                             5),
  ('pos.pack_pricing',   'POS', 'Pack pricing',            'Sell by pack as well as by piece.',                         6),
  ('pos.held_sales',     'POS', 'Held sales',              'Park a sale and return to it.',                             7),
  ('pos.multi_register', 'POS', 'Multiple registers',      'Pair more than one device to the store.',                   8),
  ('pos.bir_receipts',   'POS', 'BIR receipting',          'VAT breakdown and BIR-compliant receipt numbering.',        9),
  ('inventory.suppliers',       'INVENTORY', 'Suppliers',        'Supplier directory and scan sheets.',                 1),
  ('inventory.purchase_orders', 'INVENTORY', 'Purchase orders',  'Raise and track orders to suppliers.',                2),
  ('inventory.receiving',       'INVENTORY', 'Receiving',        'Receive stock against an order or ad hoc.',           3),
  ('inventory.transfers',       'INVENTORY', 'Stock transfers',  'Move stock between warehouses.',                      4),
  ('inventory.stock_count',     'INVENTORY', 'Stock counts',     'Physical counts and variance against book stock.',    5),
  ('inventory.conversions',     'INVENTORY', 'Unit conversions', 'Sell in units different from how stock is held.',     6)
on conflict (code) do nothing;

-- Every plan gets every feature.
--
-- This is the behaviour-preserving choice and it is also the honest one: all
-- of these ship to all tenants today, so any other split would be a silent
-- price rise decided in a migration. Moving a feature out of BASIC is a
-- deliberate act, made in the console, recorded in the audit.
insert into core.plan_features (plan_id, feature_code)
select p.id, f.code
from core.subscription_plans p
cross join core.features f
on conflict do nothing;

-- Backfill every organization that exists right now.
select core.materialize_subscription_features(o.id)
from core.organizations o
where o.status <> 'CANCELLED';

-- -----------------------------------------------------------------------------
-- Wire materialization into the two places entitlement already changes.
--
-- Without this a brand-new tenant would hold modules but no features, and a
-- plan change would move modules while leaving features on the old plan --
-- the two would drift apart silently, which is the failure mode that makes
-- entitlement bugs so hard to see.
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
  perform core.materialize_subscription_features(new.id);

  return new;
exception
  when others then
    -- A signup must not fail because entitlement provisioning did.
    raise warning 'core.grant_default_subscription failed for org %: %', new.id, sqlerrm;
    return new;
end;
$$;

-- platform_set_plan(), unchanged from 20260815100000 except that it now
-- re-derives features alongside modules. Repeated in full because Postgres
-- has no way to add a statement to an existing function body.
create or replace function public.platform_set_plan(
  p_org       uuid,
  p_plan_code text,
  p_reason    text default null
)
returns void
language plpgsql
security definer
set search_path = public, core, pg_temp
as $$
declare
  v_plan     uuid;
  v_old_plan text;
  v_sub      uuid;
begin
  if not core.is_platform_admin('BILLING') then
    raise exception 'UNAUTHORIZED_ACTION' using errcode = 'P0001';
  end if;

  select id into v_plan
  from core.subscription_plans
  where code = upper(p_plan_code) and is_active;

  if v_plan is null then
    raise exception 'VALIDATION_FAILED: unknown or inactive plan %', p_plan_code
      using errcode = 'P0001';
  end if;

  if not exists (select 1 from core.organizations where id = p_org) then
    raise exception 'VALIDATION_FAILED: unknown organization' using errcode = 'P0001';
  end if;

  select s.id, p.code into v_sub, v_old_plan
  from core.organization_subscriptions s
  join core.subscription_plans p on p.id = s.plan_id
  where s.organization_id = p_org and s.status <> 'CANCELLED'
  limit 1;

  if v_sub is null then
    insert into core.organization_subscriptions (organization_id, plan_id, status, notes)
    values (p_org, v_plan, 'ACTIVE', p_reason);
  else
    -- Plan and billing state are separate decisions. Leave the status alone.
    update core.organization_subscriptions
       set plan_id = v_plan, updated_at = now()
     where id = v_sub;
  end if;

  perform core.materialize_subscription_modules(p_org);
  perform core.materialize_subscription_features(p_org);

  perform core.write_platform_audit(
    'PLATFORM_SET_PLAN', 'OrganizationSubscription', p_org,
    jsonb_build_object('plan', v_old_plan),
    jsonb_build_object('plan', upper(p_plan_code)),
    p_reason
  );
end;
$$;
