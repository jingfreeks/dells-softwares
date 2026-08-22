-- =============================================================================
-- Phase 1 · Migration 007 · core.staff, core.staff_branches, core.platform_admins
-- -----------------------------------------------------------------------------
-- core.staff IS the membership record. A user with no ACTIVE staff row in an
-- organization has no access to it, regardless of how valid their token is.
--
-- Affected modules : all
-- Rollback         : drop tables staff_branches, staff, platform_admins cascade
-- Risk             : none
-- =============================================================================

create table core.staff (
  id                 uuid primary key default gen_random_uuid(),
  organization_id    uuid not null references core.organizations (id) on delete restrict,

  -- Null while the invitation is outstanding (status = INVITED).
  user_id            uuid references core.users (id) on delete restrict,
  invited_email      extensions.citext,

  employee_number    text,
  first_name         text not null,
  last_name          text not null,

  -- Argon2/bcrypt digest. Never compared client-side. Null until a PIN is set.
  pin_hash           text,
  pin_set_at         timestamptz,
  failed_pin_attempts smallint not null default 0,
  locked_until       timestamptz,

  primary_branch_id  uuid,
  -- ALL      = may act in every branch of the organization (owners, admins)
  -- ASSIGNED = restricted to core.staff_branches rows
  branch_scope       core.branch_scope not null default 'ASSIGNED',

  status             core.staff_status not null default 'INVITED',

  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),

  constraint staff_primary_branch_fk
    foreign key (organization_id, primary_branch_id)
    references core.branches (organization_id, id),

  -- An accepted membership must have an identity; an outstanding one must have
  -- an address to invite.
  constraint staff_identity_present check (
    (status = 'INVITED' and invited_email is not null)
    or (status <> 'INVITED' and user_id is not null)
  ),
  constraint staff_names_not_blank check (
    length(btrim(first_name)) > 0 and length(btrim(last_name)) > 0
  )
);

comment on table core.staff is
  'Membership of a user in an organization. One row per (organization, user). '
  'A user serving three clients has three rows.';
comment on column core.staff.branch_scope is
  'Phase 2 floor for branch access. Phase 3 role scoping refines but never widens it.';

create unique index staff_org_user_key
  on core.staff (organization_id, user_id)
  where user_id is not null;

create unique index staff_org_employee_number_key
  on core.staff (organization_id, upper(employee_number))
  where employee_number is not null;

create unique index staff_org_invited_email_key
  on core.staff (organization_id, invited_email)
  where status = 'INVITED';

create index staff_user_active_idx
  on core.staff (user_id)
  where status = 'ACTIVE';

create index staff_org_status_idx on core.staff (organization_id, status);

create trigger trg_staff_updated_at
  before update on core.staff
  for each row execute function core.set_updated_at();

create trigger trg_staff_no_tenant_move
  before update on core.staff
  for each row execute function core.reject_tenant_reassignment();

grant select on core.staff to app_pos, app_inv, app_acc, app_admin, authenticated;
grant insert, update on core.staff to app_admin;

-- -----------------------------------------------------------------------------
-- Explicit branch assignments (used when branch_scope = 'ASSIGNED')
-- -----------------------------------------------------------------------------
create table core.staff_branches (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references core.organizations (id) on delete restrict,
  staff_id         uuid not null references core.staff (id) on delete cascade,
  branch_id        uuid not null,
  created_at       timestamptz not null default now(),

  constraint staff_branches_branch_fk
    foreign key (organization_id, branch_id)
    references core.branches (organization_id, id) on delete cascade,
  constraint staff_branches_unique unique (staff_id, branch_id)
);

create index staff_branches_org_branch_idx
  on core.staff_branches (organization_id, branch_id);

grant select on core.staff_branches to app_pos, app_inv, app_acc, app_admin, authenticated;
grant insert, delete on core.staff_branches to app_admin;

-- -----------------------------------------------------------------------------
-- Platform staff. Created in phase 1 so the authorization helpers can be honest
-- from the start; the Super Admin application itself arrives in phase 10.
-- -----------------------------------------------------------------------------
create table core.platform_admins (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null unique references core.users (id) on delete restrict,
  scope            core.platform_admin_scope not null default 'SUPPORT',
  status           core.user_status not null default 'ACTIVE',
  mfa_verified_at  timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

comment on table core.platform_admins is
  'Platform power is never expressible as a tenant role. Separate table, '
  'separate application, MFA required within the last 8 hours.';

create trigger trg_platform_admins_updated_at
  before update on core.platform_admins
  for each row execute function core.set_updated_at();

-- Deliberately NOT granted to tenant app roles.
grant select on core.platform_admins to app_admin;
