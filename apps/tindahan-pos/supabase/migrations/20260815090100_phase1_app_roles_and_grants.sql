-- =============================================================================
-- Phase 1 · Migration 002 · Application database roles
-- -----------------------------------------------------------------------------
-- One nologin role per application. They are granted to `authenticated` usage
-- paths later; for now they exist so that grants can be written alongside every
-- table from the very first migration instead of being retrofitted.
--
-- Affected modules : all
-- Rollback         : drop role app_pos, app_inv, app_acc, app_admin
-- Risk             : none
-- =============================================================================

do $$
declare r text;
begin
  foreach r in array array['app_pos', 'app_inv', 'app_acc', 'app_admin'] loop
    if not exists (select 1 from pg_roles where rolname = r) then
      execute format('create role %I nologin', r);
    end if;
  end loop;
end $$;

grant usage on schema core to app_pos, app_inv, app_acc, app_admin;

-- Supabase client roles need to reach core for the membership helpers.
grant usage on schema core to authenticated, anon, service_role;

-- Nothing is granted on tables by default. Every table grants explicitly.
alter default privileges in schema core revoke all on tables from public;
