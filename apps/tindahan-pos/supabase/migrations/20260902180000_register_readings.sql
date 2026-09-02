-- =============================================================================
-- register_readings -- the persisted X/Z reading
-- -----------------------------------------------------------------------------
-- Step 1 of apps/tindahan-pos/XZ-READINGS-DESIGN.md. Structure only: nothing
-- writes to this table yet, and no behaviour changes. take_reading() is step 2.
--
-- §21 of the BIR documentation records that the accumulating totals "were not
-- identified in the implementation". The reason is that there was nowhere to
-- put them: the Z-Reading is recomputed client-side from `sales` every time it
-- is opened, so a void recorded tomorrow silently changes what yesterday's Z
-- displays. A closing artefact that changes after the fact is not one.
--
-- Decisions this encodes (design §10, answered 2026-09-02):
--
--   Scope        per (store, register). device_id is the register; NULL means
--                the store's own machine -- a browser rather than a paired
--                device. A real `devices` row for the default was rejected:
--                trg_devices_limit enforces the device cap on insert, so it
--                would consume a paid slot and fail outright for a store
--                already at its cap.
--
--   Late entries a sale that syncs after its business date is closed lands in
--                the next open period and is counted there. Hence
--                late_entry_count / late_entry_total: the discrepancy stays
--                visible instead of being absorbed, and the closed Z stays
--                exactly as it was taken.
--
--   Grand total  gross. Voids and refunds are recorded as their own totals and
--                never subtract, so the accumulation only ever increases. A
--                decreasing grand total is what a reset check looks for.
--
-- Affected modules : POS, reporting
-- Rollback         : drop table register_readings cascade;
-- Risk             : low -- a new table nothing reads or writes yet.
-- =============================================================================

create table register_readings (
  id                uuid primary key default gen_random_uuid(),
  store_id          uuid not null references stores (id) on delete cascade,

  kind              text not null check (kind in ('X', 'Z')),

  -- Z only. Increments per (store, register); never reused, and never reset
  -- by a close -- only by the deliberate reset path, which is not built yet.
  z_counter         integer,
  reset_counter     integer not null default 0,

  business_date     date not null,
  opened_at         timestamptz not null,
  closed_at         timestamptz not null default now(),

  -- Life-to-date net sales for this register AFTER this reading. Gross of
  -- voids and refunds, so it never decreases.
  grand_total       numeric(14,2) not null,

  -- The period's own figures, frozen at the moment of the reading.
  gross_sales       numeric(14,2) not null,
  net_sales         numeric(14,2) not null,
  total_discounts   numeric(14,2) not null,
  vatable_sales     numeric(14,2) not null,
  vat_amount        numeric(14,2) not null,
  vat_exempt        numeric(14,2) not null,
  zero_rated        numeric(14,2) not null,
  transaction_count integer not null,
  voided_count      integer not null,
  voided_total      numeric(14,2) not null,
  refund_count      integer not null,
  refund_total      numeric(14,2) not null,
  beginning_receipt text,
  ending_receipt    text,
  payment_breakdown jsonb not null default '{}'::jsonb,

  -- Sales that belonged to an already-closed period and landed here instead.
  late_entry_count  integer not null default 0,
  late_entry_total  numeric(14,2) not null default 0,

  -- The register. NULL is the store's own machine; see the header.
  device_id         uuid references devices (id) on delete set null,
  taken_by          uuid not null references staff (id),
  created_at        timestamptz not null default now(),

  constraint z_has_counter check ((kind = 'Z') = (z_counter is not null)),
  constraint grand_total_not_negative check (grand_total >= 0),
  constraint counts_not_negative check (
    transaction_count >= 0 and voided_count >= 0 and refund_count >= 0
      and late_entry_count >= 0
  )
);

-- The counter is unique per (store, register). device_id is coalesced so the
-- store's own register -- the null case -- takes part in uniqueness like any
-- paired device, rather than every browser reading colliding on a single null.
create unique index register_readings_z_counter_uq
  on register_readings (store_id, coalesce(device_id, '00000000-0000-0000-0000-000000000000'::uuid), z_counter)
  where kind = 'Z';

create index register_readings_store_date_idx
  on register_readings (store_id, business_date desc);

-- -----------------------------------------------------------------------------
-- Immutability. This is the property that makes a reading a closing artefact
-- rather than a report, so it is enforced by the database rather than left to
-- a convention -- the same way core.platform_audit_logs already refuses
-- mutation. Without it, the table is just a cache of a recomputable view.
-- -----------------------------------------------------------------------------
create or replace function reject_register_reading_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'REGISTER_READINGS_APPEND_ONLY'
    using hint = 'A reading is a closing artefact. Take a new one instead of changing this.',
          errcode = 'P0001';
end;
$$;

create trigger trg_register_readings_no_update
  before update on register_readings
  for each row execute function reject_register_reading_mutation();

create trigger trg_register_readings_no_delete
  before delete on register_readings
  for each row execute function reject_register_reading_mutation();

-- -----------------------------------------------------------------------------
-- RLS. Readable by the store's own staff; written only by take_reading()
-- (step 2), which will be SECURITY DEFINER. No client insert policy: a
-- client-computed closing artefact is not an artefact.
-- -----------------------------------------------------------------------------
alter table register_readings enable row level security;

create policy "staff can read own store readings" on register_readings
  for select to authenticated
  using (store_id = auth_store_id());

comment on table register_readings is
  'Persisted X and Z readings. Append-only by trigger; written only by '
  'take_reading() (SECURITY DEFINER). device_id is the register -- NULL means '
  'the store''s own machine rather than a paired device.';
