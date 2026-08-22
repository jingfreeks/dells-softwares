-- =============================================================================
-- The security surface, as a set of questions with expected answers
-- -----------------------------------------------------------------------------
-- Runnable against ANY environment -- local, staging, or production:
--
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/snippets/security-surface.sql
--
-- Every check is defined ONCE, in the view below, and used twice: printed for
-- a person to read, then asserted so a script can fail on it. With
-- ON_ERROR_STOP=1 this exits non-zero if anything is wrong, which is what
-- lets preflight.sh gate on it -- "read the output carefully" is not a control
-- that survives a rollout at two in the morning.
--
-- NOTHING PRINTED UNDER "violations" MEANS CLEAN.
--
-- This is not the same claim the CI guards make. check-rls-coverage.mjs and
-- check-no-client-secrets.mjs read the migration FILES; this reads the
-- DATABASE those files produced. A hosted project also carries grants applied
-- outside this repository, which is exactly how the missing-GRANT problem
-- behind 20260815101000 stayed invisible -- the migrations looked complete and
-- the database was not.
-- =============================================================================

create temp view security_violations as

-- 1 · A definer function that resolves names through the CALLER's search_path
--     can be made to run the caller's code with the owner's rights.
select '1 · SECURITY DEFINER without a pinned search_path' as check_name,
       n.nspname || '.' || p.proname                            as detail
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where p.prosecdef and n.nspname in ('public', 'core')
  and not exists (
    select 1 from unnest(coalesce(p.proconfig, '{}')) c where c like 'search_path=%'
  )

union all

-- 2 · anon is the key that ships inside the browser bundle. Everything it can
--     reach is public to the internet. feature_flags is read by the login
--     screen before anyone has signed in; SELECT on it is the whole intended
--     surface, and anything else here is a leak.
select '2 · anon can reach something beyond feature_flags',
       c.relname || ' (' || v.p || ')'
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
cross join lateral (values ('SELECT'), ('INSERT'), ('UPDATE'), ('DELETE')) v(p)
where n.nspname = 'public' and c.relkind in ('r', 'p')
  and has_table_privilege('anon', c.oid, v.p)
  and not (c.relname = 'feature_flags' and v.p = 'SELECT')

union all

-- 3 · A write policy that is simply `true` is not a policy.
select '3 · unconditional write policy', c.relname || ' · ' || pol.polname
from pg_policy pol
join pg_class c on c.oid = pol.polrelid
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and pol.polcmd in ('a', 'w', 'd')
  and coalesce(pg_get_expr(pol.polwithcheck, pol.polrelid),
               pg_get_expr(pol.polqual, pol.polrelid)) in ('true', '(true)')

union all

-- 4 · platform_* functions read and write across every tenant. They are
--     meant to be granted to `authenticated` ONLY, gated inside on
--     core.is_platform_admin() -- no Edge Function in this codebase calls a
--     platform_* RPC (checked: `grep -rl platform_ supabase/functions/` finds
--     nothing), so service_role has no legitimate reason to hold EXECUTE
--     either, and neither does anon or a bare PUBLIC grant.
--
--     THIS CHECK USED TO ONLY LOOK FOR THE PUBLIC PSEUDO-GRANT (`a::text like
--     '=%'`), string-matching the raw ACL array. That is real but narrow: it
--     would never catch a NAMED role like anon or service_role holding
--     EXECUTE, which is exactly what a hosted Supabase project's own
--     schema-level default privileges hand out to every new function in
--     `public` -- discovered on 2026-08-21 pushing 20260815115000, where
--     `platform_plans()` (and, once checked, all fifteen platform_* functions,
--     including several no migration in this push touched) carried EXECUTE for
--     anon and service_role in addition to authenticated. Nothing was
--     reachable -- core.is_platform_admin() held, pgTAP-verified -- but the
--     defense-in-depth this check exists to guarantee was not actually there,
--     and this exact check said "clean" the whole time because it was only
--     asking about PUBLIC.
--
--     aclexplode() is used instead of string-matching for the same reason
--     that mistake happened: raw ACL text is easy to parse wrong, and getting
--     it wrong here means silently trusting a grant nobody checked.
select '4 · console RPC executable by more than authenticated',
       p.proname || ' -> ' || coalesce(r.rolname, 'PUBLIC')
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
cross join lateral aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a
left join pg_roles r on r.oid = a.grantee
where n.nspname = 'public' and p.proname like 'platform\_%'
  and a.privilege_type = 'EXECUTE'
  and coalesce(r.rolname, 'PUBLIC') not in ('authenticated', 'postgres')

union all

-- 5 · Two console RPCs legitimately lack the gate and are excluded BY NAME
--     rather than by pattern, because the reason matters:
--       platform_me          reads only the caller's own row
--       platform_verify_mfa  stamps only the caller's own MFA; gating it on
--                            is_platform_admin() would deadlock the very check
--                            it exists to satisfy
--     Anything else here reads across tenants without asking who is calling.
select '5 · console RPC missing the admin gate', p.proname
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.proname like 'platform\_%'
  and pg_get_functiondef(p.oid) not like '%is_platform_admin%'
  and p.proname not in ('platform_me', 'platform_verify_mfa')

