-- =============================================================================
-- Let an operator see what a plan actually sells
-- -----------------------------------------------------------------------------
-- Until 20260815113000 the four plans granted identical capabilities, so
-- platform_plans() returning only the module list was a complete answer: the
-- modules WERE the difference between plans.
--
-- They are not any more. FREE and ENTERPRISE differ by eleven features, and
-- the console still shows an operator nothing but "FREE / BASIC / PRO /
-- ENTERPRISE" and a tooltip of module codes. Changing a tenant's plan is a
-- decision with consequences the person making it cannot see -- and it is a
-- decision they make on behalf of a live shop.
--
-- So the RPC returns the feature list too. Nothing else changes: same
-- is_platform_admin() gate, same ordering, same shape otherwise.
--
-- DROP AND RECREATE, not CREATE OR REPLACE: Postgres refuses to change the
-- return type of an existing set-returning function. That means the grants go
-- with it, so they are restored below -- a dropped-and-recreated function
-- defaults to EXECUTE for PUBLIC, which on a platform_* RPC would expose the
-- plan catalogue to every signed-in shopkeeper. The is_platform_admin() gate
-- inside would still return zero rows, but relying on that alone is one
-- mistake away from a leak.
--
-- Affected schemas : public (one function, additive column)
-- Rollback         : restore the previous definition from 20260815099000
-- Risk             : low -- adds a column to a read-only console RPC
-- =============================================================================

drop function if exists public.platform_plans();

create function public.platform_plans()
returns table (
  plan_code        text,
  name             text,
  description      text,
  price_php        numeric,
  billing_interval text,
  is_active        boolean,
  modules          text[],
  features         text[]
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
         ), '{}'::text[]),
         coalesce((
           select array_agg(pf.feature_code order by pf.feature_code)
           from core.plan_features pf where pf.plan_id = p.id
         ), '{}'::text[])
  from core.subscription_plans p
  where core.is_platform_admin()
  order by p.sort_order, p.code;
$$;

comment on function public.platform_plans is
  'Every sellable plan with the modules and features it grants. Platform '
  'administrators only; returns zero rows to anyone else.';

revoke all on function public.platform_plans() from public;
grant execute on function public.platform_plans() to authenticated;
