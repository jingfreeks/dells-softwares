-- =============================================================================
-- Fix generate_pairing_code() -- broken on staging by the stores.plan drop
-- -----------------------------------------------------------------------------
-- Found while verifying KI-009 in ALPHA_QA_HANDOFF.md (whether device
-- pairing works end-to-end): calling generate_pairing_code() on staging
-- fails 100% of the time with a raw, untranslated Postgres error --
-- `column "plan" does not exist` -- reproduced live as the QA Owner via
-- the RPC directly. Device pairing has been completely non-functional on
-- staging since 20260815124000 dropped stores.plan.
--
-- Root cause: the function actually deployed on staging is NOT what
-- 0026_device_pairing.sql describes. It carries an extra block --
--
--   select plan into v_plan from stores where id = v_store_id;
--   if v_plan = 'tindahan' then
--     select count(*) into v_device_count
--       from devices where store_id = v_store_id and unpaired_at is null;
--     if v_device_count >= 1 then
--       raise exception 'DEVICE_LIMIT_REACHED';
--     end if;
--   end if;
--
-- -- that exists nowhere in this repo's migration history. Exactly the same
-- class of untracked schema drift 20260815124000 already documented and
-- fixed for the column itself ("created directly against a database
-- outside migration history, not by anything tracked here") -- that
-- migration's own dead-code audit searched function bodies for the
-- trigger-specific pattern `%new.plan%`, which doesn't match this
-- function's ordinary `select plan into v_plan from stores`, so it was
-- missed.
--
-- Confirmed safe to simply drop this block rather than port it forward:
-- device-limit enforcement is not this function's job. It already happens
-- for real, today, via the tracked core.* entitlement system --
-- enforce_device_limit() / trg_devices_limit (20260815102000), a BEFORE
-- INSERT trigger on public.devices itself, fired when the pair-device Edge
-- Function actually inserts the paired device (not when the code is
-- generated). That trigger is untouched by this migration and remains the
-- real enforcement point.
--
-- Restores the function to exactly what 0026_device_pairing.sql specifies.
-- =============================================================================

create or replace function public.generate_pairing_code()
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

comment on function public.generate_pairing_code is
  'Admin-only. Generates a 6-character, single-use, 10-minute pairing '
  'code for a fresh device to redeem via the pair-device Edge Function. '
  'Device-count enforcement happens at actual insert time, not here -- '
  'see enforce_device_limit()/trg_devices_limit (20260815102000).';
