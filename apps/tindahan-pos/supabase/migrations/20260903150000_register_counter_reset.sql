-- Resetting a register's accumulating totals -- XZ-READINGS-DESIGN.md §10 q5
--
-- The last open question in that design, answered 2026-09-03: a reset is a
-- PLATFORM action, not a shop one. core.is_platform_admin('ENGINEER') gates it,
-- which means an ACTIVE roster row and MFA verified within the last 8 hours,
-- exactly like every other privileged platform action. A store owner cannot
-- reset their own register.
--
-- Why not let the shop do it: the reset counter is the field an examiner uses
-- to detect a register that quietly started counting again from zero. Design §7
-- is explicit that making it easy to reach would defeat it, and putting it in
-- the hands of the party it exists to check is the clearest way to make it easy.
-- It also matches how accredited POS resets are normally handled -- by the
-- supplier, on a recorded instruction, rather than by the merchant.
--
-- HOW A RESET IS RECORDED
--
-- register_readings is append-only, so a reset cannot rewrite what earlier
-- readings said, and should not: those readings were true when taken. A reset
-- is therefore its own event, in its own append-only table, and the NEXT
-- reading reads it.
--
-- WHAT A RESET DOES, AND WHAT IT DELIBERATELY DOES NOT
--
--   does      zero the accumulation baseline, so the next reading's grand
--             total starts from that period's net alone
--   does      raise reset_counter, which every later reading then carries
--   does NOT  move the period boundary
--
-- That last one matters. The period still runs from the last Z, so sales made
-- between that Z and the reset are still counted by the next reading. Starting
-- the period at the reset instead would have left those sales in no reading at
-- all -- money that happened and appears nowhere, which is a worse failure than
-- the one this feature exists to prevent.
--
-- Affected modules : POS, reporting, platform console
-- Rollback         : drop function platform_reset_register_counter(uuid, uuid, text, text);
--                    drop table register_resets cascade;
-- Risk             : low -- nothing calls it until the console does, and the
--                    reset counter is 0 everywhere today.

create table register_resets (
  id                  uuid primary key default gen_random_uuid(),
  store_id            uuid not null references stores (id) on delete cascade,

  -- The register, matching register_readings: NULL is the store's own machine.
  device_id           uuid references devices (id) on delete set null,

  -- The value every reading after this one carries. Never reused.
  reset_counter       integer not null check (reset_counter > 0),

  reason              text not null check (length(btrim(reason)) > 0),

  -- Optional, for a reset that was directed rather than operational: a permit
  -- or directive number. Not mandatory, because a tablet replaced at 9pm is a
  -- legitimate reset that nobody has a reference number for.
  authority_reference text,

  authorised_by       uuid not null,
  -- clock_timestamp(), matching register_readings.closed_at. now() is fixed for
  -- the whole transaction, so a reset recorded after a reading in the same
  -- transaction would carry an earlier timestamp than the reading it follows,
  -- and take_reading() decides whether to zero the baseline by comparing the
  -- two. The moment the reset was actually recorded is the honest value anyway.
  created_at          timestamptz not null default clock_timestamp()
);

create unique index register_resets_counter_uq
  on register_resets (store_id, coalesce(device_id, '00000000-0000-0000-0000-000000000000'::uuid), reset_counter);

create index register_resets_store_idx on register_resets (store_id, created_at desc);

-- Append-only, for the same reason register_readings is: a reset record that
-- can be edited afterwards is not evidence of anything.
create or replace function reject_register_reset_mutation()
returns trigger
language plpgsql
set search_path = public
as $function$
begin
  raise exception 'REGISTER_RESETS_APPEND_ONLY'
    using errcode = '42501',
          hint = 'a reset is a recorded event; correct it by recording another, not by editing this one.';
end;
$function$;

create trigger trg_register_resets_append_only
  before update or delete on register_resets
  for each row execute function reject_register_reset_mutation();

alter table register_resets enable row level security;

-- The shop may READ its own resets -- it should be able to see that its
-- register was reset, and when, and why. Only the platform writes, and only
-- through the function below.
create policy "staff can view store register resets" on register_resets
  for select using (store_id = auth_store_id() or core.is_platform_admin());

create or replace function platform_reset_register_counter(
  p_store_id           uuid,
  p_device_id          uuid default null,
  p_reason             text default null,
  p_authority_reference text default null
)
returns register_resets
language plpgsql
security definer
set search_path = public, core, extensions
as $function$
declare
  v_next  integer;
  v_row   register_resets;
begin
  if not core.is_platform_admin('ENGINEER') then
    raise exception 'UNAUTHORIZED_ACTION' using errcode = 'P0001';
  end if;

  if p_reason is null or length(btrim(p_reason)) = 0 then
    raise exception 'VALIDATION_FAILED: a reset needs a reason'
      using errcode = 'P0001';
  end if;

  if not exists (select 1 from stores where id = p_store_id) then
    raise exception 'VALIDATION_FAILED: no such store' using errcode = 'P0001';
  end if;

  -- Same lock shape take_reading() uses, so a reset cannot interleave with a
  -- reading being taken on the same register.
  perform pg_advisory_xact_lock(
    hashtext(p_store_id::text || ':' || coalesce(p_device_id::text, 'own'))
  );

  select coalesce(max(reset_counter), 0) + 1 into v_next
    from register_resets
   where store_id = p_store_id
     and coalesce(device_id, '00000000-0000-0000-0000-000000000000'::uuid)
       = coalesce(p_device_id, '00000000-0000-0000-0000-000000000000'::uuid);

  insert into register_resets (
    store_id, device_id, reset_counter, reason, authority_reference, authorised_by
  ) values (
    p_store_id, p_device_id, v_next, btrim(p_reason),
    nullif(btrim(coalesce(p_authority_reference, '')), ''), auth.uid()
  )
  returning * into v_row;

  insert into core.platform_audit_logs (
    actor_user_id, action, entity_type, entity_id, new_data, reason
  ) values (
    auth.uid(), 'register_counter_reset', 'store', p_store_id,
    jsonb_build_object(
      'device_id', p_device_id,
      'reset_counter', v_next,
      'authority_reference', v_row.authority_reference
    ),
    v_row.reason
  );

  return v_row;
end;
$function$;

revoke all on function platform_reset_register_counter(uuid, uuid, text, text)
  from public, anon, service_role;
grant execute on function platform_reset_register_counter(uuid, uuid, text, text)
  to authenticated;
