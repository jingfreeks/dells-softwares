-- Close the EXECUTE overgrant on adjust_product_stock().
--
-- Live ACL on staging before this migration:
--
--   =X/postgres | postgres=X/postgres | anon=X/postgres
--   | authenticated=X/postgres | service_role=X/postgres
--
-- The leading "=X/" is the PUBLIC grant. So a SECURITY DEFINER function that
-- writes stock and an audit row was callable by anon and service_role as well
-- as by every authenticated user.
--
-- How it got that way, recorded because the mechanism keeps recurring:
--
--   20260830151000 created the two-argument form and issued
--   "revoke all on function ... from public". That strips only the PUBLIC
--   pseudo-role. Supabase's project-level default ACL grants EXECUTE to anon
--   and service_role as *named* grantees, and a revoke from public does not
--   touch a named grantee -- the same finding as 20260815121000.
--
--   20260902100000 (adding the audit trail) then had to drop and recreate the
--   function to add p_reason. A drop discards the whole ACL, so the recreated
--   function was re-granted from the project default -- which restored the
--   PUBLIC grant that 20260830151000 had at least removed. The fix for one
--   problem reopened another.
--
-- The lesson both times: after any drop-and-recreate, name all three grantees
-- explicitly. There is no inheriting the previous ACL.
--
-- This is not catchable by pgTAP. CI runs against a throwaway local stack that
-- has no hosted default privileges, so the overgrant simply does not exist
-- there to be asserted against. It has to be read from pg_proc.proacl on the
-- real database after deploying -- see the verification query at the foot of
-- this file.

revoke all on function public.adjust_product_stock(uuid, integer, text)
  from public, anon, service_role;

grant execute on function public.adjust_product_stock(uuid, integer, text)
  to authenticated;

-- Verify on each deployed project after applying -- a clean push is not
-- evidence:
--
--   select proname, proacl
--     from pg_proc p join pg_namespace n on n.oid = p.pronamespace
--    where n.nspname = 'public' and proname = 'adjust_product_stock';
--
-- Expected: postgres=X/postgres and authenticated=X/postgres only. Any
-- "=X/" entry (PUBLIC), anon or service_role means this did not take.
