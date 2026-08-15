-- =============================================================================
-- Phase 2 · Migration 011 · Audit writer and generic table trigger
-- -----------------------------------------------------------------------------
-- Two sources of audit rows, deliberately:
--   core.write_audit()   - services log INTENT (why something happened)
--   core.audit_trigger() - triggers log CHANGE (what actually changed)
-- They correlate through request_id.
--
-- Affected modules : all
-- Rollback         : drop the functions and any attached triggers
-- Risk             : none
-- =============================================================================

create or replace function core.write_audit(
  p_organization_id uuid,
  p_action          text,
  p_entity_type     text,
  p_entity_id       uuid    default null,
  p_module_code     text    default 'CORE',
  p_old_data        jsonb   default null,
  p_new_data        jsonb   default null,
  p_reason          text    default null,
  p_device_id       uuid    default null,
  p_request_id      uuid    default null
)
returns bigint
language plpgsql
security definer
set search_path = core, pg_temp
as $$
declare
  v_user  uuid := core.current_user_id();
  v_staff uuid;
  v_kind  core.actor_kind;
  v_id    bigint;
begin
  if p_organization_id is null then
    raise exception 'AUDIT_ORGANIZATION_REQUIRED' using errcode = 'P0001';
  end if;

  v_staff := core.auth_staff_id(p_organization_id);
  v_kind  := case
               when v_user is null                    then 'SYSTEM'
               when v_staff is not null               then 'STAFF'
               when core.is_platform_admin() then 'PLATFORM_ADMIN'
               else 'ANONYMOUS'
             end;

  insert into core.audit_logs (
    organization_id, actor_kind, actor_user_id, actor_staff_id,
    action, module_code, entity_type, entity_id,
    old_data, new_data, reason, device_id, request_id,
    ip_address, user_agent
  ) values (
    p_organization_id, v_kind, v_user, v_staff,
    upper(p_action), upper(p_module_code), p_entity_type, p_entity_id,
    p_old_data, p_new_data, p_reason, p_device_id, coalesce(p_request_id, gen_random_uuid()),
    nullif(current_setting('request.headers', true)::jsonb ->> 'x-forwarded-for', '')::inet,
    nullif(current_setting('request.headers', true)::jsonb ->> 'user-agent', '')
  )
  returning id into v_id;

  return v_id;
exception
  when invalid_text_representation then
    -- A malformed x-forwarded-for header must never fail a business operation.
    insert into core.audit_logs (
      organization_id, actor_kind, actor_user_id, actor_staff_id,
      action, module_code, entity_type, entity_id, old_data, new_data,
      reason, device_id, request_id
    ) values (
      p_organization_id, v_kind, v_user, v_staff,
      upper(p_action), upper(p_module_code), p_entity_type, p_entity_id,
      p_old_data, p_new_data, p_reason, p_device_id, coalesce(p_request_id, gen_random_uuid())
    )
    returning id into v_id;
    return v_id;
end;
$$;

comment on function core.write_audit is
  'Service-layer audit entry point. Actor is derived from the session and can '
  'never be supplied by the caller.';

-- -----------------------------------------------------------------------------
-- Generic change trigger. Attach to any table that has an organization_id.
--   create trigger trg_<table>_audit
--     after insert or update or delete on <schema>.<table>
--     for each row execute function core.audit_trigger('MODULE', 'EntityType');
-- -----------------------------------------------------------------------------
create or replace function core.audit_trigger()
returns trigger
language plpgsql
security definer
set search_path = core, pg_temp
as $$
declare
  v_module text := coalesce(tg_argv[0], 'CORE');
  v_entity text := coalesce(tg_argv[1], tg_table_name);
  v_org    uuid;
  v_old    jsonb;
  v_new    jsonb;
  v_action text;
begin
  if tg_op = 'DELETE' then
    v_old := to_jsonb(old);  v_org := (v_old ->> 'organization_id')::uuid;
    v_action := 'DELETE_' || upper(v_entity);
  elsif tg_op = 'UPDATE' then
    v_old := to_jsonb(old);  v_new := to_jsonb(new);
    v_org := (v_new ->> 'organization_id')::uuid;
    v_action := 'UPDATE_' || upper(v_entity);
  else
    v_new := to_jsonb(new);  v_org := (v_new ->> 'organization_id')::uuid;
    v_action := 'CREATE_' || upper(v_entity);
  end if;

  -- Secrets never reach the audit log.
  v_old := v_old - 'pin_hash' - 'pairing_code_hash' - 'device_secret_hash';
  v_new := v_new - 'pin_hash' - 'pairing_code_hash' - 'device_secret_hash';

  -- core.organizations has no organization_id column; it IS the organization.
  if v_org is null and tg_table_name = 'organizations' then
    v_org := (coalesce(v_new, v_old) ->> 'id')::uuid;
  end if;

  if v_org is null then
    return coalesce(new, old);   -- platform reference table: nothing tenant-scoped to log
  end if;

  -- An UPDATE that changed nothing auditable is not worth a row.
  if tg_op = 'UPDATE'
     and core.jsonb_diff_keys(v_old, v_new) <@ array['updated_at']::text[] then
    return new;
  end if;

  perform core.write_audit(
    p_organization_id => v_org,
    p_action          => v_action,
    p_entity_type     => v_entity,
    p_entity_id       => (coalesce(v_new, v_old) ->> 'id')::uuid,
    p_module_code     => v_module,
    p_old_data        => v_old,
    p_new_data        => v_new
  );

  return coalesce(new, old);
end;
$$;

-- Attach to the phase 1 tables.
create trigger trg_organizations_audit
  after insert or update or delete on core.organizations
  for each row execute function core.audit_trigger('CORE', 'Organization');

create trigger trg_branches_audit
  after insert or update or delete on core.branches
  for each row execute function core.audit_trigger('CORE', 'Branch');

create trigger trg_staff_audit
  after insert or update or delete on core.staff
  for each row execute function core.audit_trigger('CORE', 'Staff');

create trigger trg_staff_branches_audit
  after insert or update or delete on core.staff_branches
  for each row execute function core.audit_trigger('CORE', 'StaffBranch');

grant execute on function core.write_audit(uuid, text, text, uuid, text, jsonb, jsonb, text, uuid, uuid)
  to authenticated, app_pos, app_inv, app_acc, app_admin;
