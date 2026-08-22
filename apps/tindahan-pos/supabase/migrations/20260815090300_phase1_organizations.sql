-- =============================================================================
-- Phase 1 · Migration 004 · core.organizations  (the tenant)
-- -----------------------------------------------------------------------------
-- Affected modules : all (every tenant table references this)
-- Rollback         : drop table core.organizations cascade
-- Risk             : none
-- =============================================================================

create table core.organizations (
  id                       uuid primary key default gen_random_uuid(),

  -- Trading name shown in the apps.
  name                     text not null,
  -- Registered legal / business name printed on documents.
  legal_name               text,
  -- Taxpayer Identification Number. Stored as typed by the tenant; format is a
  -- presentation concern. Unique across the platform when present.
  tin                      text,
  bir_registration_status  text,

  address                  jsonb not null default '{}'::jsonb,
  contact_number           text,
  email                    extensions.citext,

  -- Per-tenant behaviour switches (e.g. allow_negative_stock, timezone).
  -- Deliberately the ONLY jsonb settings bag in the platform.
  settings                 jsonb not null default '{}'::jsonb,

  status                   core.org_status not null default 'PENDING',

  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),

  constraint organizations_name_not_blank check (length(btrim(name)) > 0),
  constraint organizations_tin_shape      check (tin is null or length(btrim(tin)) between 9 and 20)
);

comment on table core.organizations is
  'One row per business (tenant). Never delete: suspend or cancel instead.';
comment on column core.organizations.settings is
  'Tenant behaviour switches. Business data never lives here.';

create unique index organizations_tin_key
  on core.organizations (tin)
  where tin is not null;

create index organizations_status_idx on core.organizations (status);

create trigger trg_organizations_updated_at
  before update on core.organizations
  for each row execute function core.set_updated_at();

grant select on core.organizations to app_pos, app_inv, app_acc, app_admin, authenticated;
grant update on core.organizations to app_admin;
