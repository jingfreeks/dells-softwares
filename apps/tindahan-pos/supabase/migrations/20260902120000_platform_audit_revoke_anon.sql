-- =============================================================================
-- Close platform_audit() to anon and service_role again
-- -----------------------------------------------------------------------------
-- 20260902110000 dropped and recreated platform_audit() to widen its returned
-- columns. Dropping a function discards its entire ACL, and that migration
-- restored only `revoke all ... from public` plus the grant to authenticated.
--
-- That was not enough. Supabase's default privileges on the `public` schema
-- grant EXECUTE *explicitly* to anon, authenticated and service_role for newly
-- created functions. Those are named grantees, not the PUBLIC pseudo-role, so
-- revoking PUBLIC leaves them in place. Observed on staging after the deploy:
--
--   platform_audit          postgres=X | anon=X | authenticated=X | service_role=X
--   platform_organizations  postgres=X | authenticated=X
--   platform_me             postgres=X | authenticated=X
--
-- The siblings show what the contract has always been. platform_audit was the
-- outlier, and only because it was recreated.
--
-- No data was exposed. The function body gates on
-- core.is_platform_admin('ENGINEER'), which is false for anon -- current_user_id()
-- is null -- so the call returns zero rows. This is a widened surface on a
-- function that reads IP addresses and user agents, not a leak.
--
-- 110_platform_admin asserts exactly this property and passed in CI, because
-- the throwaway stack CI builds does not carry the same default privileges as
-- a hosted project. Worth knowing: for grants specifically, a green pgTAP run
-- is weaker evidence than reading proacl on the real database.
--
-- Affected modules : platform console
-- Rollback         : none wanted. Restoring anon execute would undo the fix.
-- Risk             : low -- removes access that nothing legitimate uses. The
--                    console signs in as `authenticated`, which keeps its grant.
-- =============================================================================

revoke all on function public.platform_audit(int) from anon;
revoke all on function public.platform_audit(int) from service_role;
revoke all on function public.platform_audit(int) from public;
grant execute on function public.platform_audit(int) to authenticated;
