-- =============================================================================
-- Phase 1 · Migration 008 · core.audit_logs (append-only, partitioned monthly)
-- -----------------------------------------------------------------------------
-- Created in phase 1 because every later phase writes to it. Full trigger
-- coverage of business tables arrives with each module; the generic trigger
-- function lives here.
--
-- Affected modules : all
-- Rollback         : drop table core.audit_logs cascade
-- Risk             : none
-- =============================================================================

create table core.audit_logs (
  id               bigint generated always as identity,
  organization_id  uuid not null references core.organizations (id) on delete restrict,

  actor_kind       core.actor_kind not null default 'STAFF',
  actor_user_id    uuid,
  actor_staff_id   uuid references core.staff (id),

  action           text not null,
  module_code      text not null default 'CORE',
  entity_type      text not null,
  entity_id        uuid,

  old_data         jsonb,
  new_data         jsonb,
  changed_fields   text[] generated always as (core.jsonb_diff_keys(old_data, new_data)) stored,

  -- Required by the service layer for void / refund / adjustment / role change.
  reason           text,

  ip_address       inet,
  user_agent       text,
  device_id        uuid,
  -- Correlates every log line produced by one logical operation.
  request_id       uuid,

  created_at       timestamptz not null default now(),

  primary key (id, created_at)
) partition by range (created_at);

comment on table core.audit_logs is
  'Append only. No application role holds UPDATE or DELETE. Partitioned monthly; '
  'old partitions are detached to cold storage, never dropped inside the retention window.';

create index audit_logs_org_time_idx     on core.audit_logs (organization_id, created_at desc);
create index audit_logs_entity_idx       on core.audit_logs (organization_id, entity_type, entity_id, created_at desc);
create index audit_logs_actor_idx        on core.audit_logs (organization_id, actor_staff_id, created_at desc);
create index audit_logs_action_idx       on core.audit_logs (organization_id, action, created_at desc);
create index audit_logs_request_idx      on core.audit_logs (request_id);

-- -----------------------------------------------------------------------------
-- Partition management
-- -----------------------------------------------------------------------------
create or replace function core.ensure_audit_partition(p_month date)
returns text
language plpgsql
as $$
declare
  v_start date := date_trunc('month', p_month)::date;
  v_end   date := (date_trunc('month', p_month) + interval '1 month')::date;
  v_name  text := format('audit_logs_%s', to_char(v_start, 'YYYY_MM'));
begin
  if not exists (
    select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'core' and c.relname = v_name
  ) then
    execute format(
      'create table core.%I partition of core.audit_logs for values from (%L) to (%L)',
      v_name, v_start, v_end);
    execute format('grant select, insert on core.%I to app_pos, app_inv, app_acc, app_admin, authenticated', v_name);
  end if;
  return v_name;
end;
$$;

comment on function core.ensure_audit_partition is
  'Idempotent. Call from a scheduled job for the current and next month.';

-- Bootstrap: current month plus the next three.
do $$
declare i int;
begin
  for i in 0..3 loop
    perform core.ensure_audit_partition((current_date + (i || ' month')::interval)::date);
  end loop;
end $$;

-- Catch-all so an insert can never fail because a partition is missing.
create table core.audit_logs_overflow
  partition of core.audit_logs default;
grant select, insert on core.audit_logs_overflow
  to app_pos, app_inv, app_acc, app_admin, authenticated;

-- -----------------------------------------------------------------------------
-- Append-only enforcement
-- -----------------------------------------------------------------------------
grant select, insert on core.audit_logs to app_pos, app_inv, app_acc, app_admin, authenticated;
revoke update, delete on core.audit_logs from app_pos, app_inv, app_acc, app_admin, authenticated;

create or replace function core.reject_audit_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'AUDIT_LOG_IMMUTABLE: audit rows cannot be % ', lower(tg_op)
    using errcode = 'P0001';
end;
$$;

create trigger trg_audit_logs_immutable
  before update or delete on core.audit_logs
  for each row execute function core.reject_audit_mutation();
