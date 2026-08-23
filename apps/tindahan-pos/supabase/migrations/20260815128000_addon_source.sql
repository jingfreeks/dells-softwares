-- =============================================================================
-- A real ADDON entitlement source, starting with the Accounting module
-- -----------------------------------------------------------------------------
-- An "add-on" already works mechanically today: platform_set_feature()/
-- platform_set_module() write a MANUAL-sourced row that both materialize
-- functions already protect from plan changes and trial cycles, and the
-- console already has full grant/toggle/reset-to-plan UI for it. What's
-- missing is a way to tell "tenant is paying for this on top of their
-- plan" apart from "support comped this" -- both currently look identical
-- (MANUAL) -- and a self-serve way to ask for one.
--
-- No self-serve activation: unlike start_trial(), an add-on has no natural
-- expiry to bound an unbilled standing grant, and this app has no real
-- checkout to bill it through. This stays console-granted, matching
-- request_plan_upgrade()'s "record a request, a human fulfills it" shape.
--
-- Scoped to one add-on: core.modules already seeds ACCOUNTING
-- (is_sellable = true), currently bundled only into PRO/ENTERPRISE and
-- gated for real by core.module_enabled() -- the pricing document's own
-- add-on example, needing zero new catalog data.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Widen both source check constraints to allow ADDON -- same one-line
--    pattern already used twice (GRANDFATHERED, TRIAL). No data migration:
--    nothing has this source value yet.
-- ---------------------------------------------------------------------------
alter table core.organization_features
  drop constraint organization_features_source_valid;
alter table core.organization_features
  add constraint organization_features_source_valid
  check (source in ('SUBSCRIPTION', 'MANUAL', 'TRIAL', 'GRANDFATHERED', 'ADDON'));

alter table core.organization_modules
  drop constraint organization_modules_source_valid;
alter table core.organization_modules
  add constraint organization_modules_source_valid
  check (source in ('SUBSCRIPTION', 'MANUAL', 'TRIAL', 'ADDON'));

-- ---------------------------------------------------------------------------
-- 2. Close the one real asymmetry found: materialize_subscription_modules()
--    only ever protected MANUAL, not (yet) GRANDFATHERED-equivalent sources.
--    Widen it to also protect ADDON, matching the features-side function's
--    existing `not in (...)` shape.
-- ---------------------------------------------------------------------------
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

  insert into core.organization_modules (organization_id, module_code, enabled, source, limits)
  select p_org, pm.module_code, true, 'SUBSCRIPTION', pm.limits
  from core.plan_modules pm
  where pm.plan_id = v_plan
  on conflict (organization_id, module_code) do update
    set enabled    = true,
        limits     = excluded.limits,
        updated_at = now()
    -- A grant that outranks the plan must survive a plan change: MANUAL
    -- because a human decided it, ADDON because the tenant is paying for
    -- it independent of tier.
    where core.organization_modules.source not in ('MANUAL', 'ADDON');

  get diagnostics v_count = row_count;

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

-- Same widening for the features side -- it already used `not in (...)`, so
-- this is purely adding ADDON to that list, no shape change.
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
    where core.organization_features.source not in ('MANUAL', 'GRANDFATHERED', 'ADDON');

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

