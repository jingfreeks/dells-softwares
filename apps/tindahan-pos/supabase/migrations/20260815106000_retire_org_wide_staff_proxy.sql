-- =============================================================================
-- One permission system · retire core.is_org_wide_staff()
-- -----------------------------------------------------------------------------
-- Phase 2 left this instruction on the function itself:
--
--   "PHASE 2 INTERIM. A coarse admin proxy used by write policies until the
--    RBAC tables land in phase 3. Search for this name when implementing
--    phase 3 -- every call site must become a has_permission() check."
--
-- has_permission() already existed, in `public`, enforcing 78 checkpoints.
-- PERMISSIONS-DECISION.md measured both systems and recommended keeping the
-- built one rather than building a second in `core`: 78 live authorization
-- checks on a system handling money against 11 interim ones a browser cannot
-- even reach. This carries that out.
--
-- The proxy answered "is this person org-wide staff", meaning branch_scope =
-- 'ALL'. Its replacement asks the two questions that were always meant:
--
--     core.is_org_member(org)  and  public.has_permission('core.x.y')
--
-- Membership AND permission, not one standing in for the other. The codes are
-- the ones each call site already names in its own comment.
--
-- ORDER MATTERS HERE, and getting it wrong locks people out.
--
-- has_permission() grants everything to a staff row with role = 'admin'.
-- Architecture v1 §07 rules that out -- "nothing in the codebase branches on
-- a role name" -- and this migration removes it. But that shortcut is not
-- decoration: handle_new_user() (0001_init.sql) creates an admin staff row
-- for every signup and NOTHING assigns it an OWNER role. 0044's backfill was
-- one-time. Verified on a clean database: a brand-new admin has zero
-- staff_roles rows and passes only via the shortcut.
--
-- So removing it first would instantly strip every permission from every
-- admin who signed up after 0044 -- on a live POS. The steps below are
-- therefore ordered: guarantee OWNER, then remove the shortcut, and never
-- the reverse.
--
-- Affected schemas : public (permissions seed, 1 function, 1 trigger),
--                    core (11 policies re-created, 1 function dropped)
-- Rollback         : restore has_permission's admin branch and re-create
--                    is_org_wide_staff + the 11 policies from 20260815091400
-- Risk             : medium. It changes how authorization is decided for
--                    every admin. Bounded by doing the granting first and by
--                    210_permission_unification asserting an admin keeps
--                    every permission across the change.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. The core.* codes the interim call sites already name in their comments.
-- -----------------------------------------------------------------------------

insert into permissions (code, module_code, description) values
  ('core.organization.manage', 'CORE', 'Edit the organization''s own record'),
  ('core.branch.manage',       'CORE', 'Create and edit branches'),
  ('core.staff.view',          'CORE', 'See the staff directory'),
  ('core.staff.create',        'CORE', 'Add a staff member'),
  ('core.staff.assign_role',   'CORE', 'Change what a staff member may do'),
  ('core.audit.view',          'CORE', 'Read the organization''s audit log')
on conflict (code) do nothing;

-- OWNER holds everything, which is what makes removing the admin shortcut a
-- no-op for a correctly-provisioned owner rather than a lockout.
insert into role_permissions (role_id, permission_code)
select r.id, p.code
from roles r
cross join permissions p
where r.code = 'OWNER' and r.store_id is null
  and p.code like 'core.%'
on conflict do nothing;

-- SUPERVISOR gets the two read-only ones. Staff management and role
-- assignment stay owner-only, matching the existing rule that PIN resets and
-- account changes are a harder wall than the rest of the back office.
insert into role_permissions (role_id, permission_code)
select r.id, p.code
from roles r
cross join permissions p
where r.code = 'SUPERVISOR' and r.store_id is null
  and p.code in ('core.staff.view', 'core.audit.view')
on conflict do nothing;

-- -----------------------------------------------------------------------------
-- 2. Guarantee every admin actually holds OWNER -- backfill, then keep it true.
-- -----------------------------------------------------------------------------

insert into staff_roles (staff_id, role_id)
select s.id, r.id
from staff s
join roles r on r.code = 'OWNER' and r.store_id is null
where s.role = 'admin'
on conflict (staff_id, role_id) do nothing;

create or replace function public.sync_owner_role_with_staff_role()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_role uuid;
begin
  select id into v_role from roles where code = 'OWNER' and store_id is null;
  if v_role is null then
    return new;
  end if;

  if new.role = 'admin' then
    insert into staff_roles (staff_id, role_id)
    values (new.id, v_role)
    on conflict (staff_id, role_id) do nothing;
  else
    -- Demotion has to take OWNER away, or it takes nothing away at all.
    -- Nothing in the applications changes staff.role today, but the
    -- "admin can update staff in own store" policy from 0001_init makes it
    -- reachable through the API -- and once the role shortcut is gone,
    -- staff_roles is the ONLY thing deciding what someone may do. A demoted
    -- admin keeping OWNER would be a demotion in name only.
    delete from staff_roles where staff_id = new.id and role_id = v_role;
  end if;

  return new;
exception
  when others then
    -- A signup must not fail because role provisioning did. Same stance as
    -- core.grant_default_subscription(). A warning here is recoverable; a
    -- failed store registration is not.
    raise warning 'sync_owner_role_with_staff_role failed for staff %: %', new.id, sqlerrm;
    return new;
end;
$$;

