-- Device / register pairing.
--
-- A paired tablet needs to authenticate going forward with no human ever
-- staying signed into it. This migration mints paired devices a real (but
-- human-invisible) identity — a `devices` row keyed the same way `staff`
-- is (id == the device's own auth.users id) — so `auth_store_id()` can
-- resolve a store for a device session exactly the way it already does
-- for a human one. `auth_role()` is deliberately left untouched: a device
-- has no `staff` row, so it naturally resolves to NULL, and every existing
-- `auth_role() = 'admin'` gated write in the schema stays closed to
-- devices with zero other policy changes.
--
-- No branches in this phase (confirmed with the user) — devices pair
-- directly to a store.
--
-- Rollback, if ever needed:
--   drop function if exists admin_unpair_device(uuid, text);
--   drop function if exists list_pickable_cashiers();
--   drop function if exists _validate_pairing_code(text);
--   drop function if exists generate_pairing_code();
--   drop table if exists device_pairing_codes;
--   drop table if exists devices;
--   -- then recreate auth_store_id() from 0001's single-select body.

-- ---------------------------------------------------------------------------
-- devices: mirrors the staff identity shape. No FK to auth.users — a
-- deleted auth user (on unpair) must not cascade away this audit row,
-- exactly like a removed cashier's historical sales.cashier_id stays valid.
-- ---------------------------------------------------------------------------

create table devices (
  id uuid primary key,
  store_id uuid not null references stores (id) on delete cascade,
  name text not null,
  paired_by uuid not null references staff (id),
  paired_at timestamptz not null default now(),
  last_seen_at timestamptz,
  unpaired_at timestamptz
);

create index devices_store_id_idx on devices (store_id);

alter table devices enable row level security;

create policy "staff and devices can view store devices"
  on devices for select
  using (store_id = auth_store_id());

-- No client insert/update/delete policy — only the pair-device and
-- unpair-device Edge Functions (service_role) and admin_unpair_device()
-- (security definer) ever write to this table.

-- ---------------------------------------------------------------------------
-- device_pairing_codes: short-lived, single-use, rate-limited. No client
-- policy at all — a fresh tablet has no session to be RLS-scoped by yet,
-- so validation happens entirely inside security definer functions called
-- from the pair-device Edge Function via the service_role client.
-- ---------------------------------------------------------------------------

-- No per-code attempt_count: a redemption attempt is checked against ALL
-- currently-live codes across every store (there's no store context until
-- a code matches), so a wrong guess can't be attributed to a single row to
-- rate-limit. The 10-minute expiry plus the small live-code candidate set
-- is the real defense here; IP-level throttling on the Edge Function is
-- out of scope for this phase (see plan).
create table device_pairing_codes (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references stores (id) on delete cascade,
  code_hash text not null,
  created_by uuid not null references staff (id),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  consumed_at timestamptz,
  consumed_by_device_id uuid references devices (id)
);

create index device_pairing_codes_store_id_idx on device_pairing_codes (store_id, created_at desc);

alter table device_pairing_codes enable row level security;
-- No select/insert/update policy for any role — including authenticated.
-- Reached only via SECURITY DEFINER functions below.

-- ---------------------------------------------------------------------------
-- generate_pairing_code — admin-only. Returns the raw code exactly once;
-- only its hash is ever stored, same as staff.pin_hash.
-- ---------------------------------------------------------------------------

create or replace function generate_pairing_code()
returns table (code text, expires_at timestamptz)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_store_id uuid := auth_store_id();
  v_alphabet constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; -- excludes 0/O/1/I/L
  v_code text := '';
  v_expires_at timestamptz;
  i int;
begin
  if v_store_id is null or auth_role() <> 'admin' then
    raise exception 'Only an admin can generate a pairing code';
  end if;

  for i in 1..6 loop
    v_code := v_code || substr(v_alphabet, 1 + floor(random() * length(v_alphabet))::int, 1);
  end loop;

  v_expires_at := now() + interval '10 minutes';

  insert into device_pairing_codes (store_id, code_hash, created_by, expires_at)
    values (v_store_id, crypt(v_code, gen_salt('bf')), auth.uid(), v_expires_at);

  return query select v_code, v_expires_at;
end;
$$;

revoke all on function generate_pairing_code() from public;
grant execute on function generate_pairing_code() to authenticated;

-- ---------------------------------------------------------------------------
-- _validate_pairing_code — called only by the pair-device Edge Function via
-- the service_role client (never granted to `authenticated` — a fresh
-- tablet has no session at all, so there is no auth.uid() to gate this by).
-- Mirrors 0025's fix: on a wrong guess, the attempt_count increment must
-- NOT be lost to a rolled-back transaction, so this returns a normal
-- (ok, error_code, ...) row instead of raising for expected failures.
-- ---------------------------------------------------------------------------

create or replace function _validate_pairing_code(p_code text)
returns table (ok boolean, error_code text, pairing_code_id uuid, store_id uuid, store_name text, created_by uuid)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_row device_pairing_codes%rowtype;
  v_store_name text;
begin
  -- Scans all live (non-expired, non-consumed) codes and compares by hash,
  -- since the code itself (not its hash) is the only thing the caller has
  -- — same trade-off as any bcrypt-hashed-secret lookup. Practically
  -- bounded by the 10-minute expiry keeping the candidate set small.
  for v_row in
    select * from device_pairing_codes
      where expires_at > now() and consumed_at is null
      order by created_at desc
      for update
  loop
    if v_row.code_hash = crypt(p_code, v_row.code_hash) then
      select name into v_store_name from stores where id = v_row.store_id;
      return query select true, null::text, v_row.id, v_row.store_id, v_store_name, v_row.created_by;
      return;
    end if;
  end loop;

  -- No match found among live codes. We can't attribute a failed guess's
  -- attempt_count to a specific row when the code itself doesn't match
  -- anything, so this path simply reports invalid/expired without
  -- incrementing a per-code counter (there's no single code to blame).
  return query select false, 'INVALID_OR_EXPIRED_CODE', null::uuid, null::uuid, null::text, null::uuid;
end;
$$;

revoke all on function _validate_pairing_code(text) from public;
-- Deliberately NOT granted to `authenticated` or `anon` — only ever called
-- by the pair-device Edge Function's service_role client, which bypasses
-- grants entirely. No grant statement needed (service_role already has it).

-- ---------------------------------------------------------------------------
-- _consume_pairing_code — called by the pair-device Edge Function AFTER it
-- has created the new device's auth user and devices row (the device's id
-- doesn't exist yet at validation time, so consumption is a separate,
-- later step). Single-use: only succeeds once per code.
-- ---------------------------------------------------------------------------

create or replace function _consume_pairing_code(p_pairing_code_id uuid, p_device_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update device_pairing_codes
    set consumed_at = now(), consumed_by_device_id = p_device_id
    where id = p_pairing_code_id and consumed_at is null
$$;

revoke all on function _consume_pairing_code(uuid, uuid) from public;
-- Same as _validate_pairing_code: reached only via the service_role client.

-- ---------------------------------------------------------------------------
-- list_pickable_cashiers — fixes a real gap, not just a Phase 3 need. The
-- cashier picker (CashierLoginScreen) needs to list active staff for ANY
-- authenticated store session (admin, or now a device) — but RLS can't
-- restrict by column, so broadening the raw `staff` table's SELECT policy
-- to "any store member" would let a direct query pull pin_hash/email/phone
-- too. A `returns table(...)` function closes this off structurally: the
-- column list is baked into the function signature, never client-supplied.
-- ---------------------------------------------------------------------------

create or replace function list_pickable_cashiers()
returns table (id uuid, name text, avatar_url text)
language sql
security definer
stable
set search_path = public
as $$
  select id, name, avatar_url
  from staff
  where store_id = auth_store_id() and active = true
  order by name
$$;

revoke all on function list_pickable_cashiers() from public;
grant execute on function list_pickable_cashiers() to authenticated;

-- ---------------------------------------------------------------------------
-- admin_unpair_device — admin-only, owner-PIN-gated (matches the mockup's
-- "Only an owner PIN can unpair it later"). Marks the device unpaired;
-- called by the unpair-device Edge Function right before it also
-- hard-kills the device's live session via the service_role Auth Admin API
-- (a pure SQL function can't revoke a JWT itself).
-- ---------------------------------------------------------------------------

create or replace function admin_unpair_device(p_device_id uuid, p_owner_pin text)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_admin staff%rowtype;
begin
  if auth_role() <> 'admin' then
    raise exception 'Only an admin can unpair a device';
  end if;

  select * into v_admin from staff where id = auth.uid();
  if v_admin.pin_hash is null or v_admin.pin_hash <> crypt(p_owner_pin, v_admin.pin_hash) then
    raise exception 'INVALID_OWNER_PIN';
  end if;

  update devices
    set unpaired_at = now()
    where id = p_device_id and store_id = auth_store_id();
  if not found then
    raise exception 'Device not found in this store';
  end if;
end;
$$;

revoke all on function admin_unpair_device(uuid, text) from public;
grant execute on function admin_unpair_device(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- auth_store_id(): extended to also resolve a paired device's session.
-- auth_role() is intentionally untouched — a device has no staff row, so
-- it resolves to NULL, and every auth_role() = 'admin' gated write stays
-- closed to devices automatically.
-- ---------------------------------------------------------------------------

create or replace function auth_store_id()
returns uuid
language sql
security definer
stable
set search_path = public
as $$
  select store_id from staff where id = auth.uid()
  union all
  select store_id from devices where id = auth.uid() and unpaired_at is null
  limit 1
$$;
