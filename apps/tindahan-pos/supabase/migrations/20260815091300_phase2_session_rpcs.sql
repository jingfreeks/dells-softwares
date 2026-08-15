-- =============================================================================
-- Phase 2 · Migration 012 · Session RPCs
-- -----------------------------------------------------------------------------
-- The three calls an application makes immediately after sign-in.
--
-- Affected modules : all
-- Rollback         : drop the functions
-- Risk             : provision_organization writes; it is idempotent per call
--                    but not replay-safe, so the client passes it once.
-- =============================================================================

-- Interim phase-2 proxy for "organization administrator".
-- Phase 3 replaces every use of this with core.has_permission(org, '<perm>').
create or replace function core.is_org_wide_staff(p_org uuid)
returns boolean
language sql
stable
security definer
set search_path = core, pg_temp
as $$
  select exists (
    select 1 from core.staff s
    where s.user_id = core.current_user_id()
      and s.organization_id = p_org
      and s.status = 'ACTIVE'
      and s.branch_scope = 'ALL'
  );
$$;

comment on function core.is_org_wide_staff is
  'PHASE 2 INTERIM. A coarse admin proxy used by write policies until the RBAC '
  'tables land in phase 3. Search for this name when implementing phase 3 — every '
  'call site must become a has_permission() check.';

-- -----------------------------------------------------------------------------
-- What can I see? One round trip, everything the shell needs to render.
-- -----------------------------------------------------------------------------
create or replace function core.my_memberships()
returns table (
  organization_id      uuid,
  organization_name    text,
  organization_status  core.org_status,
  staff_id             uuid,
  employee_number      text,
  first_name           text,
  last_name            text,
  branch_scope         core.branch_scope,
  primary_branch_id    uuid,
  branches             jsonb
)
language sql
stable
security definer
set search_path = core, pg_temp
as $$
  select
    o.id,
    o.name,
    o.status,
    s.id,
    s.employee_number,
    s.first_name,
    s.last_name,
    s.branch_scope,
    s.primary_branch_id,
    coalesce(
      (
        select jsonb_agg(
                 jsonb_build_object(
                   'id', b.id, 'name', b.name, 'code', b.code,
                   'status', b.status, 'is_primary', b.is_primary)
                 order by b.is_primary desc, b.name)
        from core.branches b
        where b.organization_id = o.id
          and b.status <> 'CLOSED'
          and (
            s.branch_scope = 'ALL'
            or exists (select 1 from core.staff_branches sb
                       where sb.staff_id = s.id and sb.branch_id = b.id)
          )
      ),
      '[]'::jsonb
    )
  from core.staff s
  join core.organizations o on o.id = s.organization_id
  where s.user_id = core.current_user_id()
    and s.status = 'ACTIVE'
    and o.status in ('ACTIVE', 'SUSPENDED')
  order by o.name;
$$;

comment on function core.my_memberships is
  'The only supported way for a client to learn which organizations it may enter. '
  'A client that asks for an organization not in this list gets zero rows from RLS.';

-- -----------------------------------------------------------------------------
-- Sign-up / onboarding. Creates the tenant, its first branch, and the caller''s
-- owning membership atomically.
-- -----------------------------------------------------------------------------
create or replace function core.provision_organization(
  p_name        text,
  p_branch_name text default 'Main Branch',
  p_branch_code text default 'MAIN',
  p_legal_name  text default null,
  p_tin         text default null,
  p_first_name  text default null,
  p_last_name   text default null
)
returns table (organization_id uuid, branch_id uuid, staff_id uuid)
language plpgsql
security definer
set search_path = core, pg_temp
as $$
declare
  v_user   uuid := core.current_user_id();
  v_email  text;
  v_org    uuid;
  v_branch uuid;
  v_staff  uuid;
  v_owned  int;
begin
  if v_user is null then
    raise exception 'NOT_AUTHENTICATED' using errcode = 'P0001';
  end if;

  select u.email, coalesce(p_first_name, split_part(coalesce(u.full_name, u.email), ' ', 1))
    into v_email, p_first_name
  from core.users u where u.id = v_user;

  if v_email is null then
    raise exception 'IDENTITY_NOT_MIRRORED: no core.users row for %', v_user
      using errcode = 'P0001';
  end if;

  select count(*) into v_owned
  from core.staff s
  where s.user_id = v_user and s.branch_scope = 'ALL' and s.status = 'ACTIVE';

  if v_owned >= 10 then
    raise exception 'LIMIT_EXCEEDED: a user may own at most 10 organizations'
      using errcode = 'P0001';
  end if;

  if length(btrim(coalesce(p_name, ''))) = 0 then
    raise exception 'VALIDATION_FAILED: organization name is required'
      using errcode = 'P0001';
  end if;

  insert into core.organizations (name, legal_name, tin, email, status)
  values (btrim(p_name), nullif(btrim(coalesce(p_legal_name, '')), ''),
          nullif(btrim(coalesce(p_tin, '')), ''), v_email, 'ACTIVE')
  returning id into v_org;

  insert into core.branches (organization_id, name, code, is_primary, status)
  values (v_org, coalesce(nullif(btrim(p_branch_name), ''), 'Main Branch'),
          upper(coalesce(nullif(btrim(p_branch_code), ''), 'MAIN')), true, 'ACTIVE')
  returning id into v_branch;

  insert into core.staff (
    organization_id, user_id, first_name, last_name,
    primary_branch_id, branch_scope, status
  )
  values (
    v_org, v_user,
    coalesce(nullif(btrim(coalesce(p_first_name, '')), ''), 'Owner'),
    coalesce(nullif(btrim(coalesce(p_last_name, '')), ''), ''),
    v_branch, 'ALL', 'ACTIVE'
  )
  returning id into v_staff;

  perform core.write_audit(
    p_organization_id => v_org,
    p_action          => 'PROVISION_ORGANIZATION',
    p_entity_type     => 'Organization',
    p_entity_id       => v_org,
    p_new_data        => jsonb_build_object('name', p_name, 'branch_code', p_branch_code)
  );

  return query select v_org, v_branch, v_staff;
end;
$$;

-- -----------------------------------------------------------------------------
-- Authentication events. One row per organization the user belongs to, so the
-- tenant''s own Full Log shows who signed in.
--
-- Note: a FAILED_LOGIN for an unknown address cannot be attributed to a tenant
-- and is intentionally NOT recorded here — it belongs to the auth provider''s
-- own log. Only failures for a known member are recorded.
-- -----------------------------------------------------------------------------
create or replace function core.log_auth_event(p_action text, p_reason text default null)
returns int
language plpgsql
security definer
set search_path = core, pg_temp
as $$
declare v_org uuid; v_count int := 0;
begin
  if p_action not in ('LOGIN', 'LOGOUT', 'SESSION_EXPIRED', 'ORG_SWITCHED') then
    raise exception 'VALIDATION_FAILED: unsupported auth action %', p_action
      using errcode = 'P0001';
  end if;

  for v_org in select core.auth_org_ids() loop
    perform core.write_audit(
      p_organization_id => v_org,
      p_action          => p_action,
      p_entity_type     => 'Session',
      p_entity_id       => core.auth_staff_id(v_org),
      p_reason          => p_reason
    );
    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

grant execute on function core.is_org_wide_staff(uuid)      to authenticated, app_pos, app_inv, app_acc, app_admin;
grant execute on function core.my_memberships()             to authenticated;
grant execute on function core.provision_organization(text, text, text, text, text, text, text) to authenticated;
grant execute on function core.log_auth_event(text, text)   to authenticated;
