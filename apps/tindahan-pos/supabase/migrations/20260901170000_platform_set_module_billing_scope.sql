-- platform_set_module() gated on core.is_platform_admin() with no scope
-- argument, so any ACTIVE platform admin with fresh MFA could enable or
-- disable a sellable module for any tenant -- a SUPPORT admin included.
--
-- Every other entitlement-changing RPC requires BILLING:
--   platform_set_plan, platform_set_subscription_status, platform_set_feature,
--   platform_set_limit, platform_reset_feature_to_plan,
--   platform_reset_module_to_plan.
--
-- The asymmetry reads as an oversight rather than a decision. This function
-- accepts p_source = 'ADDON', which is a billing concept, and its own undo
-- (platform_reset_module_to_plan) already requires BILLING -- so an unscoped
-- admin could move a module off-plan but needed billing authority to put it
-- back.
--
-- SUPERUSER continues to satisfy the check: core.is_platform_admin() matches
-- `pa.scope = p_scope or pa.scope = 'SUPERUSER'`.
--
-- Only the guard changes. The body below is otherwise identical to the
-- definition this replaces.
--
-- See issue #415.

create or replace function public.platform_set_module(
  p_org uuid,
  p_module text,
  p_enabled boolean,
  p_reason text default null::text,
  p_source text default 'MANUAL'::text
)
returns void
language plpgsql
security definer
set search_path to 'public', 'core', 'pg_temp'
as $function$
declare
  v_before boolean;
begin
  if not core.is_platform_admin('BILLING') then
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
$function$;
