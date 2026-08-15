-- =============================================================================
-- Integration · Step 3 · Backfill public.stores/staff into core, and keep it
-- that way going forward
-- -----------------------------------------------------------------------------
-- Per INTEGRATION-PROMPT.md §5 (Archetype B, per DISCOVERY.md): an
-- ID-preserving copy of every existing tenant into the core schema installed
-- in the previous migration. This is deliberately NOT a one-off snapshot --
-- the same event that creates a store or a staff member today already keeps
-- core.users in sync with auth.users (phase2_auth_user_sync.sql); this
-- migration adds the equivalent for core.organizations/core.branches/
-- core.staff, so a store or staff member created tomorrow backfills itself
-- automatically, the same way.
--
-- What this does NOT do (later, separate PRs):
--   * repoint any application code to read from core.* (Step 5)
--   * add module entitlement, roles/permissions in core (Phase 3/5)
--   * touch public.stores/public.staff themselves -- read-only source,
--     only triggers are added to them
--
-- Design notes (see DISCOVERY.md's flags before this migration existed):
--   * public.stores has no branches concept -- one synthetic "Main Branch"
--     is created per store.
--   * public.staff.id IS auth.users.id (no separate user_id column) -- it
--     becomes core.staff.user_id; core.staff.id is freshly generated.
--   * public.staff.name is one field, not first_name/last_name -- split on
--     the first space; core.staff's not-blank constraint requires both
--     halves non-blank, so a single-word name is reused for both.
--   * Every staff member lands branch_scope = 'ALL' -- there is no existing
--     branch restriction in public.* to preserve. Real (not placeholder)
--     debt for the platform's actual phase 3, exactly as
--     INTEGRATION-PROMPT.md §5.1 anticipates for this shape.
--   * public.stores IS hard-deleted in one place: the create-cashier Edge
--     Function. handle_new_user() (0001_init.sql) unconditionally creates a
--     store + admin staff row for EVERY new auth.users row, including a
--     cashier being provisioned -- so create-cashier deletes that throwaway
--     store before attaching the new user to the admin's real store. Without
--     a DELETE trigger here, every cashier ever created would leave an
--     orphaned organization behind in core. Handled below.
--   * public.staff is likewise deleted (an admin removes a cashier).
--   * Neither delete is mirrored as a delete into core. core.audit_logs
--     references core.organizations with ON DELETE RESTRICT and carries an
--     immutability trigger blocking DELETE, so once anything is audited
--     against an organization -- which happens on the very insert that
--     creates it, via trg_organizations_audit -- that row can never be
--     removed. That is core's design working as intended, not an obstacle
--     to route around: deleted tenants become CANCELLED and deleted staff
--     become TERMINATED, matching core's own "never delete, change status"
--     vocabulary. Both statuses fail closed -- core.auth_org_ids() only
--     returns ACTIVE/SUSPENDED orgs, and only ACTIVE staff.
--
-- Affected schemas : core (writes), public (read-only; 4 triggers added)
-- Rollback         : drop the 5 sync triggers + their 2 functions;
--                    truncate core.staff, core.branches, core.organizations
--                    (safe only because nothing reads core.* yet -- Step 5
--                    is what makes this no longer trivially reversible)
-- Risk             : medium -- the first step in the integration that
--                    touches real tenant data. Every write here is
--                    idempotent (on conflict / where not exists), and
--                    nothing in public.* is modified, only read.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- One-time backfill of everything that exists right now.
-- -----------------------------------------------------------------------------

-- 1. Organizations, ID-preserved.
insert into core.organizations (id, name, status, created_at)
select id, name, 'ACTIVE', created_at
from public.stores
on conflict (id) do nothing;

-- 2. One synthetic primary branch per store.
insert into core.branches (organization_id, name, code, is_primary, status)
select s.id, 'Main Branch', 'MAIN', true, 'ACTIVE'
from public.stores s
where not exists (
  select 1 from core.branches b where b.organization_id = s.id and b.is_primary
);

-- 3. Staff.
insert into core.staff (
  organization_id, user_id, first_name, last_name,
  pin_hash, primary_branch_id, branch_scope, status
)
select
  s.store_id,
  s.id,
  split_part(s.name, ' ', 1),
  coalesce(nullif(btrim(substring(s.name from position(' ' in s.name) + 1)), ''), split_part(s.name, ' ', 1)),
  s.pin_hash,
  b.id,
  'ALL',
  case when s.active then 'ACTIVE' else 'SUSPENDED' end::core.staff_status
from public.staff s
join core.branches b on b.organization_id = s.store_id and b.is_primary
where exists (select 1 from core.users u where u.id = s.id)
on conflict (organization_id, user_id) where user_id is not null do nothing;

-- -----------------------------------------------------------------------------
-- Going forward: public.stores -> core.organizations + core.branches
-- -----------------------------------------------------------------------------

create or replace function core.sync_store_to_org()
returns trigger
language plpgsql
security definer
set search_path = core, public, pg_temp
as $$
declare
  -- Captured up front: NEW is unassigned in a DELETE trigger, so the
  -- exception handler below must not touch it.
  v_id uuid := case when tg_op = 'DELETE' then old.id else new.id end;
begin
  if tg_op = 'DELETE' then
    -- Cannot hard-delete (audit_logs FK is RESTRICT and audit rows are
    -- immutable). CANCELLED is core's own vocabulary for a dead tenant and
    -- fails closed: core.auth_org_ids() ignores it entirely.
    update core.organizations set status = 'CANCELLED', updated_at = now()
    where id = old.id;

    update core.staff set status = 'TERMINATED', updated_at = now()
    where organization_id = old.id and status <> 'TERMINATED';

    return old;
  end if;

  insert into core.organizations (id, name, status, created_at)
  values (new.id, new.name, 'ACTIVE', new.created_at)
  on conflict (id) do update
    set name = excluded.name, updated_at = now();

  insert into core.branches (organization_id, name, code, is_primary, status)
  select new.id, 'Main Branch', 'MAIN', true, 'ACTIVE'
  where not exists (
    select 1 from core.branches b where b.organization_id = new.id and b.is_primary
  );

  return new;
exception
  when others then
    -- A signup or store edit must not fail because the core mirror did --
    -- same defensive shape as core.sync_user_from_auth().
    raise warning 'core.sync_store_to_org failed for store %: %', v_id, sqlerrm;
    return case when tg_op = 'DELETE' then old else new end;
end;
$$;

drop trigger if exists trg_sync_store_to_org on public.stores;
create trigger trg_sync_store_to_org
  after insert or update on public.stores
  for each row execute function core.sync_store_to_org();

drop trigger if exists trg_sync_store_to_org_del on public.stores;
create trigger trg_sync_store_to_org_del
  after delete on public.stores
  for each row execute function core.sync_store_to_org();

-- -----------------------------------------------------------------------------
-- Going forward: public.staff -> core.staff
-- -----------------------------------------------------------------------------

create or replace function core.sync_staff_to_core()
returns trigger
language plpgsql
security definer
set search_path = core, public, pg_temp
as $$
declare
  v_branch uuid;
  v_first  text;
  v_last   text;
  -- Captured up front: NEW is unassigned in a DELETE trigger, so the
  -- exception handler below must not touch it.
  v_id uuid := case when tg_op = 'DELETE' then old.id else new.id end;
begin
  if tg_op = 'DELETE' then
    update core.staff set status = 'TERMINATED', updated_at = now()
    where organization_id = old.store_id and user_id = old.id;
    return old;
  end if;

  -- Defensive, not merely tidy: handle_new_user() (0001_init.sql) inserts
  -- into public.stores then public.staff, both nested inside the SAME
  -- auth.users INSERT that also fires core.sync_user_from_auth() --
  -- but that trigger is named to fire AFTER on_auth_user_created
  -- alphabetically, so for a brand-new signup this staff-sync trigger runs
  -- BEFORE core.users has a row for them. core.staff.user_id is a hard FK
  -- into core.users, so ensure the mirror exists here too rather than
  -- assume the other trigger already ran -- harmless and idempotent; the
  -- real mirror trigger reconciles it moments later with the full record.
  insert into core.users (id, email, status)
  select u.id, u.email, 'ACTIVE'
  from auth.users u
  where u.id = new.id
  on conflict (id) do nothing;

  select id into v_branch from core.branches
  where organization_id = new.store_id and is_primary
  limit 1;

  if v_branch is null then
    return new; -- defensive only; sync_store_to_org creates it first
  end if;

  v_first := split_part(new.name, ' ', 1);
  v_last  := coalesce(nullif(btrim(substring(new.name from position(' ' in new.name) + 1)), ''), v_first);

  insert into core.staff (
    organization_id, user_id, first_name, last_name,
    pin_hash, primary_branch_id, branch_scope, status
  )
  values (
    new.store_id, new.id, v_first, v_last,
    new.pin_hash, v_branch, 'ALL',
    case when new.active then 'ACTIVE' else 'SUSPENDED' end::core.staff_status
  )
  on conflict (organization_id, user_id) where user_id is not null do update
    set first_name = excluded.first_name,
        last_name  = excluded.last_name,
        pin_hash   = excluded.pin_hash,
        status     = excluded.status,
        updated_at = now();

  return new;
exception
  when others then
    raise warning 'core.sync_staff_to_core failed for staff %: %', v_id, sqlerrm;
    return case when tg_op = 'DELETE' then old else new end;
end;
$$;

drop trigger if exists trg_sync_staff_to_core_ins on public.staff;
create trigger trg_sync_staff_to_core_ins
  after insert on public.staff
  for each row execute function core.sync_staff_to_core();

drop trigger if exists trg_sync_staff_to_core_upd on public.staff;
create trigger trg_sync_staff_to_core_upd
  after update on public.staff
  for each row execute function core.sync_staff_to_core();

drop trigger if exists trg_sync_staff_to_core_del on public.staff;
create trigger trg_sync_staff_to_core_del
  after delete on public.staff
  for each row execute function core.sync_staff_to_core();
