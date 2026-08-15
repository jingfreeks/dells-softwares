-- =============================================================================
-- Core · Platform admin bootstrap, MFA gate, and platform-level audit
-- -----------------------------------------------------------------------------
-- core.platform_admins was created in phase 1 so the authorization helpers
-- could be honest from the start, but nothing can currently put a row in it:
--
--   * its write policy requires core.is_platform_admin('SUPERUSER')
--   * is_platform_admin() requires an ACTIVE row with mfa_verified_at
--     inside the last 8 hours
--   * nothing anywhere sets mfa_verified_at
--
-- So the table is empty, unfillable through the application, and every
-- policy gated on it -- including all of module entitlement -- currently
-- denies everyone. This migration resolves that, without weakening the gate.
--
-- Three things:
--
--   1. A break-glass bootstrap reachable ONLY by service_role, for the first
--      administrator. A bootstrap that authenticated users could reach would
--      be a privilege-escalation hole, so it is revoked from them entirely.
--      service_role can already write any table directly; this exists to make
--      the correct thing convenient and audited, not to grant new power.
--
--   2. A real MFA gate. core.record_platform_admin_mfa() stamps
--      mfa_verified_at ONLY when the caller's JWT proves assurance level
--      aal2 -- i.e. they actually completed a second factor. It cannot be
--      used to self-certify: the claim is minted by the auth server, not by
--      the client, and a plain password session (aal1) is refused.
--
--   3. Platform-level audit. Granting someone platform admin is the most
--      security-sensitive action in the system, and today it is entirely
--      unaudited: core.audit_logs.organization_id is NOT NULL and
--      core.audit_trigger() deliberately no-ops on rows with no
--      organization_id, so a platform_admins row structurally cannot be
--      logged there. Rather than weaken that NOT NULL -- PHASE-2-DECISIONS
--      §5 rejected exactly that, as it would erode the strongest tenancy
--      invariant in the schema -- this adds the separate platform-events
--      table that same note proposes.
--
-- Affected schemas : core (one new table, five new functions)
-- Rollback         : drop the 5 functions and core.platform_audit_logs;
--                    delete from core.platform_admins
-- Risk             : low for existing behaviour (nothing in the tenant apps
--                    touches any of this) but HIGH consequence if misused --
--                    this is the platform's root of trust. See the test plan.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Platform-level audit: events that belong to no tenant
-- -----------------------------------------------------------------------------

create table core.platform_audit_logs (
  id             bigint generated always as identity primary key,
  actor_user_id  uuid,
  action         text not null,
  entity_type    text not null,
  entity_id      uuid,
  old_data       jsonb,
  new_data       jsonb,
  reason         text,
  ip_address     inet,
  user_agent     text,
  created_at     timestamptz not null default now()
);

comment on table core.platform_audit_logs is
  'Append-only log for platform-level events that cannot be attributed to a '
  'tenant (platform admin grants, break-glass bootstraps). Deliberately '
  'separate from core.audit_logs, whose organization_id is NOT NULL by '
  'design -- see PHASE-2-DECISIONS.md §5.';

create index platform_audit_logs_actor_idx  on core.platform_audit_logs (actor_user_id, created_at desc);
create index platform_audit_logs_action_idx on core.platform_audit_logs (action, created_at desc);

alter table core.platform_audit_logs enable row level security;
alter table core.platform_audit_logs force  row level security;

-- Only platform engineers may read it; tenants must never learn that a
-- platform admin layer exists at all.
create policy platform_audit_logs_select on core.platform_audit_logs
  for select to authenticated
  using ( (select core.is_platform_admin('ENGINEER')) );

-- No INSERT policy: rows are written only by the SECURITY DEFINER functions
-- below, which set the actor themselves. No UPDATE or DELETE policy at all.

create or replace function core.reject_platform_audit_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'AUDIT_LOG_IMMUTABLE: platform audit rows cannot be %', lower(tg_op)
    using errcode = 'P0001';
end;
$$;

create trigger trg_platform_audit_logs_immutable
  before update or delete on core.platform_audit_logs
  for each row execute function core.reject_platform_audit_mutation();

grant select on core.platform_audit_logs to authenticated;
revoke insert, update, delete on core.platform_audit_logs from authenticated, anon;

