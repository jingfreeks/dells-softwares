-- =============================================================================
-- The security surface, as a set of questions with expected answers
-- -----------------------------------------------------------------------------
-- Everything here is checkable against ANY environment -- local, staging, or
-- production -- and every query is written to return ZERO ROWS when the answer
-- is the safe one. Anything printed is something to look at.
--
--   psql "$DATABASE_URL" -f supabase/snippets/security-surface.sql
--
-- Run it before a push and again after. The CI guards (check-rls-coverage.mjs,
-- check-no-client-secrets.mjs) read the migration files; this reads the
-- database those files produced, which is not the same claim -- a hosted
-- project carries grants applied outside this repository, which is exactly how
-- 20260815101000's missing-GRANT problem stayed invisible for so long.
-- =============================================================================

\echo '== 1. SECURITY DEFINER without a pinned search_path (must be empty) ======'
-- A definer function that resolves names through the caller's search_path can
-- be made to run the caller's code with the owner's rights.
select n.nspname, p.proname
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where p.prosecdef and n.nspname in ('public', 'core')
  and not exists (
    select 1 from unnest(coalesce(p.proconfig, '{}')) c where c like 'search_path=%'
  )
order by 1, 2;

\echo '== 2. what anon can reach (expect: feature_flags, SELECT only) =========='
-- anon is the key that ships inside the browser bundle. Everything it can
-- reach is public to the internet.
select c.relname, string_agg(distinct v.p, ', ' order by v.p) as privileges
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
cross join lateral (values ('SELECT'), ('INSERT'), ('UPDATE'), ('DELETE')) v(p)
where n.nspname = 'public' and c.relkind in ('r', 'p')
  and has_table_privilege('anon', c.oid, v.p)
group by c.relname
order by 1;

\echo '== 3. unconditional write policies (must be empty) ======================'
select c.relname, pol.polname
from pg_policy pol
join pg_class c on c.oid = pol.polrelid
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and pol.polcmd in ('a', 'w', 'd')
  and coalesce(pg_get_expr(pol.polwithcheck, pol.polrelid),
               pg_get_expr(pol.polqual, pol.polrelid)) in ('true', '(true)')
order by 1, 2;

\echo '== 4. console RPCs reachable by PUBLIC (must be empty) =================='
-- platform_* functions read and write across every tenant. They are granted to
-- `authenticated` and gated inside on core.is_platform_admin(); a PUBLIC grant
-- would widen that to anon as well.
select p.proname, array_to_string(p.proacl, ', ') as acl
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.proname like 'platform\_%'
  and (p.proacl is null
       or exists (select 1 from unnest(p.proacl) a where a::text like '=%'))
order by 1;

\echo '== 5. console RPCs missing the admin gate ==============================='
-- Expect EXACTLY two, and only these two:
--   platform_me          -- reads the caller's own row (current_user_id())
--   platform_verify_mfa  -- stamps the caller's own MFA; gating it on
--                           is_platform_admin() would deadlock the very
--                           check it exists to satisfy
-- Anything else here reads across tenants without asking who is calling.
select p.proname
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.proname like 'platform\_%'
  and pg_get_functiondef(p.oid) not like '%is_platform_admin%'
  and p.proname not in ('platform_me', 'platform_verify_mfa')
order by 1;

\echo '== 6. tenant RPCs that take an organization argument (must be empty) ===='
-- my_store_* answers for the CALLER's store and must take no argument at all.
-- One that accepted an org id would be a cross-tenant read waiting to be
-- found -- the caller chooses the argument.
select p.proname, pg_get_function_arguments(p.oid) as args
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.proname like 'my\_store\_%'
  and pg_get_function_arguments(p.oid) <> ''
order by 1;

\echo '== 7. public tables without RLS (must be empty) ========================='
select c.relname
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind in ('r', 'p') and not c.relrowsecurity
order by 1;

\echo '== 8. audit partitions -- RLS on, and unreachable directly (both 0) ====='
-- A partition queried BY NAME is subject to its own RLS, not its parent's.
-- This is the shape of the cross-tenant read fixed in 20260815105000; a new
-- partition created by an older ensure_audit_partition() would reintroduce it.
select
  (select count(*) from pg_class c
     join pg_inherits i on i.inhrelid = c.oid
    where i.inhparent = 'core.audit_logs'::regclass
      and not c.relrowsecurity)                                  as partitions_without_rls,
  (select count(*) from pg_class c
     join pg_inherits i on i.inhrelid = c.oid
    where i.inhparent = 'core.audit_logs'::regclass
      and has_table_privilege('authenticated', c.oid, 'SELECT')) as partitions_readable;

\echo '== 9. FYI -- core.* functions executable by PUBLIC ======================'
-- NOT a finding today, and deliberately not "fixed" in the same push as the
-- tier split. `core` is not exposed to PostgREST, so none of these is
-- reachable from a browser, and the dangerous ones (grant_platform_admin,
-- revoke_platform_admin) gate themselves on is_platform_admin('SUPERUSER')
-- regardless of who may execute them.
--
-- It is listed because it is defence resting on a configuration rather than a
-- privilege, and that is exactly the shape of the audit-partition bug: not
-- reachable from a browser, but it would have opened silently the moment it
-- was. Worth revoking as its own change, on a quiet day -- NOT alongside a
-- migration batch touching 661 live stores, and not without checking that no
-- trigger owned by supabase_auth_admin depends on the PUBLIC grant.
select p.proname
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'core'
  and (p.proacl is null
       or exists (select 1 from unnest(p.proacl) a where a::text like '=%'))
order by 1;
