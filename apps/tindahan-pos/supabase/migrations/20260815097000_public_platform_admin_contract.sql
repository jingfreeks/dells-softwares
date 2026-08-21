-- =============================================================================
-- Public contract · What the Super Admin application is allowed to ask
-- -----------------------------------------------------------------------------
-- The `core` schema is not exposed to PostgREST (PGRST_DB_SCHEMAS is
-- public,graphql_public), so a Super Admin app cannot select from
-- core.organizations or call core.grant_platform_admin() at all. Same
-- constraint the module gate hit in 20260815096000, same answer: a narrow,
-- deliberate `public` contract rather than exposing twelve core tables to
-- the REST API.
--
-- These functions are the entire surface the Super Admin app gets. Adding a
-- capability means adding a function here, on purpose, rather than a client
-- discovering it can query a table.
--
-- -----------------------------------------------------------------------------
-- SECURITY -- read before changing anything below
--
-- Every function here is SECURITY DEFINER, lives in `public`, and is
-- EXECUTE-able by `authenticated`. That means any signed-in cashier can
-- invoke them. They are safe only because each one re-asks
-- core.is_platform_admin() itself and refuses otherwise.
--
-- That check is not decoration and must never be dropped "because the app
-- only calls this from the admin screen". core.is_platform_admin() requires
-- an ACTIVE core.platform_admins row AND mfa_verified_at inside 8 hours, so
-- a stale session degrades to no access rather than to tenant-wide reads.
--
-- Read functions return zero rows for a non-admin rather than raising, so
-- they leak nothing -- not even the fact that a platform admin layer exists.
-- Write functions raise UNAUTHORIZED_ACTION, because a write that silently
-- did nothing would be worse than a clear refusal.
--
-- Affected schemas : public (six new functions)
-- Rollback         : drop the six functions
-- Risk             : low if the guards stand; total tenant exposure if one
--                    is removed. Treat this file as security-critical.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Session: who am I, and is my second factor still fresh?
-- Returns zero rows for anyone who is not a platform administrator.
-- -----------------------------------------------------------------------------

create or replace function public.platform_me()
returns table (
  scope           text,
  status          text,
  mfa_fresh       boolean,
  mfa_expires_at  timestamptz
)
language sql
stable
security definer
set search_path = public, core, pg_temp
as $$
  select pa.scope::text, pa.status::text,
         -- coalesce, not the bare comparison: mfa_verified_at is null until
         -- the first verification, and a null here would reach the client as
         -- a nullable boolean it is documented to receive as a boolean.
         coalesce(pa.mfa_verified_at > now() - interval '8 hours', false),
         pa.mfa_verified_at + interval '8 hours'
  from core.platform_admins pa
  where pa.user_id = core.current_user_id()
    and pa.status = 'ACTIVE';
$$;

comment on function public.platform_me is
  'Super Admin shell bootstrap. Zero rows means "not an administrator" -- '
  'the app must treat that as no access, never as a loading state.';

-- Stamp mfa_verified_at after the app completes an MFA challenge. Delegates
-- to core, which refuses unless the session JWT actually carries aal2.
create or replace function public.platform_verify_mfa()
returns timestamptz
language sql
volatile
security definer
set search_path = public, core, pg_temp
as $$
  select core.record_platform_admin_mfa();
$$;

-- -----------------------------------------------------------------------------
-- Every tenant on the platform, with the numbers the console shows.
--
-- Counts come from public.* because that is still where the operational data
-- lives -- core.branches/staff were backfilled, but stores/staff in public
-- remain the system of record until the Step 5 cutover.
-- -----------------------------------------------------------------------------

create or replace function public.platform_organizations()
returns table (
  organization_id  uuid,
  name             text,
  status           text,
  created_at       timestamptz,
  plan_code        text,
  subscription_status text,
  branch_count     int,
  staff_count      int,
  enabled_modules  text[]
)
language sql
stable
security definer
set search_path = public, core, pg_temp
as $$
  select
    o.id, o.name, o.status::text, o.created_at,
    p.code, s.status,
    (select count(*)::int from core.branches b where b.organization_id = o.id),
    (select count(*)::int from public.staff st where st.store_id = o.id),
    coalesce((
      select array_agg(om.module_code order by om.module_code)
      from core.organization_modules om
      where om.organization_id = o.id
        and om.enabled
        and om.valid_from <= now()
        and (om.valid_until is null or om.valid_until > now())
    ), '{}'::text[])
  from core.organizations o
  left join core.organization_subscriptions s
    on s.organization_id = o.id and s.status <> 'CANCELLED'
  left join core.subscription_plans p on p.id = s.plan_id
  where core.is_platform_admin()
  order by o.name;