create or replace function core.write_platform_audit(
  p_action      text,
  p_entity_type text,
  p_entity_id   uuid  default null,
  p_old_data    jsonb default null,
  p_new_data    jsonb default null,
  p_reason      text  default null
)
returns bigint
language plpgsql
security definer
set search_path = core, pg_temp
as $$
declare v_id bigint;
begin
  insert into core.platform_audit_logs (
    actor_user_id, action, entity_type, entity_id, old_data, new_data, reason,
    ip_address, user_agent
  ) values (
    core.current_user_id(), upper(p_action), p_entity_type, p_entity_id,
    p_old_data, p_new_data, p_reason,
    nullif(current_setting('request.headers', true)::jsonb ->> 'x-forwarded-for', '')::inet,
    nullif(current_setting('request.headers', true)::jsonb ->> 'user-agent', '')
  )
  returning id into v_id;
  return v_id;
exception
  when others then
    -- Never let a malformed header or absent request context sink the
    -- operation being audited; record what we can.
    insert into core.platform_audit_logs (
      actor_user_id, action, entity_type, entity_id, old_data, new_data, reason
    ) values (
      core.current_user_id(), upper(p_action), p_entity_type, p_entity_id,
      p_old_data, p_new_data, p_reason
    )
    returning id into v_id;
    return v_id;
end;
$$;

-- -----------------------------------------------------------------------------
-- 1. Break-glass bootstrap — service_role ONLY
-- -----------------------------------------------------------------------------

create or replace function core.bootstrap_platform_admin(
  p_email text,
  p_scope text default 'SUPERUSER'
)
returns uuid
language plpgsql
security definer
set search_path = core, pg_temp
as $$
declare
  v_user uuid;
  v_id   uuid;
begin
  if p_scope not in ('SUPPORT', 'BILLING', 'ENGINEER', 'SUPERUSER') then
    raise exception 'VALIDATION_FAILED: unknown scope %', p_scope using errcode = 'P0001';
  end if;

  select id into v_user from core.users where email = p_email::extensions.citext;
  if v_user is null then
    raise exception 'USER_NOT_FOUND: no core.users row for % -- the person must sign up first',
      p_email using errcode = 'P0001';
  end if;

  insert into core.platform_admins (user_id, scope, status)
  values (v_user, p_scope::core.platform_admin_scope, 'ACTIVE')
  on conflict (user_id) do update
    set scope = excluded.scope, status = 'ACTIVE', updated_at = now()
  returning id into v_id;

  perform core.write_platform_audit(
    'BOOTSTRAP_PLATFORM_ADMIN', 'PlatformAdmin', v_id,
    null, jsonb_build_object('email', p_email, 'scope', p_scope),
    'Break-glass bootstrap via service_role'
  );

  return v_id;
end;
$$;

comment on function core.bootstrap_platform_admin is
  'Break-glass only. Creates or re-activates a platform administrator by '
  'email. Callable ONLY by service_role -- never expose this to a browser. '
  'Deliberately does NOT set mfa_verified_at: the new admin must still pass '
  'core.record_platform_admin_mfa() with a real second factor before any '
  'is_platform_admin() check will pass.';

revoke all on function core.bootstrap_platform_admin(text, text) from public, authenticated, anon;
grant execute on function core.bootstrap_platform_admin(text, text) to service_role;

-- -----------------------------------------------------------------------------
-- 2. The MFA gate — cannot be self-certified
-- -----------------------------------------------------------------------------

create or replace function core.record_platform_admin_mfa()
returns timestamptz
language plpgsql
security definer
set search_path = core, pg_temp
as $$
declare
  v_user uuid := core.current_user_id();
  v_aal  text;
  v_at   timestamptz;
begin
  if v_user is null then
    raise exception 'NOT_AUTHENTICATED' using errcode = 'P0001';
  end if;

  -- The assurance level is asserted by the auth server inside the signed
  -- JWT. A client cannot forge it, and a password-only session is 'aal1'.
  v_aal := nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'aal';

  if v_aal is distinct from 'aal2' then
    perform core.write_platform_audit(
      'PLATFORM_ADMIN_MFA_REFUSED', 'PlatformAdmin', null, null,
      jsonb_build_object('aal', coalesce(v_aal, 'none')),
      'Second factor not present on session'
    );
    raise exception 'MFA_REQUIRED: platform administration requires a second factor'
      using errcode = 'P0001';
  end if;

  update core.platform_admins
     set mfa_verified_at = now(), updated_at = now()
   where user_id = v_user and status = 'ACTIVE'
  returning mfa_verified_at into v_at;

  if v_at is null then
    -- Not an administrator. Say so without confirming whether the table
    -- has any rows at all.
    raise exception 'UNAUTHORIZED_ACTION' using errcode = 'P0001';
  end if;

  perform core.write_platform_audit(
    'PLATFORM_ADMIN_MFA_VERIFIED', 'PlatformAdmin', null, null, null, null
  );

  return v_at;
end;
$$;

