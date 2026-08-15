-- Staff page phase 2: real shift/drawer tracking.
--
-- cashier_sessions (0024, tightened by 0025) is already exactly "one row
-- per cashier shift" -- created by start_cashier_session() on PIN login,
-- closed by end_cashier_session() on "Switch cashier". It just has no cash
-- columns. This adds an opening float (counted at login), a closing float
-- (counted at "Switch cashier"), and a computed variance -- no new table,
-- reusing the session row that already anchors "who, when, which store".
--
-- Expected closing cash = opening_float + sum of completed cash-sale totals
-- during the session window. This deliberately does NOT reconcile eload
-- cash-in/cash-out service lines (CashInServicePanel/CashOutServicePanel)
-- into the variance -- those aren't a structured, queryable "till delta"
-- today (free-text service names on sale_items), and folding them in
-- accurately would need its own schema work. Documented as a known
-- limitation on the frontend variance card, not silently assumed away.

alter table cashier_sessions
  add column opening_float numeric(10, 2),
  add column closing_float numeric(10, 2),
  add column expected_closing numeric(10, 2),
  add column variance numeric(10, 2);

-- ---------------------------------------------------------------------------
-- start_cashier_session: same body as 0025's version, plus an opening float
-- counted by the cashier before they can start ringing up sales.
-- ---------------------------------------------------------------------------

drop function if exists start_cashier_session(uuid, text);

create function start_cashier_session(p_staff_id uuid, p_pin text, p_opening_float numeric)
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

  return query select true, null::text, v_new_token, v_target.id, v_target.name, v_target.role, v_target.avatar_url, v_expires_at;
end;
$$;

revoke all on function start_cashier_session(uuid, text, numeric) from public;
grant execute on function start_cashier_session(uuid, text, numeric) to authenticated;

-- ---------------------------------------------------------------------------
-- end_cashier_session: an optional closing float. When given, computes the
-- expected drawer balance from the session's opening float plus completed
-- cash sales rung up during the session window, and stores the variance.
-- When omitted ("Skip count"), behaves exactly as before -- just revokes
-- the token, no cash figures recorded.
-- ---------------------------------------------------------------------------

drop function if exists end_cashier_session(text);

create function end_cashier_session(p_token text, p_closing_float numeric default null)
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
end;
$$;

revoke all on function end_cashier_session(text, numeric) from public;
grant execute on function end_cashier_session(text, numeric) to authenticated;
