-- =============================================================================
-- Phase 1 · Migration 001 · Extensions and enumerated types
-- -----------------------------------------------------------------------------
-- Affected schemas : core (created here), public (extensions)
-- Affected modules : all
-- Rollback         : drop schema core cascade; drop the types listed below
-- Risk             : none (additive, first migration)
-- =============================================================================

create extension if not exists pgcrypto  with schema extensions;
create extension if not exists citext    with schema extensions;

create schema if not exists core;
comment on schema core is
  'Platform core: tenancy, identity, membership, devices, audit. Owned by no business module.';

-- -----------------------------------------------------------------------------
-- Enumerated types. Statuses are enums, never free text (design rule §03).
-- -----------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace
                 where t.typname = 'org_status' and n.nspname = 'core') then
    create type core.org_status as enum ('PENDING', 'ACTIVE', 'SUSPENDED', 'CANCELLED');
  end if;

  if not exists (select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace
                 where t.typname = 'branch_status' and n.nspname = 'core') then
    create type core.branch_status as enum ('ACTIVE', 'INACTIVE', 'CLOSED');
  end if;

  if not exists (select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace
                 where t.typname = 'user_status' and n.nspname = 'core') then
    create type core.user_status as enum ('ACTIVE', 'DISABLED');
  end if;

  if not exists (select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace
                 where t.typname = 'staff_status' and n.nspname = 'core') then
    -- INVITED  : row exists, no auth user has accepted yet
    -- ACTIVE   : may access the organization
    -- SUSPENDED: temporarily blocked, retains history
    -- TERMINATED: permanently blocked, retains history. We never delete staff.
    create type core.staff_status as enum ('INVITED', 'ACTIVE', 'SUSPENDED', 'TERMINATED');
  end if;

  if not exists (select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace
                 where t.typname = 'branch_scope' and n.nspname = 'core') then
    -- Phase 2 stand-in for role-derived branch scope.
    -- Phase 3 layers staff_roles on top; this column remains the floor.
    create type core.branch_scope as enum ('ALL', 'ASSIGNED');
  end if;

  if not exists (select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace
                 where t.typname = 'actor_kind' and n.nspname = 'core') then
    create type core.actor_kind as enum ('STAFF', 'PLATFORM_ADMIN', 'SYSTEM', 'DEVICE', 'ANONYMOUS');
  end if;

  if not exists (select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace
                 where t.typname = 'platform_admin_scope' and n.nspname = 'core') then
    create type core.platform_admin_scope as enum ('SUPPORT', 'BILLING', 'ENGINEER', 'SUPERUSER');
  end if;
end $$;
