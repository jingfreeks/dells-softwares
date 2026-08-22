-- =============================================================================
-- Phase 2 · Migration 014 · Indexes supporting the policy predicates
-- -----------------------------------------------------------------------------
-- Every column an RLS policy filters on must be indexed, or the policy becomes
-- a sequential scan on every query (design rule §19).
--
-- Affected modules : all
-- Rollback         : drop the indexes
-- Risk             : none
-- =============================================================================

-- core.auth_org_ids() / auth_staff_id(): lookup by (user_id, status)
create index if not exists staff_user_status_org_idx
  on core.staff (user_id, status, organization_id);

-- core.auth_branch_ids(): staff -> assigned branches
create index if not exists staff_branches_staff_branch_idx
  on core.staff_branches (staff_id, branch_id);

-- core.shares_organization(): reverse lookup
create index if not exists staff_org_user_status_idx
  on core.staff (organization_id, user_id, status);

-- core.is_platform_admin(): tiny table, but the predicate is hot
create index if not exists platform_admins_user_status_idx
  on core.platform_admins (user_id, status);

analyze core.staff;
analyze core.branches;
analyze core.staff_branches;
