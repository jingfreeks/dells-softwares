-- =============================================================================
-- platform_* RPCs stop being executable by anon and service_role
-- -----------------------------------------------------------------------------
-- Running supabase/snippets/security-surface.sql against the hosted staging
-- project found all fifteen platform_* functions granted EXECUTE to anon and
-- service_role, not just authenticated. Confirmed pre-existing rather than
-- caused by any migration in this repository -- it applies uniformly to
-- functions several migrations never touched -- and confirmed not a live
-- exposure: every platform_* function checks core.is_platform_admin()
-- internally, and 250_tier_split already pgTAP-verifies that gate returns
-- zero rows for a non-administrator. Nothing was reachable. But the
-- defense-in-depth these functions were meant to carry -- narrow to the one
-- role that can ever legitimately call them -- was not actually there, and
-- nothing caught it until security-surface.sql was pointed at the real
-- database instead of trusting a local "clean" result.
--
-- WHY anon HAS NO LEGITIMATE REASON. The console signs in through Supabase
-- Auth like any other app; there is no pre-login platform_* call anywhere in
-- super-admin's client code (contrast with tindahan-pos, where
-- FeatureFlagsProvider genuinely does read before sign-in, which is the
-- entire reason 20260815107000/108000 exist).
--
-- WHY service_role HAS NO LEGITIMATE REASON. No Edge Function in this
-- codebase calls a platform_* RPC --
-- `grep -rl platform_ apps/tindahan-pos/supabase/functions/` finds nothing --
-- and platform administration is deliberately a human-in-the-loop console
-- action, not something automation performs.
--
-- THIS IS DATA-DRIVEN rather than fifteen hand-typed REVOKE statements,
-- because a hand-typed list silently stops covering a sixteenth function the
-- day someone adds one and forgets this migration exists. Every function
-- actually needs its own considered GRANT the same way every migration that
-- added a platform_* function already ended in one -- this loop is a one-time
-- cleanup of what already exists, not a substitute for that discipline going
-- forward.
--
-- Nothing here changes authenticated's access. Every platform_* function
-- keeps working exactly as before for a signed-in caller; the internal
-- is_platform_admin() gate is what actually decided who saw data then and
-- now, unchanged either way.
--
-- Affected schemas : public (15 functions, EXECUTE revoked from two roles)
-- Rollback         : grant execute on the affected functions back to anon,
--                    service_role -- though there is no legitimate reason to
--                    want that back
-- Risk             : none for anon (it was never scoped to reach anon in the
--                    first place) or for how tindahan-pos/inventory-app work
--                    (neither app's client ever calls a platform_* RPC); the
--                    console itself is unaffected since it authenticates
--                    before calling any of these
-- =============================================================================

do $$
declare
  r record;
begin
  for r in
    select p.oid
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname like 'platform\_%'
  loop
    execute format('revoke execute on function %s from anon, service_role', r.oid::regprocedure);
  end loop;
end;
$$;