$$;

comment on function public.platform_organizations is
  'Every tenant, for the Super Admin console. The is_platform_admin() guard '
  'in the WHERE clause is what stops this from being a full tenant dump for '
  'any signed-in user -- do not remove it.';

-- -----------------------------------------------------------------------------
-- One tenant's full module matrix: the catalogue, plus what they hold.
-- -----------------------------------------------------------------------------

create or replace function public.platform_organization_modules(p_org uuid)
returns table (
  module_code  text,
  name         text,
  is_sellable  boolean,
  enabled      boolean,
  source       text,
  valid_until  timestamptz,
  limits       jsonb
)
language sql
stable
security definer
set search_path = public, core, pg_temp
as $$
  select m.code, m.name, m.is_sellable,
         core.module_enabled(p_org, m.code),
         om.source, om.valid_until, coalesce(om.limits, '{}'::jsonb)
  from core.modules m
  left join core.organization_modules om
    on om.organization_id = p_org and om.module_code = m.code
  where core.is_platform_admin()
  order by m.sort_order, m.code;
$$;

-- -----------------------------------------------------------------------------
-- The action the whole Super Admin exists for: turn a module on or off for
-- one tenant.
--
-- Writes source = 'MANUAL', which core.materialize_subscription_modules()
-- deliberately never overwrites -- so this decision survives the tenant's
-- next plan change rather than silently reverting on renewal.
-- -----------------------------------------------------------------------------

create or replace function public.platform_set_module(
  p_org     uuid,
  p_module  text,
  p_enabled boolean,
  p_reason  text default null
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
  values (p_org, upper(p_module), p_enabled, 'MANUAL')
  on conflict (organization_id, module_code) do update
    set enabled    = excluded.enabled,
        source     = 'MANUAL',
        -- A re-grant must clear any expiry left over from a trial, or the
        -- module would read as enabled here and still fail closed.
        valid_until = null,
        updated_at = now();

  perform core.write_platform_audit(
    case when p_enabled then 'PLATFORM_ENABLE_MODULE' else 'PLATFORM_DISABLE_MODULE' end,
    'OrganizationModule', p_org,
    jsonb_build_object('module', upper(p_module), 'enabled', v_before),
    jsonb_build_object('module', upper(p_module), 'enabled', p_enabled),
    p_reason
  );
end;
$$;

-- -----------------------------------------------------------------------------
-- Platform-level audit, for the console's own activity view.
-- -----------------------------------------------------------------------------

create or replace function public.platform_audit(p_limit int default 100)
returns table (
  id           bigint,
  actor_email  text,
  action       text,
  entity_type  text,
  entity_id    uuid,
  reason       text,
  created_at   timestamptz
)
language sql
stable
security definer
set search_path = public, core, pg_temp
as $$
  select l.id, u.email::text, l.action, l.entity_type, l.entity_id, l.reason, l.created_at
  from core.platform_audit_logs l
  left join core.users u on u.id = l.actor_user_id
  where core.is_platform_admin('ENGINEER')
  order by l.id desc
  limit greatest(1, least(coalesce(p_limit, 100), 500));
$$;

comment on function public.platform_audit is
  'ENGINEER scope only, matching the RLS policy on core.platform_audit_logs. '
  'SUPERUSER satisfies it via is_platform_admin''s scope rule.';

-- -----------------------------------------------------------------------------
-- Grants. EXECUTE to authenticated is safe only because every function above
-- re-checks core.is_platform_admin() for itself.
-- -----------------------------------------------------------------------------

revoke all on function public.platform_me()                              from public;
revoke all on function public.platform_verify_mfa()                      from public;
revoke all on function public.platform_organizations()                   from public;
revoke all on function public.platform_organization_modules(uuid)        from public;
revoke all on function public.platform_set_module(uuid, text, boolean, text) from public;
revoke all on function public.platform_audit(int)                        from public;

grant execute on function public.platform_me()                              to authenticated;
grant execute on function public.platform_verify_mfa()                      to authenticated;
grant execute on function public.platform_organizations()                   to authenticated;
grant execute on function public.platform_organization_modules(uuid)        to authenticated;
grant execute on function public.platform_set_module(uuid, text, boolean, text) to authenticated;
grant execute on function public.platform_audit(int)                        to authenticated;
