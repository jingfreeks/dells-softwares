-- =============================================================================
-- Close the deletion RPCs to anon and service_role
-- -----------------------------------------------------------------------------
-- Found by sweeping every platform_* ACL on staging after fixing the same
-- problem on platform_audit (20260902120000), rather than checking only the
-- function I had just touched:
--
--   platform_deletion_requests      postgres=X | anon=X | authenticated=X | service_role=X
--   platform_deny_deletion_request  postgres=X | anon=X | authenticated=X | service_role=X
--
-- Every other platform_* function carries postgres and authenticated only.
--
-- This is not new and was not caused by the audit work. 20260815142000 lines
-- 266-270 did exactly what I did in 20260902110000: `revoke all ... from
-- public`, then grant to authenticated. That is insufficient, because
-- Supabase's default privileges grant EXECUTE explicitly to anon and
-- service_role as *named* grantees -- revoking the PUBLIC pseudo-role does
-- not touch them. The convention this repository has been copying is the bug.
--
-- Nothing is exposed. Both functions gate on
-- core.is_platform_admin('ENGINEER'), which is false for anon, so a call
-- returns no rows and a deny attempt raises UNAUTHORIZED_ACTION. This closes
-- a reachable surface on the account-deletion review path, not a leak.
--
-- Why no CI guard accompanies this: 110_platform_admin already asserts the
-- property and passes, because the throwaway stack CI builds does not carry a
-- hosted project's default privileges. The reliable check is reading proacl
-- on the real database after a deploy -- which is what found both of these.
--
-- Affected modules : platform console, account deletion
-- Rollback         : none wanted.
-- Risk             : low -- removes access nothing legitimate uses. The
--                    console signs in as `authenticated` and keeps its grant.
-- =============================================================================

revoke all on function public.platform_deletion_requests() from anon;
revoke all on function public.platform_deletion_requests() from service_role;
revoke all on function public.platform_deletion_requests() from public;
grant execute on function public.platform_deletion_requests() to authenticated;

revoke all on function public.platform_deny_deletion_request(uuid, text) from anon;
revoke all on function public.platform_deny_deletion_request(uuid, text) from service_role;
revoke all on function public.platform_deny_deletion_request(uuid, text) from public;
grant execute on function public.platform_deny_deletion_request(uuid, text) to authenticated;
