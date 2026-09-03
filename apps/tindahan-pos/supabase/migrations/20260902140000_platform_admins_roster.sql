-- =============================================================================
-- Expose the platform administrator roster
-- -----------------------------------------------------------------------------
-- The console's dashboard shows "Not available" where the number of platform
-- administrators belongs, and the Security page lists the roster among the
-- things it cannot tell you. Both were accurate: no RPC returned it.
--
-- Scope is `is_platform_admin()` -- any ACTIVE administrator with fresh MFA,
-- not SUPERUSER. Changing the roster needs SUPERUSER (core.grant_platform_admin
-- and core.revoke_platform_admin both require it) and that is unchanged.
-- Reading it is a lesser act: everyone returned is already an administrator of
-- this platform, and knowing who your peers are is what makes "who can do
-- this?" answerable at all.
--
-- Deliberately NOT returned: mfa_verified_at. Whether a colleague can act
-- right now is operationally useful; exactly when they last authenticated is
-- session timing, and nothing in the console needs it. The boolean answers
-- the question without narrating anyone's working hours.
--
-- Affected modules : platform console
-- Rollback         : drop function public.platform_admins();
-- Risk             : low -- a new read-only function, gated the same way as
--                    every other platform_* read.
-- =============================================================================

create or replace function public.platform_admins()
returns table(
  email text,
  scope text,
  status text,
  mfa_fresh boolean
)
language sql
stable
security definer
set search_path to 'public', 'core', 'pg_temp'
as $function$
  select u.email::text,
         a.scope::text,
         a.status::text,
         a.mfa_verified_at > now() - interval '8 hours'
  from core.platform_admins a
  left join core.users u on u.id = a.user_id
  where core.is_platform_admin()
  order by a.scope::text, u.email::text;
$function$;

-- `revoke ... from public` alone is not enough: Supabase's default privileges
-- grant EXECUTE explicitly to anon and service_role as named grantees, which
-- revoking the PUBLIC pseudo-role does not touch. 20260902120000 and
-- 20260902130000 exist because that was missed twice. Every grantee that
-- should not hold this is named here.
revoke all on function public.platform_admins() from anon;
revoke all on function public.platform_admins() from service_role;
revoke all on function public.platform_admins() from public;
grant execute on function public.platform_admins() to authenticated;
