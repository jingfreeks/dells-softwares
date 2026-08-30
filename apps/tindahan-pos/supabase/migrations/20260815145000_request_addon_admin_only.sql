-- =============================================================================
-- Restrict request_addon() to admins
-- -----------------------------------------------------------------------------
-- Same gap as start_trial()/request_plan_upgrade() (20260815143000), found
-- doing a broader pass over every RPC after fixing those two: request_addon()
-- also only checked that the caller belonged to a store, not that they were
-- an admin. Confirmed live on staging with a real QA Cashier session token
-- -- calling request_addon('ACCOUNTING') succeeded (204, no error), writing
-- an add-on request note to the store's subscription row on the Cashier's
-- own behalf.
--
-- Lower severity than start_trial() was -- this never activates anything
-- itself, only appends a note for a platform admin to read, same as
-- request_plan_upgrade() -- but it's the same class of decision
-- (organization billing/add-ons) that 20260815143000 already established
-- belongs to the store owner, not any signed-in staff member. Fixing here
-- for the same reason, closing out the last RPC in this family.
--
-- reachable from Settings -> Plan (/settings/plan), already wrapped in
-- <RequireRole roles={["admin"]}> client-side -- this closes the
-- direct-API-bypass gap the client route guard alone doesn't cover.
-- =============================================================================

create or replace function public.request_addon(p_module_code text)
returns void
language plpgsql
security definer
set search_path = public, core, pg_temp
as $$
declare
  v_store_id uuid := auth_store_id();
begin
  if v_store_id is null then
    raise exception 'Not a registered staff member of any store';
  end if;
  if auth_role() <> 'admin' then
    raise exception 'ADMIN_ONLY';
  end if;
  if p_module_code not in ('ACCOUNTING') then
    raise exception 'INVALID_ADDON_REQUEST';
  end if;

  update core.organization_subscriptions
    set notes = coalesce(notes || E'\n', '')
      || format('Requested add-on: %s on %s', p_module_code, now()::date)
    where organization_id = v_store_id;
end;
$$;

comment on function public.request_addon is
  'A signed-in ADMIN asking for an add-on module (ACCOUNTING only, for '
  'now) independent of their plan tier, on behalf of their store -- '
  'records the request as a note for a platform admin to fulfill via '
  'platform_set_module(..., p_source => ''ADDON''). Never activates '
  'anything itself. Admin-only for the same reason as start_trial()/'
  'request_plan_upgrade() (see 20260815143000, 20260815145000).';
