-- =============================================================================
-- Public contract · Let the browser read its own module entitlement
-- -----------------------------------------------------------------------------
-- Everything built so far in `core` is unreachable from any browser app.
-- PostgREST is configured with PGRST_DB_SCHEMAS=public,graphql_public, so a
-- request against the core schema is refused outright:
--
--     {"code":"PGRST106","message":"Invalid schema: core",
--      "hint":"Only the following schemas are exposed: public, graphql_public"}
--
-- That applies to every core RPC: my_memberships(), my_modules(),
-- module_enabled(), record_platform_admin_mfa(), grant_platform_admin().
-- (Note the platform package's own client factory sets no db.schema either,
-- yet its repositories call client.rpc('my_memberships') unqualified -- so
-- it cannot reach its own functions as shipped. Worth knowing before wiring
-- any of it up.)
--
-- Two ways to fix that. Exposing the core schema to PostgREST would work,
-- but it puts all twelve core tables on the public REST API guarded only by
-- RLS, and it is a dashboard change in production rather than a migration --
-- so local and production could silently disagree.
--
-- This takes the other route: a narrow, deliberate `public` contract. It
-- exposes exactly one answer -- "which modules may I use?" -- and nothing
-- else. That matches how the rest of this codebase already works (every RPC
-- the apps call is public: checkout_sale, has_permission,
-- list_my_permissions) and it matches the architecture's own rule that
-- modules talk through published contracts rather than each other's tables.
--
-- Affected schemas : public (one new function)
-- Rollback         : drop function public.my_store_modules()
-- Risk             : none -- read-only, session-scoped, additive
-- =============================================================================

create or replace function public.my_store_modules()
returns table (module_code text, name text, enabled boolean)
language sql
stable
security definer
set search_path = public, core, pg_temp
as $$
  select m.code, m.name, core.module_enabled(auth_store_id(), m.code)
  from core.modules m
  -- A caller with no staff row resolves to no store and gets nothing back,
  -- rather than a catalogue that implies entitlement they do not have.
  where auth_store_id() is not null
  order by m.sort_order, m.code;
$$;

comment on function public.my_store_modules is
  'The browser''s single entitlement question: which modules may the '
  'signed-in staff member''s store use. Mirrors list_my_permissions() in '
  'shape -- one round trip, answered for the session, never taking an '
  'organization id from the client.';

revoke all on function public.my_store_modules() from public;
grant execute on function public.my_store_modules() to authenticated;
