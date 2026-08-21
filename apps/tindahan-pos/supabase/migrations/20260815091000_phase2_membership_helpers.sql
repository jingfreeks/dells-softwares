-- =============================================================================
-- Phase 2 · Migration 009 · Membership helper functions
-- -----------------------------------------------------------------------------
-- These four functions are the single source of truth for "who is calling and
-- what may they reach". Every RLS policy in the platform calls them; nothing
-- re-implements the logic.
--
-- All are STABLE (cacheable within a statement) and SECURITY DEFINER with a
-- pinned search_path, so they can read core.staff even when the caller cannot.
--
-- Affected modules : all
-- Rollback         : drop the functions
-- Risk             : none (no policies depend on them until migration 013)
-- =============================================================================

-- Who is calling? Null for unauthenticated or service-role contexts.
create or replace function core.current_user_id()
returns uuid
language sql
stable
as $$
  select nullif(current_setting('request.jwt.claims', true)::jsonb ->> 'sub', '')::uuid;
$$;

comment on function core.current_user_id is
  'auth.uid() equivalent that also works inside pgTAP tests where the claims '
  'setting is assigned directly.';

-- -----------------------------------------------------------------------------
-- Which organizations may the caller act in, RIGHT NOW?
-- Membership is resolved per query from live table state, never from a token
-- claim: removing a staff row revokes access on the very next statement.
-- -----------------------------------------------------------------------------
create or replace function core.auth_org_ids()
returns setof uuid
language sql
stable
security definer
set search_path = core, pg_temp
as $$
  select s.organization_id
  from core.staff s
  join core.organizations o on o.id = s.organization_id
  where s.user_id = core.current_user_id()
    and s.status = 'ACTIVE'
    and o.status in ('ACTIVE', 'SUSPENDED');   -- suspended = read-only, still visible
$$;

create or replace function core.is_org_member(p_org uuid)
returns boolean
language sql
stable
as $$
  select p_org is not null and p_org in (select core.auth_org_ids());
$$;

-- The caller's staff row within one organization (null if not a member).
create or replace function core.auth_staff_id(p_org uuid)
returns uuid
language sql
stable
security definer
set search_path = core, pg_temp
as $$
  select s.id
  from core.staff s
  where s.user_id = core.current_user_id()
    and s.organization_id = p_org
    and s.status = 'ACTIVE'
  limit 1;
$$;

-- -----------------------------------------------------------------------------
-- Branch scoping.
-- branch_scope = 'ALL'      -> every ACTIVE branch of the organization
-- branch_scope = 'ASSIGNED' -> only rows in core.staff_branches
-- No assignments and ASSIGNED scope therefore means: no branches. Fail closed.
-- -----------------------------------------------------------------------------
create or replace function core.auth_branch_ids(p_org uuid)
returns setof uuid
language sql
stable
security definer
set search_path = core, pg_temp
as $$
  select b.id
  from core.branches b
  join core.staff s
    on s.organization_id = b.organization_id
   and s.user_id = core.current_user_id()
   and s.status = 'ACTIVE'
  where b.organization_id = p_org
    and b.status <> 'CLOSED'
    and (
      s.branch_scope = 'ALL'
      or exists (
        select 1 from core.staff_branches sb
        where sb.staff_id = s.id and sb.branch_id = b.id
      )
    );
$$;

create or replace function core.can_access_branch(p_org uuid, p_branch uuid)
returns boolean
language sql
stable
as $$
  select p_branch is not null and p_branch in (select core.auth_branch_ids(p_org));
$$;

-- Do the caller and the target user share at least one organization?
-- Used so a staff list can show colleagues without exposing the whole user table.
create or replace function core.shares_organization(p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = core, pg_temp
as $$
  select exists (
    select 1
    from core.staff s
    where s.user_id = p_user
      and s.status <> 'TERMINATED'
      and s.organization_id in (select core.auth_org_ids())
  );
$$;

-- -----------------------------------------------------------------------------
-- Platform admin. A narrow, separate path — never a widening of tenant rights.
-- -----------------------------------------------------------------------------
create or replace function core.is_platform_admin(p_scope text default null)
returns boolean
language sql
stable
security definer
set search_path = core, pg_temp
as $$
  select exists (
    select 1
    from core.platform_admins pa
    where pa.user_id = core.current_user_id()
      and pa.status = 'ACTIVE'
      and pa.mfa_verified_at > now() - interval '8 hours'
      and (p_scope is null or pa.scope::text = p_scope or pa.scope = 'SUPERUSER')
  );
$$;

grant execute on function
  core.current_user_id(), core.auth_org_ids(), core.is_org_member(uuid),
  core.auth_staff_id(uuid), core.auth_branch_ids(uuid), core.can_access_branch(uuid, uuid),
  core.shares_organization(uuid), core.is_platform_admin(text)
to authenticated, app_pos, app_inv, app_acc, app_admin;
