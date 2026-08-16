-- =============================================================================
-- Public contract · Plan management for the Super Admin console
-- -----------------------------------------------------------------------------
-- Closes a design flaw in the console as first shipped.
--
-- Its only action was platform_set_module(), which writes source = 'MANUAL',
-- and core.materialize_subscription_modules() deliberately never overwrites a
-- MANUAL row -- so that a comped module survives the tenant's next renewal.
-- Both halves are correct in isolation. Together they meant the ONLY way to
-- change a tenant's entitlement permanently opted that module out of
-- plan-driven control:
--
--     upgrade a customer by toggling ACCOUNTING on  ->  source = MANUAL
--     later downgrade their plan to BASIC           ->  ACCOUNTING stays on
--
-- Do that a few times and the subscription is decorative: organization_modules
-- still answers correctly, but nothing the plan says has any effect. There was
-- also no way to change a plan at all -- platform_organizations() only ever
-- read the subscription.
--
-- Three functions fix that:
--
--   platform_plans()                 what can be sold, and what each includes
--   platform_set_plan(...)           move a tenant to a plan, re-materializing
--   platform_reset_module_to_plan()  drop a MANUAL override so the plan governs
--
-- The third matters as much as the second: without it a module that was ever
-- toggled by hand could never be handed back to the plan, and switching plans
-- would silently fail to take effect for exactly the modules an operator had
-- most recently cared about.
--
-- SECURITY -- as with every other platform_* function, these are SECURITY
-- DEFINER, live in `public`, and are EXECUTE-able by `authenticated`, so any
-- signed-in cashier can invoke them. They are safe only because each re-asks
-- core.is_platform_admin() itself. Plans are commercial, so the two mutating
-- functions require BILLING scope specifically (SUPERUSER satisfies it via
-- is_platform_admin's own scope rule).
--
-- Affected schemas : public (three new functions)
-- Rollback         : drop the three functions
-- Risk             : low -- additive; no existing function changes behaviour
-- =============================================================================

-- -----------------------------------------------------------------------------
-- What is sellable, and what each plan includes.
-- -----------------------------------------------------------------------------

create or replace function public.platform_plans()
returns table (
  plan_code        text,
  name             text,
  description      text,
  price_php        numeric,
  billing_interval text,
  is_active        boolean,
  modules          text[]
)
language sql
stable
security definer
set search_path = public, core, pg_temp
as $$
  select p.code, p.name, p.description, p.price_php, p.billing_interval, p.is_active,
         coalesce((
           select array_agg(pm.module_code order by pm.module_code)
           from core.plan_modules pm where pm.plan_id = p.id
         ), '{}'::text[])
  from core.subscription_plans p
  where core.is_platform_admin()
  order by p.sort_order, p.code;
$$;

comment on function public.platform_plans is
  'The plan catalogue, for the console''s plan picker. Guarded like every '
  'other platform_* read -- a non-administrator gets zero rows.';

-- -----------------------------------------------------------------------------
-- Move a tenant onto a plan.
-- -----------------------------------------------------------------------------

create or replace function public.platform_set_plan(
  p_org       uuid,
  p_plan_code text,
  p_reason    text default null
)
returns void
language plpgsql
security definer
set search_path = public, core, pg_temp
as $$
declare
  v_plan     uuid;
  v_old_plan text;
  v_sub      uuid;
begin
  -- Plans are commercial, so this is BILLING rather than plain admin.
  if not core.is_platform_admin('BILLING') then
    raise exception 'UNAUTHORIZED_ACTION' using errcode = 'P0001';
  end if;

  select id into v_plan
  from core.subscription_plans
  where code = upper(p_plan_code) and is_active;

  if v_plan is null then
    raise exception 'VALIDATION_FAILED: unknown or inactive plan %', p_plan_code
      using errcode = 'P0001';
  end if;

  if not exists (select 1 from core.organizations where id = p_org) then
    raise exception 'VALIDATION_FAILED: unknown organization' using errcode = 'P0001';
  end if;

  select s.id, p.code into v_sub, v_old_plan
  from core.organization_subscriptions s
  join core.subscription_plans p on p.id = s.plan_id
  where s.organization_id = p_org and s.status <> 'CANCELLED'
  limit 1;

  if v_sub is null then
    -- An organization can legitimately have no live subscription: its previous
    -- one was cancelled. Starting a new one is the same operation from the
    -- operator's point of view, so do not make them care which case it is.
    insert into core.organization_subscriptions (organization_id, plan_id, status, notes)
    values (p_org, v_plan, 'ACTIVE', p_reason);
  else
    update core.organization_subscriptions
       set plan_id = v_plan, status = 'ACTIVE', updated_at = now()
     where id = v_sub;
  end if;

  -- Rewrites SUBSCRIPTION-sourced rows to match the new plan, and leaves any
  -- MANUAL grant intact -- deliberately, so a comp is not revoked by a routine
  -- plan change. Use platform_reset_module_to_plan() to give one back.
  perform core.materialize_subscription_modules(p_org);

  perform core.write_platform_audit(
    'PLATFORM_SET_PLAN', 'OrganizationSubscription', p_org,
    jsonb_build_object('plan', v_old_plan),
    jsonb_build_object('plan', upper(p_plan_code)),
    p_reason
  );
end;
$$;

-- -----------------------------------------------------------------------------
-- Hand a manually-overridden module back to the plan.
-- -----------------------------------------------------------------------------

create or replace function public.platform_reset_module_to_plan(
  p_org    uuid,
  p_module text,
  p_reason text default null
)
returns void
language plpgsql
security definer
set search_path = public, core, pg_temp
as $$
declare
  v_was_enabled boolean;
  v_source      text;
begin
  if not core.is_platform_admin('BILLING') then
    raise exception 'UNAUTHORIZED_ACTION' using errcode = 'P0001';
  end if;

  select om.enabled, om.source into v_was_enabled, v_source
  from core.organization_modules om
  where om.organization_id = p_org and om.module_code = upper(p_module);

  if v_source is null then
    raise exception 'VALIDATION_FAILED: no entitlement row for that module'
      using errcode = 'P0001';
  end if;

  -- Deleting the row rather than flipping source back is what actually returns
  -- control: materialize re-creates it from the plan when the plan includes the
  -- module, and its absence means "not entitled" when it does not. Flipping the
  -- source would leave a stale enabled flag for a module the plan omits.
  delete from core.organization_modules
   where organization_id = p_org and module_code = upper(p_module);

  perform core.materialize_subscription_modules(p_org);

  perform core.write_platform_audit(
    'PLATFORM_RESET_MODULE_TO_PLAN', 'OrganizationModule', p_org,
    jsonb_build_object('module', upper(p_module), 'source', v_source, 'enabled', v_was_enabled),
    jsonb_build_object('module', upper(p_module),
                       'enabled', core.module_enabled(p_org, p_module)),
    p_reason
  );
end;
$$;

revoke all on function public.platform_plans()                                from public;
revoke all on function public.platform_set_plan(uuid, text, text)             from public;
revoke all on function public.platform_reset_module_to_plan(uuid, text, text) from public;

grant execute on function public.platform_plans()                                to authenticated;
grant execute on function public.platform_set_plan(uuid, text, text)             to authenticated;
grant execute on function public.platform_reset_module_to_plan(uuid, text, text) to authenticated;
