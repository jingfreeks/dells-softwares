-- Fix: start_cashier_session (0024) recorded a failed PIN attempt via
-- `update staff set pin_failed_attempts = ...` and then `raise exception
-- 'INVALID_PIN'` — but raising an exception aborts the entire calling
-- transaction, rolling back that same update. The lockout counter never
-- actually persisted on a wrong PIN, so "too many attempts" could never
-- trigger. Found during live verification (a wrong-PIN attempt correctly
-- showed the error, but pin_failed_attempts stayed 0 in the database).
--
-- Fix: stop raising for the three business-logic outcomes (inactive
-- employee, locked, wrong PIN) and return a normal (ok, error_code, ...)
-- row instead, so the counter update commits as part of the same
-- successful function call. Only a missing/foreign staff row still raises
-- (that path never touches the counter, so no rollback risk there).

drop function if exists start_cashier_session(uuid, text);

create function start_cashier_session(p_staff_id uuid, p_pin text)
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
  insert into cashier_sessions (store_id, staff_id, created_by, expires_at)
    values (v_store_id, p_staff_id, auth.uid(), v_expires_at)
    returning cashier_sessions.token into v_new_token;

  return query select true, null::text, v_new_token, v_target.id, v_target.name, v_target.role, v_target.avatar_url, v_expires_at;
end;
$$;

revoke all on function start_cashier_session(uuid, text) from public;
grant execute on function start_cashier_session(uuid, text) to authenticated;