comment on function core.record_platform_admin_mfa is
  'Call immediately after the Super Admin app completes an MFA challenge. '
  'Stamps mfa_verified_at only when the session JWT carries aal2, opening '
  'the 8-hour window core.is_platform_admin() requires.';

grant execute on function core.record_platform_admin_mfa() to authenticated;

-- -----------------------------------------------------------------------------
-- 3. Day-to-day administration of administrators — SUPERUSER only, audited
-- -----------------------------------------------------------------------------

create or replace function core.grant_platform_admin(
  p_email  text,
  p_scope  text,
  p_reason text default null
)
returns uuid
language plpgsql
security definer
set search_path = core, pg_temp
as $$
declare
  v_user uuid;
  v_id   uuid;
begin
  if not core.is_platform_admin('SUPERUSER') then
    raise exception 'UNAUTHORIZED_ACTION' using errcode = 'P0001';
  end if;

  if p_scope not in ('SUPPORT', 'BILLING', 'ENGINEER', 'SUPERUSER') then
    raise exception 'VALIDATION_FAILED: unknown scope %', p_scope using errcode = 'P0001';
  end if;

  select id into v_user from core.users where email = p_email::extensions.citext;
  if v_user is null then
    raise exception 'USER_NOT_FOUND: no core.users row for %', p_email using errcode = 'P0001';
  end if;

  insert into core.platform_admins (user_id, scope, status)
  values (v_user, p_scope::core.platform_admin_scope, 'ACTIVE')
  on conflict (user_id) do update
    set scope = excluded.scope, status = 'ACTIVE', updated_at = now()
  returning id into v_id;

  perform core.write_platform_audit(
    'GRANT_PLATFORM_ADMIN', 'PlatformAdmin', v_id,
    null, jsonb_build_object('email', p_email, 'scope', p_scope), p_reason
  );

  return v_id;
end;
$$;

create or replace function core.revoke_platform_admin(
  p_user_id uuid,
  p_reason  text default null
)
returns void
language plpgsql
security definer
set search_path = core, pg_temp
as $$
declare
  v_old      core.platform_admins%rowtype;
  v_su_left  int;
begin
  if not core.is_platform_admin('SUPERUSER') then
    raise exception 'UNAUTHORIZED_ACTION' using errcode = 'P0001';
  end if;

  select * into v_old from core.platform_admins where user_id = p_user_id;
  if not found then
    raise exception 'USER_NOT_FOUND: not a platform administrator' using errcode = 'P0001';
  end if;

  -- Removing the last SUPERUSER would make the platform unadministrable,
  -- recoverable only by break-glass. Refuse rather than let someone lock
  -- the whole team out with one click.
  select count(*) into v_su_left
  from core.platform_admins
  where scope = 'SUPERUSER' and status = 'ACTIVE' and user_id <> p_user_id;

  if v_old.scope = 'SUPERUSER' and v_old.status = 'ACTIVE' and v_su_left = 0 then
    raise exception 'LAST_SUPERUSER: promote another superuser before revoking this one'
      using errcode = 'P0001';
  end if;

  update core.platform_admins
     set status = 'DISABLED', mfa_verified_at = null, updated_at = now()
   where user_id = p_user_id;

  perform core.write_platform_audit(
    'REVOKE_PLATFORM_ADMIN', 'PlatformAdmin', v_old.id,
    jsonb_build_object('scope', v_old.scope, 'status', v_old.status),
    jsonb_build_object('status', 'DISABLED'), p_reason
  );
end;
$$;

-- -----------------------------------------------------------------------------
-- What the Super Admin shell asks on load: am I an admin, and is MFA fresh?
-- Returns zero rows for everyone else -- it never reveals that the table
-- exists, and it never leaks another administrator's identity.
-- -----------------------------------------------------------------------------

create or replace function core.my_platform_admin()
returns table (
  scope            core.platform_admin_scope,
  status           core.user_status,
  mfa_verified_at  timestamptz,
  mfa_fresh        boolean,
  mfa_expires_at   timestamptz
)
language sql
stable
security definer
set search_path = core, pg_temp
as $$
  select pa.scope, pa.status, pa.mfa_verified_at,
         pa.mfa_verified_at > now() - interval '8 hours',
         pa.mfa_verified_at + interval '8 hours'
  from core.platform_admins pa
  where pa.user_id = core.current_user_id();
$$;

grant execute on function core.grant_platform_admin(text, text, text) to authenticated;
grant execute on function core.revoke_platform_admin(uuid, text)      to authenticated;
grant execute on function core.my_platform_admin()                    to authenticated;
grant execute on function core.write_platform_audit(text, text, uuid, jsonb, jsonb, text) to authenticated;
