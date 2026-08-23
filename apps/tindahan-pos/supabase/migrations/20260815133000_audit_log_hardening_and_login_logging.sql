-- 20260815133000_audit_log_hardening_and_login_logging.sql
--
-- BIR Compliance Audit, Phase 3: Audit & Security.
--
-- Decision (confirmed): extend public.audit_log directly rather than wire
-- onto core.audit_logs -- core.audit_logs belongs to a separate, not-yet-
-- launched multi-tenant "organizations" layer with a different identity
-- model (core.organizations/core.staff, keyed by organization_id) than this
-- app's (stores/staff, keyed by store_id); core isn't exposed to PostgREST,
-- and core.log_auth_event() has zero call sites anywhere. Wiring onto it
-- would mean exposing a new schema and rewriting all 11 existing
-- public.audit_log writers to a different column shape -- a separate
-- architectural migration, not a Phase 3 slice.
--
-- Three things, all landing on public.audit_log:
--   1. An explicit immutability trigger, mirroring core.reject_audit_
--      mutation()'s own shape -- not decorative: 20260815101000 grants
--      update/delete on every public table (including audit_log) to
--      authenticated/service_role as the actual Supabase-project default-ACL
--      fix, so only RLS's absent UPDATE/DELETE policy stood between
--      audit_log and a mutation until now.
--   2. Staff (owner/admin) login/logout logging via a new RPC.
--   3. Cashier-shift login/logout logging inside the existing
--      start_cashier_session()/end_cashier_session() RPCs.

-- ---------------------------------------------------------------------------
-- 1. Immutability trigger + explicit revoke.
-- ---------------------------------------------------------------------------

create or replace function reject_audit_log_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'AUDIT_LOG_IMMUTABLE: audit rows cannot be % ', lower(tg_op)
    using errcode = 'P0001';
end;
$$;

drop trigger if exists trg_audit_log_immutable on audit_log;
create trigger trg_audit_log_immutable
  before update or delete on audit_log
  for each row execute function reject_audit_log_mutation();

revoke update, delete on audit_log from authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 2. log_staff_auth_event(): owner/staff login and logout.
-- ---------------------------------------------------------------------------

create or replace function log_staff_auth_event(p_action text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_store_id uuid;
begin
  v_store_id := auth_store_id();
  if v_store_id is null then
    raise exception 'Not a registered staff member of any store';
  end if;
  if p_action not in ('login', 'logout') then
    raise exception 'INVALID_AUTH_EVENT_ACTION';
  end if;

  insert into audit_log (store_id, actor_id, action, entity_type, entity_id)
    values (
      v_store_id, auth.uid(),
      case p_action when 'login' then 'staff_logged_in' else 'staff_logged_out' end,
      'staff', auth.uid()
    );
end;
$$;

revoke all on function log_staff_auth_event(text) from public, anon, service_role;
grant execute on function log_staff_auth_event(text) to authenticated;

-- ---------------------------------------------------------------------------
-- 3. start_cashier_session() / end_cashier_session(): add cashier-shift
-- audit writes. Same signatures as 0042_shift_tracking.sql's versions (the
-- current definitions -- no later migration touches them), so this is a
-- plain CREATE OR REPLACE, no overload risk.
-- ---------------------------------------------------------------------------

create or replace function start_cashier_session(p_staff_id uuid, p_pin text, p_opening_float numeric)
returns table (
  ok boolean,
  error_code text,
  token text,
  staff_id uuid,
  name text,
  role staff_role,
  avatar_url text,
  expires_at timestamptz
)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_store_id uuid := auth_store_id();
  v_target staff%rowtype;
  v_new_token text;
  v_expires_at timestamptz;
begin
  if v_store_id is null then
    raise exception 'Not a registered staff member of any store';
  end if;

  select * into v_target from staff where id = p_staff_id and store_id = v_store_id for update;
  if not found then
    raise exception 'Staff member not found in this store';
  end if;

  if not v_target.active then
    return query select false, 'INACTIVE_EMPLOYEE', null::text, null::uuid, null::text, null::staff_role, null::text, null::timestamptz;
    return;
  end if;

  if v_target.pin_locked_until is not null and v_target.pin_locked_until > now() then
    return query select false, 'PIN_LOCKED', null::text, null::uuid, null::text, null::staff_role, null::text, null::timestamptz;
    return;
  end if;

  if v_target.pin_hash is null or v_target.pin_hash <> crypt(p_pin, v_target.pin_hash) then
    update staff
      set pin_failed_attempts = pin_failed_attempts + 1,
          pin_locked_until = case when pin_failed_attempts + 1 >= 5 then now() + interval '15 minutes' else pin_locked_until end
      where id = p_staff_id;
    return query select false, 'INVALID_PIN', null::text, null::uuid, null::text, null::staff_role, null::text, null::timestamptz;
    return;
  end if;

  update staff set pin_failed_attempts = 0, pin_locked_until = null where id = p_staff_id;

  v_expires_at := now() + interval '12 hours';
  insert into cashier_sessions (store_id, staff_id, created_by, expires_at, opening_float)
    values (v_store_id, p_staff_id, auth.uid(), v_expires_at, p_opening_float)
    returning cashier_sessions.token into v_new_token;

  insert into audit_log (store_id, actor_id, action, entity_type, entity_id, new_value)
    values (
      v_store_id, p_staff_id, 'cashier_session_started', 'staff', p_staff_id,
      jsonb_build_object('opening_float', p_opening_float)
    );

  return query select true, null::text, v_new_token, v_target.id, v_target.name, v_target.role, v_target.avatar_url, v_expires_at;
end;
$$;

revoke all on function start_cashier_session(uuid, text, numeric) from public;
grant execute on function start_cashier_session(uuid, text, numeric) to authenticated;

create or replace function end_cashier_session(p_token text, p_closing_float numeric default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session cashier_sessions%rowtype;
  v_cash_sales numeric;
  v_expected numeric;
begin
  select * into v_session from cashier_sessions
    where token = p_token and store_id = auth_store_id() and revoked_at is null
    for update;
  if not found then
    return;
  end if;

  if p_closing_float is null then
    update cashier_sessions set revoked_at = now() where id = v_session.id;
    insert into audit_log (store_id, actor_id, action, entity_type, entity_id)
      values (v_session.store_id, v_session.staff_id, 'cashier_session_ended', 'staff', v_session.staff_id);
    return;
  end if;

  select coalesce(sum(total), 0) into v_cash_sales
    from sales
    where cashier_id = v_session.staff_id
      and store_id = v_session.store_id
      and payment_type = 'cash'
      and status = 'completed'
      and created_at >= v_session.created_at
      and created_at <= now();

  v_expected := coalesce(v_session.opening_float, 0) + v_cash_sales;

  update cashier_sessions
    set revoked_at = now(),
        closing_float = p_closing_float,
        expected_closing = v_expected,
        variance = p_closing_float - v_expected
    where id = v_session.id;

  insert into audit_log (store_id, actor_id, action, entity_type, entity_id, new_value)
    values (
      v_session.store_id, v_session.staff_id, 'cashier_session_ended', 'staff', v_session.staff_id,
      jsonb_build_object('closing_float', p_closing_float, 'expected_closing', v_expected, 'variance', p_closing_float - v_expected)
    );
end;
$$;

revoke all on function end_cashier_session(text, numeric) from public;
grant execute on function end_cashier_session(text, numeric) to authenticated;