comment on function public.sync_owner_role_with_staff_role is
  'Keeps staff.role = admin and the OWNER grant in step, in both directions. '
  'Without it has_permission() would answer FALSE for an admin created after '
  'the role shortcut was removed -- handle_new_user creates the staff row but '
  'has never assigned a role -- and TRUE for a demoted one.';

create trigger trg_staff_sync_owner_role
  after insert or update of role on staff
  for each row execute function public.sync_owner_role_with_staff_role();

-- -----------------------------------------------------------------------------
-- 3. NOW the shortcut can go.
--
-- Behaviour is unchanged for anyone holding OWNER, which after step 2 is every
-- admin. What changes is that authorization is decided by permissions alone,
-- so a role name is no longer load-bearing anywhere -- §07's actual rule.
-- -----------------------------------------------------------------------------

create or replace function has_permission(p_code text, p_staff_id uuid default auth.uid())
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from staff_roles sr
    join role_permissions rp on rp.role_id = sr.role_id
    where sr.staff_id = p_staff_id and rp.permission_code = p_code
  );
$$;

comment on function has_permission is
  'The one authorization question. No longer branches on staff.role: an admin '
  'is a staff member holding the OWNER role, which holds every permission. '
  'See Architecture v1 §07 -- nothing branches on a role name.';

-- -----------------------------------------------------------------------------
-- 4. The 11 interim call sites, using the codes their comments already named.
--
-- Each gains an explicit membership check. is_org_wide_staff() bundled
-- membership and authority together; splitting them means a permission can be
-- granted without silently implying access to every organization.
-- -----------------------------------------------------------------------------

-- Each keeps `to authenticated` and every branch of its original predicate.
-- Only the proxy call is replaced -- these are otherwise the definitions from
-- 20260815091400, verified line by line against it.

drop policy organizations_update on core.organizations;
create policy organizations_update on core.organizations
  for update to authenticated
  using      ( (select core.is_org_member(id)) and (select has_permission('core.organization.manage')) )
  with check ( (select core.is_org_member(id)) and (select has_permission('core.organization.manage')) );

drop policy branches_insert on core.branches;
create policy branches_insert on core.branches
  for insert to authenticated
  with check ( (select core.is_org_member(organization_id)) and (select has_permission('core.branch.manage')) );

drop policy branches_update on core.branches;
create policy branches_update on core.branches
  for update to authenticated
  using      ( (select core.is_org_member(organization_id)) and (select has_permission('core.branch.manage')) )
  with check ( (select core.is_org_member(organization_id)) and (select has_permission('core.branch.manage')) );

drop policy staff_insert on core.staff;
create policy staff_insert on core.staff
  for insert to authenticated
  with check ( (select core.is_org_member(organization_id)) and (select has_permission('core.staff.create')) );

drop policy staff_update on core.staff;
create policy staff_update on core.staff
  for update to authenticated
  using      ( (select core.is_org_member(organization_id)) and (select has_permission('core.staff.assign_role')) )
  with check ( (select core.is_org_member(organization_id)) and (select has_permission('core.staff.assign_role')) );

drop policy staff_branches_write on core.staff_branches;
create policy staff_branches_write on core.staff_branches
  for insert to authenticated
  with check ( (select core.is_org_member(organization_id)) and (select has_permission('core.staff.assign_role')) );

drop policy staff_branches_delete on core.staff_branches;
create policy staff_branches_delete on core.staff_branches
  for delete to authenticated
  using ( (select core.is_org_member(organization_id)) and (select has_permission('core.staff.assign_role')) );

-- The audit log keeps all THREE of its original branches. Only the first --
-- the proxy -- is replaced. Dropping the platform-admin branch would have cut
-- ENGINEER support access off from the logs they exist to read, and dropping
-- the actor branch would stop a cashier seeing their own trail.
drop policy audit_logs_select on core.audit_logs;
create policy audit_logs_select on core.audit_logs
  for select to authenticated
  using (
    ((select core.is_org_member(organization_id)) and (select has_permission('core.audit.view')))
    or actor_staff_id = (select core.auth_staff_id(organization_id))
    or (select core.is_platform_admin('ENGINEER'))
  );

-- -----------------------------------------------------------------------------
-- 5. And the proxy itself, so there is no second answer to drift from.
-- -----------------------------------------------------------------------------

drop function if exists core.is_org_wide_staff(uuid);

-- -----------------------------------------------------------------------------
-- 6. One stale comment, corrected.
--
-- assign_staff_role() carries this inline:
--
--   "Owner status comes from staff.role = 'admin', not from staff_roles"
--
-- True when it was written, false now: owner status comes from holding the
-- OWNER role, which trg_staff_sync_owner_role keeps in step with staff.role.
-- Its BEHAVIOUR is unchanged and still correct -- it refuses to reassign an
-- admin -- so the body is left alone rather than churned for a comment. But
-- an out-of-date comment about where authority comes from is exactly the kind
-- of thing that hid the audit-partition leak, so the function-level comment
-- now says what is actually true.
-- -----------------------------------------------------------------------------

comment on function assign_staff_role is
  'Moves a cashier-tier staff member between SUPERVISOR and CASHIER. Refuses '
  'to touch an admin: owner status is the OWNER role, kept in step with '
  'staff.role by trg_staff_sync_owner_role, and is not reassignable here. '
  'The inline comment in 0044 predates that and is no longer accurate.';
