-- =============================================================================
-- Platform · see and change the limits that are now enforced
-- -----------------------------------------------------------------------------
-- 20260815102000 made the numeric limits real. It did not give anyone a way
-- to see them or change them, which repeats a mistake this console has made
-- once already: platform_set_module() shipped as the only entitlement action
-- and quietly opted modules out of plan control because nothing could hand
-- them back.
--
-- The same shape here. A customer writes in saying they cannot add a fourth
-- warehouse. The operator can see the tenant's plan in the console, but not
-- what their ceiling is, not how close they are to it, and has no way to
-- raise it -- so the only available answer is to open a SQL editor and hand-
-- edit organization_modules.limits on a production row. Enforcement without
-- an operator control is not a finished feature.
--
-- ONE DEFINITION OF "HOW MANY DO THEY HAVE". The counting rules are subtle
-- (retired devices and CLOSED branches do not count) and they were written
-- inline in four trigger functions. Reporting them separately would mean two
-- implementations that must agree forever, and the failure mode is the worst
-- kind: a console showing 2 of 3 while the trigger refuses the next insert,
-- with nothing to explain the discrepancy. So core.limit_usage() becomes the
-- single definition and the four triggers are rewritten to call it. The
-- console then reports exactly the number the trigger enforces, because it
-- is the same number.
--
-- (supabase/snippets/limit-audit.sql deliberately keeps its own copy of the
-- rules: it is meant to run against a database BEFORE the enforcement
-- migration is applied, where this function does not exist yet.)
--
-- Affected schemas : core (1 new function, 4 trigger functions rewritten to
--                    use it -- no behaviour change), public (2 new functions)
-- Rollback         : drop the two public functions; restore the four trigger
--                    bodies from 20260815102000; drop core.limit_usage
-- Risk             : low -- the rewrite is mechanical and the pgTAP suite for
--                    20260815102000 passes unchanged, which is the check that
--                    matters
-- =============================================================================

-- -----------------------------------------------------------------------------
-- How many does this organization currently have?
--
-- The rules, restated once so they live in one place:
--   devices     only still-paired (unpaired_at is null) -- a store must not be
--               penalised for having replaced a broken terminal
--   branches    excludes CLOSED, same reasoning
--   products    every row; there is no archive flag
--   warehouses  every row, including the default one created with the store
-- -----------------------------------------------------------------------------

create or replace function core.limit_usage(p_org uuid, p_key text)
returns int
language sql
stable
security definer
set search_path = core, public, pg_temp
as $$
  select case p_key
    when 'devices' then
      (select count(*)::int from public.devices
        where store_id = p_org and unpaired_at is null)
    when 'products' then
      (select count(*)::int from public.products where store_id = p_org)
    when 'warehouses' then
      (select count(*)::int from public.warehouses where store_id = p_org)
    when 'branches' then
      (select count(*)::int from core.branches
        where organization_id = p_org and status <> 'CLOSED')
  end;
$$;

comment on function core.limit_usage is
  'The single definition of "how many does this tenant have" for each limit '
  'key. Both the enforcement triggers and the console read it, so the number '
  'an operator sees is by construction the number the trigger enforces. '
  'Returns NULL for a key with no countable resource.';

-- Relies on store.id = organization.id, preserved by the Step 3 backfill --
-- the same assumption public.current_store_has_module() documents.

-- -----------------------------------------------------------------------------
-- The four triggers, now sharing that definition. Behaviour is identical;
-- 170_plan_limits passes unchanged, which is the point of doing it this way.
-- -----------------------------------------------------------------------------

create or replace function public.enforce_device_limit()
returns trigger
language plpgsql
security definer
set search_path = public, core, pg_temp
as $$
begin
  perform core.enforce_limit(new.store_id, 'POS', 'devices',
                             core.limit_usage(new.store_id, 'devices'));
  return new;
end;
$$;

create or replace function public.enforce_product_limit()
returns trigger
language plpgsql
security definer
set search_path = public, core, pg_temp
as $$
begin
  perform core.enforce_limit(new.store_id, 'POS', 'products',
                             core.limit_usage(new.store_id, 'products'));
  return new;
end;
$$;