union all

-- 6 · my_store_* answers for the CALLER's store and must take no argument at
--     all. One that accepted an org id would be a cross-tenant read waiting to
--     be found, because the caller chooses the argument.
select '6 · tenant RPC takes an organization argument',
       p.proname || '(' || pg_get_function_arguments(p.oid) || ')'
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.proname like 'my\_store\_%'
  and pg_get_function_arguments(p.oid) <> ''

union all

select '7 · public table without RLS', c.relname
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind in ('r', 'p') and not c.relrowsecurity

union all

-- 8 · A partition queried BY NAME is subject to its own RLS, not its parent's.
--     This is the shape of the cross-tenant read fixed in 20260815105000; a
--     partition created by an older ensure_audit_partition() reintroduces it.
select '8 · audit partition unprotected', c.relname
from pg_class c
join pg_inherits i on i.inhrelid = c.oid
where i.inhparent = 'core.audit_logs'::regclass
  and (not c.relrowsecurity or has_table_privilege('authenticated', c.oid, 'SELECT'))

union all

-- 9 · Tenant-facing RPCs (checkout_sale, void_sale, my_store_features, ...)
--     are meant for `authenticated` only, same reasoning as check 4 but for
--     functions with no shared name prefix to pattern-match on. Found on
--     2026-08-21 auditing plan_prices(): the hosted project's default ACL
--     grants EXECUTE on every new public-schema function to anon and
--     service_role at creation time, and 20260815122000 found ~24 tenant
--     RPCs carrying it, none caught until then because check 4 only ever
--     looked at platform\_%.
--
--     Hand-typed list, same trade-off check 4 already accepted for the same
--     reason: a pattern match works for platform_* because every one of
--     those functions shares a prefix by convention; these do not, so
--     either this is a named list or every function in `public` is a
--     violation by default, which would also flag the two functions that
--     legitimately need anon (list below) and everything still mid-review.
--     Revisit this list in the same breath as 20260815122000's own list --
--     they must stay in sync, and both exist so the NEXT new tenant RPC is
--     caught here even if its own migration forgets to revoke.
--
--     _validate_pairing_code and _consume_pairing_code legitimately need
--     service_role (called from pair-device's admin client, before any user
--     has a session) -- excluded from the service_role half of this check,
--     not from the anon half.
select '9 · tenant RPC executable by more than authenticated',
       p.proname || ' -> ' || coalesce(r.rolname, 'PUBLIC')
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
cross join lateral aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a
left join pg_roles r on r.oid = a.grantee
where n.nspname = 'public'
  and p.proname in (
    'admin_set_staff_pin', 'admin_unpair_device', 'assign_staff_role',
    'auth_role', 'auth_store_id',
    'checkout_sale', 'current_store_has_feature', 'current_store_has_module',
    'current_store_writes_allowed', 'end_cashier_session',
    'generate_pairing_code', 'has_permission', 'list_my_permissions',
    'list_pickable_cashiers', 'my_store_billing_state', 'my_store_features',
    'my_store_limits', 'my_store_modules', 'my_store_plan',
    'plan_prices', 'record_credit_payment', 'request_plan_upgrade',
    'set_own_pin', 'start_cashier_session', 'transfer_stock', 'void_sale',
    '_consume_pairing_code', '_validate_pairing_code'
  )
  and a.privilege_type = 'EXECUTE'
  and coalesce(r.rolname, 'PUBLIC') not in ('authenticated', 'postgres')
  and not (p.proname in ('_consume_pairing_code', '_validate_pairing_code')
           and r.rolname = 'service_role');

\echo ''
\echo '== violations (nothing below this line means clean) ====================='
select check_name, detail from security_violations order by check_name, detail;

\echo ''
\echo '== FYI, not a gate: core.* functions executable by PUBLIC ==============='
-- Deliberately NOT a violation. `core` is not exposed to PostgREST, so none of
-- these is reachable from a browser, and the dangerous ones
-- (grant_platform_admin, revoke_platform_admin) gate themselves on
-- is_platform_admin('SUPERUSER') regardless of who may execute them.
--
-- Listed because it is defence resting on a configuration rather than a
-- privilege, which is exactly the shape of the audit-partition bug: not
-- reachable from a browser, but it would have opened silently the moment it
-- was. Worth revoking as its own change on a quiet day -- not alongside a
-- migration batch touching 661 live stores, and not before checking that no
-- trigger owned by supabase_auth_admin depends on the PUBLIC grant.
select p.proname
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'core'
  and (p.proacl is null
       or exists (select 1 from unnest(p.proacl) a where a::text like '=%'))
order by 1;

-- The assertion. Same view, so this can never disagree with what was printed.
do $$
declare v_count int; v_first text;
begin
  select count(*), min(check_name) into v_count, v_first from pg_temp.security_violations;
  if v_count > 0 then
    raise exception 'security surface: % violation(s), first: %', v_count, v_first;
  end if;
  raise notice 'security surface: clean';
end;
$$;
