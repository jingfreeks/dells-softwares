-- =============================================================================
-- Contracts for feature entitlement · tenant-facing and console-facing
-- -----------------------------------------------------------------------------
-- 20260815109000 added the feature layer in `core`. `core` is not exposed to
-- PostgREST, so nothing in a browser can reach it -- the same reason the
-- module layer needed 20260815096000 and 20260815097000. This is that pair,
-- for features.
--
--   my_store_features()              what the apps render their UI from
--   current_store_has_feature(code)  the gate a policy will call, once
--                                    enforcement lands in its own migration
--   platform_organization_features() what the console lists
--   platform_set_feature(...)        how an operator grants or revokes one
--
-- Still nothing enforced. current_store_has_feature() exists so that
-- enforcement is a one-line change per policy when it comes, and so the shape
-- can be reviewed now rather than in the same migration that switches it on.
--
-- Affected schemas : public (four new functions)
-- Rollback         : drop the four functions
-- Risk             : none -- additive, and no policy calls any of them yet
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Tenant-facing. Takes no argument: it can only ever answer for the caller's
-- own store, so there is no way to aim it at someone else's.
-- -----------------------------------------------------------------------------

create or replace function public.my_store_features()
returns table (feature_code text, module_code text, name text, enabled boolean)
language sql
stable
security definer
set search_path = public, core, pg_temp
as $$
  select * from core.my_features(auth_store_id());
$$;

comment on function public.my_store_features is
  'Every feature and whether this store holds it. Takes no argument on '
  'purpose -- it answers only for auth_store_id().';

create or replace function public.current_store_has_feature(p_feature text)
returns boolean
language sql
stable
security definer
set search_path = public, core, pg_temp
as $$
  select core.feature_enabled(auth_store_id(), p_feature);
$$;

comment on function public.current_store_has_feature is
  'Does the calling staff member''s store hold this feature? Shaped like '
  'current_store_has_module() -- no column reference, so Postgres can hoist '
  'it into a per-statement InitPlan rather than evaluating it per row (§19).';

revoke all on function public.my_store_features()             from public;
revoke all on function public.current_store_has_feature(text) from public;
grant execute on function public.my_store_features()             to authenticated;
grant execute on function public.current_store_has_feature(text) to authenticated;

-- -----------------------------------------------------------------------------
-- Console-facing.
-- -----------------------------------------------------------------------------

create or replace function public.platform_organization_features(p_org uuid)
returns table (
  feature_code text,
  module_code  text,
  name         text,
  enabled      boolean,
  source       text,
  module_held  boolean
)
language sql
stable
security definer
set search_path = public, core, pg_temp
as $$
  select
    f.code, f.module_code, f.name,
    coalesce(of.enabled, false),
    of.source,
    -- Surfaced so the console can explain a feature that is "on" but dark
    -- because its module is off, rather than showing a contradiction.
    core.module_enabled(p_org, f.module_code)
  from core.features f
  left join core.organization_features of
    on of.organization_id = p_org and of.feature_code = f.code
  where core.is_platform_admin()
  order by f.module_code, f.sort_order, f.code;
$$;

comment on function public.platform_organization_features is
  'Every feature and this tenant''s entitlement to it. Guarded like every '
  'other platform_* read -- a non-administrator gets zero rows.';

create or replace function public.platform_set_feature(
  p_org     uuid,
  p_feature text,
  p_enabled boolean,
  p_reason  text default null
)
returns void
language plpgsql
security definer
set search_path = public, core, pg_temp
as $$
declare
  v_old boolean;
begin
  -- Features are commercial, like plans and limits.
  if not core.is_platform_admin('BILLING') then
    raise exception 'UNAUTHORIZED_ACTION' using errcode = 'P0001';
  end if;

  if not exists (select 1 from core.features where code = lower(p_feature)) then
    raise exception 'VALIDATION_FAILED: unknown feature %', p_feature
      using errcode = 'P0001';
  end if;

  if not exists (select 1 from core.organizations where id = p_org) then
    raise exception 'VALIDATION_FAILED: unknown organization' using errcode = 'P0001';
  end if;

  select enabled into v_old from core.organization_features
   where organization_id = p_org and feature_code = lower(p_feature);

  -- MANUAL, so materialization never overwrites it: an operator's decision
  -- must survive the tenant's next plan change rather than expiring on
  -- renewal. platform_reset_feature_to_plan() below hands it back.
  insert into core.organization_features (organization_id, feature_code, enabled, source)
  values (p_org, lower(p_feature), p_enabled, 'MANUAL')
  on conflict (organization_id, feature_code) do update
    set enabled = excluded.enabled, source = 'MANUAL', updated_at = now();

  perform core.write_platform_audit(
    'PLATFORM_SET_FEATURE', 'OrganizationFeature', p_org,
    jsonb_build_object('feature', lower(p_feature), 'enabled', v_old),
    jsonb_build_object('feature', lower(p_feature), 'enabled', p_enabled),
    p_reason
  );
end;
$$;

-- The escape hatch, learned the hard way for modules in 20260815099000: a
-- MANUAL grant is permanent until something hands it back, so without this
-- the console's only action would quietly opt a feature out of plan control
-- forever.
create or replace function public.platform_reset_feature_to_plan(
  p_org     uuid,
  p_feature text,
  p_reason  text default null
)
returns void
language plpgsql
security definer
set search_path = public, core, pg_temp
as $$
declare
  v_source text;
begin
  if not core.is_platform_admin('BILLING') then
    raise exception 'UNAUTHORIZED_ACTION' using errcode = 'P0001';
  end if;

  select source into v_source from core.organization_features
   where organization_id = p_org and feature_code = lower(p_feature);

  if v_source is null then
    raise exception 'VALIDATION_FAILED: no entitlement row for that feature'
      using errcode = 'P0001';
  end if;

  -- Deleted rather than flipped back to SUBSCRIPTION: materialize re-creates
  -- it when the plan includes the feature, and its absence is the correct
  -- answer when the plan does not.
  delete from core.organization_features
   where organization_id = p_org and feature_code = lower(p_feature);

  perform core.materialize_subscription_features(p_org);

  perform core.write_platform_audit(
    'PLATFORM_RESET_FEATURE_TO_PLAN', 'OrganizationFeature', p_org,
    jsonb_build_object('feature', lower(p_feature), 'source', v_source),
    jsonb_build_object('feature', lower(p_feature),
                       'enabled', core.feature_enabled(p_org, p_feature)),
    p_reason
  );
end;
$$;

revoke all on function public.platform_organization_features(uuid)                from public;
revoke all on function public.platform_set_feature(uuid, text, boolean, text)     from public;
revoke all on function public.platform_reset_feature_to_plan(uuid, text, text)    from public;

grant execute on function public.platform_organization_features(uuid)             to authenticated;
grant execute on function public.platform_set_feature(uuid, text, boolean, text)  to authenticated;
grant execute on function public.platform_reset_feature_to_plan(uuid, text, text) to authenticated;