create or replace function public.enforce_warehouse_limit()
returns trigger
language plpgsql
security definer
set search_path = public, core, pg_temp
as $$
begin
  perform core.enforce_limit(new.store_id, 'INVENTORY', 'warehouses',
                             core.limit_usage(new.store_id, 'warehouses'));
  return new;
end;
$$;

create or replace function core.enforce_branch_limit()
returns trigger
language plpgsql
security definer
set search_path = core, pg_temp
as $$
begin
  perform core.enforce_limit(new.organization_id, 'POS', 'branches',
                             core.limit_usage(new.organization_id, 'branches'));
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- What the console reads: every limit this tenant has, with live usage.
--
-- Returns a row per limit key actually present in organization_modules.limits
-- rather than a fixed list, so a limit added to a plan later shows up here
-- without another migration.
-- -----------------------------------------------------------------------------

create or replace function public.platform_organization_limits(p_org uuid)
returns table (
  module_code   text,
  limit_key     text,
  cap           int,
  current_usage int,
  at_or_over    boolean
)
language sql
stable
security definer
set search_path = public, core, pg_temp
as $$
  select
    om.module_code,
    kv.key,
    nullif(kv.value #>> '{}', '')::int,
    core.limit_usage(p_org, kv.key),
    coalesce(
      core.limit_usage(p_org, kv.key) >= nullif(kv.value #>> '{}', '')::int,
      false
    )
  from core.organization_modules om
  cross join lateral jsonb_each(om.limits) as kv(key, value)
  where om.organization_id = p_org
    and core.is_platform_admin()
  order by om.module_code, kv.key;
$$;

comment on function public.platform_organization_limits is
  'Usage against ceiling for one tenant. Guarded like every other platform_* '
  'read -- a non-administrator gets zero rows. Usage comes from '
  'core.limit_usage(), the same function the enforcement triggers call.';

-- -----------------------------------------------------------------------------
-- Changing one.
--
-- p_value NULL removes the key, which means UNLIMITED -- consistent with how
-- ENTERPRISE ships `{}` and with core.limit_for(). That is a real operator
-- action ("stop capping this customer"), not an accident, so it is spelled
-- rather than inferred from a zero.
-- -----------------------------------------------------------------------------

create or replace function public.platform_set_limit(
  p_org    uuid,
  p_module text,
  p_key    text,
  p_value  int,
  p_reason text default null
)
returns void
language plpgsql
security definer
set search_path = public, core, pg_temp
as $$
declare
  v_old jsonb;
  v_new jsonb;
begin
  if not core.is_platform_admin('BILLING') then
    raise exception 'UNAUTHORIZED_ACTION' using errcode = 'P0001';
  end if;

  if p_value is not null and p_value < 0 then
    raise exception 'VALIDATION_FAILED: a limit cannot be negative'
      using errcode = 'P0001';
  end if;

  select om.limits into v_old
  from core.organization_modules om
  where om.organization_id = p_org and om.module_code = upper(p_module);

  if v_old is null then
    raise exception 'VALIDATION_FAILED: no entitlement row for that module'
      using errcode = 'P0001';
  end if;

  v_new := case
             when p_value is null then v_old - p_key
             else v_old || jsonb_build_object(p_key, p_value)
           end;

  -- Written directly rather than through platform_set_module() on purpose:
  -- changing a ceiling is not the same act as turning a module on, and it
  -- must not flip source to MANUAL and silently opt the module out of plan
  -- control. That is exactly the trap 20260815099000 was written to close.
  update core.organization_modules
     set limits = v_new
   where organization_id = p_org and module_code = upper(p_module);

  perform core.write_platform_audit(
    'PLATFORM_SET_LIMIT', 'OrganizationModule', p_org,
    jsonb_build_object('module', upper(p_module), 'limits', v_old),
    jsonb_build_object('module', upper(p_module), 'limits', v_new,
                       'usage', core.limit_usage(p_org, p_key)),
    p_reason
  );
end;
$$;

revoke all on function core.limit_usage(uuid, text)                       from public;
revoke all on function public.platform_organization_limits(uuid)          from public;
revoke all on function public.platform_set_limit(uuid, text, text, int, text) from public;

grant execute on function core.limit_usage(uuid, text) to authenticated, app_pos, app_inv, app_acc, app_admin;
grant execute on function public.platform_organization_limits(uuid)           to authenticated;
grant execute on function public.platform_set_limit(uuid, text, text, int, text) to authenticated;