-- ---------------------------------------------------------------------------
-- 3. platform_set_module() gains an optional source. Every existing caller
--    keeps working unchanged (default preserves today's behavior).
--    platform_set_feature() is deliberately NOT touched -- nothing requests
--    a feature-level add-on yet, and extending it now would be designing
--    for a need that doesn't exist.
-- ---------------------------------------------------------------------------
-- Postgres resolves function overloads by parameter TYPE LIST, not names --
-- adding p_source (even with a default) makes this a genuinely new 5-arg
-- overload alongside the existing 4-arg one, not a replacement of it. Every
-- existing 4-arg call site becomes ambiguous ("not unique") between the two
-- unless the old signature is dropped first. Same lesson as
-- my_store_billing_state()'s RETURNS TABLE change earlier this session.
drop function if exists public.platform_set_module(uuid, text, boolean, text);

create function public.platform_set_module(
  p_org     uuid,
  p_module  text,
  p_enabled boolean,
  p_reason  text default null,
  p_source  text default 'MANUAL'
)
returns void
language plpgsql
security definer
set search_path = public, core, pg_temp
as $$
declare
  v_before boolean;
begin
  if not core.is_platform_admin() then
    raise exception 'UNAUTHORIZED_ACTION' using errcode = 'P0001';
  end if;

  if p_source not in ('MANUAL', 'ADDON') then
    raise exception 'VALIDATION_FAILED: unknown source %', p_source using errcode = 'P0001';
  end if;

  if not exists (select 1 from core.modules where code = upper(p_module)) then
    raise exception 'VALIDATION_FAILED: unknown module %', p_module using errcode = 'P0001';
  end if;

  if exists (select 1 from core.modules where code = upper(p_module) and is_core) then
    raise exception 'VALIDATION_FAILED: the CORE module cannot be disabled'
      using errcode = 'P0001';
  end if;

  if not exists (select 1 from core.organizations where id = p_org) then
    raise exception 'VALIDATION_FAILED: unknown organization' using errcode = 'P0001';
  end if;

  v_before := core.module_enabled(p_org, p_module);

  insert into core.organization_modules (organization_id, module_code, enabled, source)
  values (p_org, upper(p_module), p_enabled, p_source)
  on conflict (organization_id, module_code) do update
    set enabled    = excluded.enabled,
        source     = p_source,
        valid_until = null,
        updated_at = now();

  perform core.write_platform_audit(
    case when p_enabled then 'PLATFORM_ENABLE_MODULE' else 'PLATFORM_DISABLE_MODULE' end,
    'OrganizationModule', p_org,
    jsonb_build_object('module', upper(p_module), 'enabled', v_before),
    jsonb_build_object('module', upper(p_module), 'enabled', p_enabled, 'source', p_source),
    p_reason
  );
end;
$$;

-- The DROP above lost the original grants (they don't survive a drop, only
-- a plain CREATE OR REPLACE). Re-grant explicitly, and revoke from
-- anon/service_role up front this time too -- same discipline as every
-- other RPC touched this session, applied here even though nothing asked
-- for it yet.
revoke all on function public.platform_set_module(uuid, text, boolean, text, text)
  from public, anon, service_role;
grant execute on function public.platform_set_module(uuid, text, boolean, text, text)
  to authenticated;

-- ---------------------------------------------------------------------------
-- 4. request_addon() -- the self-serve request, same shape as
--    request_plan_upgrade(): a literal allowlist (one item today), append
--    a note, no self-activation.
-- ---------------------------------------------------------------------------
create or replace function public.request_addon(p_module_code text)
returns void
language plpgsql
security definer
set search_path = public, core, pg_temp
as $$
declare
  v_store_id uuid := auth_store_id();
begin
  if v_store_id is null then
    raise exception 'Not a registered staff member of any store';
  end if;
  if p_module_code not in ('ACCOUNTING') then
    raise exception 'INVALID_ADDON_REQUEST';
  end if;

  update core.organization_subscriptions
    set notes = coalesce(notes || E'\n', '')
      || format('Requested add-on: %s on %s', p_module_code, now()::date)
    where organization_id = v_store_id;
end;
$$;

comment on function public.request_addon is
  'A signed-in tenant asking for an add-on module (ACCOUNTING only, for '
  'now) independent of their plan tier -- records the request as a note '
  'for a platform admin to fulfill via platform_set_module(..., p_source '
  '=> ''ADDON''). Never activates anything itself.';

revoke all on function public.request_addon(text) from public, anon, service_role;
grant execute on function public.request_addon(text) to authenticated;
