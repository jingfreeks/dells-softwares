-- =============================================================================
-- Phase 1 · Migration 005 · core.branches
-- -----------------------------------------------------------------------------
-- The composite unique key (organization_id, id) exists so that every
-- branch-scoped table in every module can declare
--   foreign key (organization_id, branch_id)
--     references core.branches (organization_id, id)
-- which makes a cross-tenant branch reference structurally impossible.
--
-- Affected modules : all
-- Rollback         : drop table core.branches cascade
-- Risk             : none
-- =============================================================================

create table core.branches (
  id               uuid not null default gen_random_uuid(),
  organization_id  uuid not null references core.organizations (id) on delete restrict,

  name             text not null,
  code             text not null,
  address          jsonb not null default '{}'::jsonb,
  contact_number   text,

  -- Branch code printed on documents (BIR branch code). Nullable until known.
  bir_branch_code  text,

  is_primary       boolean not null default false,
  status           core.branch_status not null default 'ACTIVE',

  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),

  constraint branches_pkey primary key (id),
  constraint branches_org_id_key unique (organization_id, id),
  constraint branches_code_not_blank check (length(btrim(code)) > 0)
);

comment on constraint branches_org_id_key on core.branches is
  'Target of every composite (organization_id, branch_id) foreign key in the platform.';

create unique index branches_org_code_key
  on core.branches (organization_id, upper(code));

-- At most one primary branch per organization.
create unique index branches_one_primary_per_org
  on core.branches (organization_id)
  where is_primary;

create index branches_org_status_idx on core.branches (organization_id, status);

create trigger trg_branches_updated_at
  before update on core.branches
  for each row execute function core.set_updated_at();

create trigger trg_branches_no_tenant_move
  before update on core.branches
  for each row execute function core.reject_tenant_reassignment();

grant select on core.branches to app_pos, app_inv, app_acc, app_admin, authenticated;
grant insert, update on core.branches to app_admin;
