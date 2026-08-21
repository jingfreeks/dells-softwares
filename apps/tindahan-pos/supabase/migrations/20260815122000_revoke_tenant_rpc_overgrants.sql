-- =============================================================================
-- Tenant-facing RPCs stop being executable by anon and service_role
-- -----------------------------------------------------------------------------
-- Same overgrant class as 20260815119000 (platform_*) and 20260815121000
-- (plan_prices): the hosted project's default ACL grants EXECUTE on every new
-- public-schema function to anon and service_role at creation time, and none
-- of these tenant RPCs ever explicitly revoked it, because REVOKE ALL ... FROM
-- PUBLIC (used throughout this codebase's own migrations) only strips the
-- PUBLIC pseudo-role grant, not that explicit per-role default-ACL grant.
--
-- Found by auditing pg_proc.proacl on the hosted staging project while
-- verifying 20260815121000 -- these ~24 functions carried the same anon and
-- service_role EXECUTE that plan_prices() had, on both staging and
-- production. Confirmed pre-existing, not introduced by this migration or
-- the pricing work that surfaced it.
--
-- UNLIKE platform_*, there is no shared name prefix to loop over -- these
-- functions were added across 0009 through 20260815115000, named for what
-- they do (checkout_sale, void_sale, my_store_features, ...), not for who
-- calls them. So this is a hand-typed list rather than a pattern match. The
-- real defense against the NEXT function silently inheriting this overgrant
-- is not this list -- it's security-surface.sql check 9, added alongside this
-- migration, which asserts the same thing against pg_proc.proacl every time
-- it's run against a real environment. This migration is what makes today's
-- audit clean; that check is what keeps it clean.
--
-- CONFIRMED NOTHING WAS ACTUALLY REACHABLE, the same way 119000 confirmed it
-- for platform_*:
--   - void_sale, transfer_stock, checkout_sale, record_credit_payment,
--     admin_set_staff_pin, admin_unpair_device, set_own_pin,
--     assign_staff_role, start_cashier_session, end_cashier_session,
--     generate_pairing_code all resolve `auth_store_id()` or
--     `select store_id from staff where id = auth.uid()` as their very
--     first statement and raise/return immediately when it's null -- which
--     it always is for anon (no JWT) or service_role called directly
--     (no staff row of its own).
--   - has_permission, list_my_permissions, list_pickable_cashiers,
--     my_store_billing_state, my_store_features, my_store_limits,
--     my_store_modules, current_store_has_feature, current_store_has_module,
--     current_store_writes_allowed are pure reads scoped to
--     auth_store_id()/auth.uid(); a null caller identity gets false/empty
--     rows back, never another tenant's data.
--   - auth_role() and auth_store_id() are the two foundational helpers
--     nearly everything above is built on. They stay PUBLIC-callable in the
--     sense that revoking them is deliberately NOT done here: confirmed via
--     pg_policy that feature_flags' anon-readable policy (`USING (true)`,
--     20260815101000) is the only anon-facing RLS in this database and does
--     not call either function, so narrowing them changes nothing anon can
--     currently do -- but they are called by name from nowhere in either
--     app's client code (`grep -rn "rpc(.auth_role\|rpc(.auth_store_id"
--     src/` in tindahan-pos and inventory-app: nothing), so there is no
--     reason for anon or service_role to hold direct EXECUTE either.
--
-- THE TWO EXCEPTIONS. _validate_pairing_code and _consume_pairing_code are
-- the one legitimate service_role case in this app: pair-device is the
-- single deliberately-anonymous Edge Function (a fresh tablet has no session
-- yet), and it calls both through its service-role admin client before any
-- user identity exists at all (`grep -n '.rpc(' supabase/functions/pair-
-- device/index.ts`). anon holding EXECUTE on them is still an overgrant --
-- the whole point of routing pairing through an Edge Function instead of a
-- bare RPC is the origin allowlist and centralized error handling it adds --
-- so anon is revoked from both; service_role is kept for these two, and (see
-- below) made an EXPLICIT grant rather than left as the implicit one.
--
-- 0026_device_pairing.sql's own comment on _validate_pairing_code says "No
-- grant statement needed (service_role already has it)" -- true only on a
-- hosted project, because of the exact default-ACL mechanism this migration
-- exists to stop relying on. A fresh local reset never had that default ACL,
-- so service_role has NEVER had EXECUTE on either pairing function locally:
-- pair-device would fail against local dev right now, silently, the first
-- time anyone actually exercised it end to end. This migration makes the
-- grant explicit instead of implicit, which fixes local/hosted parity as a
-- side effect of the exact discipline it's already applying everywhere else.
--
-- Affected schemas : public (24 functions; EXECUTE revoked from anon and
--                    service_role, except service_role kept on the 2 pairing
--                    functions)
-- Rollback         : grant execute back to anon/service_role on the affected
--                    functions -- though there is no legitimate reason to
--                    want that back
-- Risk             : none for authenticated (unchanged); none for anon or
--                    service_role either, since neither could do anything
--                    through these functions that the internal auth checks
--                    didn't already block
-- =============================================================================

do $$
declare
  r record;
  v_names constant text[] := array[
    'admin_set_staff_pin', 'admin_unpair_device', 'assign_staff_role',
    'auth_role', 'auth_store_id',
    'checkout_sale', 'current_store_has_feature', 'current_store_has_module',
    'current_store_writes_allowed', 'end_cashier_session',
    'generate_pairing_code', 'has_permission', 'list_my_permissions',
    'list_pickable_cashiers', 'my_store_billing_state', 'my_store_features',
    'my_store_limits', 'my_store_modules', 'record_credit_payment',
    'set_own_pin', 'start_cashier_session', 'transfer_stock', 'void_sale',
    '_consume_pairing_code', '_validate_pairing_code'
  ];
begin
  for r in
    select p.oid, p.proname
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = any(v_names)
  loop
    if r.proname in ('_consume_pairing_code', '_validate_pairing_code') then
      execute format('revoke execute on function %s from anon', r.oid::regprocedure);
      execute format('grant execute on function %s to service_role', r.oid::regprocedure);
    elsif r.proname in ('auth_role', 'auth_store_id') then
      -- These two have never had a per-role grant at all in their entire
      -- migration history (0001-era, predating even the "revoke all from
      -- public" convention this codebase later adopted) -- just the bare
      -- PUBLIC pseudo-role entry Postgres hands every new function by
      -- default. `revoke ... from anon` alone does not touch that; anon
      -- inherits through PUBLIC regardless. authenticated genuinely needs
      -- direct EXECUTE (RLS policies across ~45 tables call these in a
      -- USING clause evaluated as the querying role, not as security
      -- definer), so this is revoke-from-public-then-regrant, not a plain
      -- revoke.
      execute format('revoke all on function %s from public', r.oid::regprocedure);
      execute format('grant execute on function %s to authenticated', r.oid::regprocedure);
    else
      execute format('revoke execute on function %s from anon, service_role', r.oid::regprocedure);
    end if;
  end loop;
end;
$$;
