-- =============================================================================
-- Phase 2 · Migration 013 · Row Level Security baseline
-- -----------------------------------------------------------------------------
-- The architecture schedules the full, permission-aware RLS pass as phase 4.
-- Tables must never exist unprotected in the meantime, so every phase 1 table
-- gets membership-based policies here. Phase 4 REPLACES the write policies with
-- has_permission() equivalents; the read policies below already have their final
-- shape.
--
-- Affected modules : all
-- Rollback         : drop the policies, disable row level security
-- Risk             : medium. Verified by supabase/tests/020_membership_isolation.sql
-- =============================================================================

alter table core.organizations   enable row level security;
alter table core.organizations   force  row level security;
alter table core.branches        enable row level security;
alter table core.branches        force  row level security;
alter table core.users           enable row level security;
alter table core.users           force  row level security;
alter table core.staff           enable row level security;
alter table core.staff           force  row level security;
alter table core.staff_branches  enable row level security;
alter table core.staff_branches  force  row level security;
alter table core.platform_admins enable row level security;
alter table core.platform_admins force  row level security;
alter table core.audit_logs      enable row level security;
alter table core.audit_logs      force  row level security;

-- -----------------------------------------------------------------------------
-- organizations
-- Helper calls are wrapped as (select ...) so Postgres evaluates them once per
-- statement as an InitPlan rather than once per row.
-- -----------------------------------------------------------------------------
create policy organizations_select on core.organizations
  for select to authenticated
  using ( (select core.is_org_member(id)) or (select core.is_platform_admin()) );

create policy organizations_update on core.organizations
  for update to authenticated
  using      ( (select core.is_org_wide_staff(id)) )   -- PHASE 3: core.organization.manage
  with check ( (select core.is_org_wide_staff(id)) );

-- Creation goes through core.provision_organization(); platform admins aside,
-- nobody inserts directly.
create policy organizations_insert on core.organizations
  for insert to authenticated
  with check ( (select core.is_platform_admin('BILLING')) );

create policy organizations_no_delete on core.organizations
  for delete to authenticated using (false);

-- -----------------------------------------------------------------------------
-- branches
-- -----------------------------------------------------------------------------
create policy branches_select on core.branches
  for select to authenticated
  using ( (select core.is_org_member(organization_id)) or (select core.is_platform_admin()) );

create policy branches_insert on core.branches
  for insert to authenticated
  with check ( (select core.is_org_wide_staff(organization_id)) );  -- PHASE 3: core.branch.manage

create policy branches_update on core.branches
  for update to authenticated
  using      ( (select core.is_org_wide_staff(organization_id)) )
  with check ( (select core.is_org_wide_staff(organization_id)) );

create policy branches_no_delete on core.branches
  for delete to authenticated using (false);

-- -----------------------------------------------------------------------------
-- users
-- A caller sees themselves, and colleagues they share an organization with.
-- Never the whole platform's user table.
-- -----------------------------------------------------------------------------
create policy users_select on core.users
  for select to authenticated
  using (
    id = (select core.current_user_id())
    or (select core.shares_organization(id))
    or (select core.is_platform_admin())
  );

create policy users_update_self on core.users
  for update to authenticated
  using      ( id = (select core.current_user_id()) )
  with check ( id = (select core.current_user_id()) );

create policy users_no_delete on core.users
  for delete to authenticated using (false);

-- -----------------------------------------------------------------------------
-- staff
-- -----------------------------------------------------------------------------
create policy staff_select on core.staff
  for select to authenticated
  using ( (select core.is_org_member(organization_id)) or (select core.is_platform_admin()) );

create policy staff_insert on core.staff
  for insert to authenticated
  with check ( (select core.is_org_wide_staff(organization_id)) );  -- PHASE 3: core.staff.create

create policy staff_update on core.staff
  for update to authenticated
  using      ( (select core.is_org_wide_staff(organization_id)) )
  with check ( (select core.is_org_wide_staff(organization_id)) );

-- Staff are deactivated, never deleted: history must survive the person.
create policy staff_no_delete on core.staff
  for delete to authenticated using (false);

-- -----------------------------------------------------------------------------
-- staff_branches
-- -----------------------------------------------------------------------------
create policy staff_branches_select on core.staff_branches
  for select to authenticated
  using ( (select core.is_org_member(organization_id)) );

create policy staff_branches_write on core.staff_branches
  for insert to authenticated
  with check ( (select core.is_org_wide_staff(organization_id)) );

create policy staff_branches_delete on core.staff_branches
  for delete to authenticated
  using ( (select core.is_org_wide_staff(organization_id)) );

-- -----------------------------------------------------------------------------
-- platform_admins — invisible to tenants entirely
-- -----------------------------------------------------------------------------
create policy platform_admins_select on core.platform_admins
  for select to authenticated
  using (
    user_id = (select core.current_user_id())
    or (select core.is_platform_admin('SUPERUSER'))
  );

create policy platform_admins_write on core.platform_admins
  for all to authenticated
  using      ( (select core.is_platform_admin('SUPERUSER')) )
  with check ( (select core.is_platform_admin('SUPERUSER')) );

-- -----------------------------------------------------------------------------
-- audit_logs
-- Phase 2: a staff member sees their own trail; org-wide staff see everything
-- for their organization. Phase 4 replaces the second branch with the
-- core.audit.view permission.
-- -----------------------------------------------------------------------------
create policy audit_logs_select on core.audit_logs
  for select to authenticated
  using (
    (select core.is_org_wide_staff(organization_id))
    or actor_staff_id = (select core.auth_staff_id(organization_id))
    or (select core.is_platform_admin('ENGINEER'))
  );

-- Direct inserts are permitted only for one's own organization; in practice all
-- writes go through core.write_audit(), which sets the actor itself.
create policy audit_logs_insert on core.audit_logs
  for insert to authenticated
  with check ( (select core.is_org_member(organization_id)) );

-- No UPDATE or DELETE policy exists. Absence is the enforcement; the
-- trg_audit_logs_immutable trigger is the belt to that pair of braces.

-- -----------------------------------------------------------------------------
-- Grants that pair with the policies above.
--
-- The Supabase model is: grant the DML verb broadly to `authenticated`, then let
-- RLS decide row by row. A missing grant produces "permission denied for table",
-- which is a blunt error and hides policy bugs during testing — so the verbs a
-- legitimate user needs are granted here, and ONLY the policies above decide who
-- may actually use them.
--
-- DELETE is granted nowhere. Nothing in core is ever hard-deleted.
-- -----------------------------------------------------------------------------
grant update         on core.organizations  to authenticated;
grant insert, update on core.branches       to authenticated;
grant update         on core.users          to authenticated;
grant insert, update on core.staff          to authenticated;
grant insert, delete on core.staff_branches to authenticated;
grant insert, update on core.platform_admins to authenticated;

revoke delete on core.organizations, core.branches, core.users, core.staff
  from authenticated, app_pos, app_inv, app_acc, app_admin;
