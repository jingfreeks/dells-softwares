-- =============================================================================
-- Read-only audit · is any tenant already over a plan limit?
-- -----------------------------------------------------------------------------
-- RUN THIS BEFORE APPLYING 20260815102000_enforce_plan_limits.sql to an
-- environment with real data.
--
-- The limits in core.organization_modules have been seeded but unenforced
-- since the entitlement migration, which means nobody has ever been stopped
-- from exceeding them. Switching enforcement on cannot corrupt or hide
-- anything -- it only refuses NEW rows -- but a tenant who is already over
-- will find they cannot add another device, product or warehouse, and will
-- have no idea why. That is a support call, and it is entirely avoidable by
-- looking first.
--
-- This snippet writes nothing. Paste it into the SQL editor, or:
--   psql "$DATABASE_URL" -f supabase/snippets/limit-audit.sql
--
-- If a row comes back, the options are: raise that tenant's limits (a manual
-- grant on organization_modules.limits, or move them to a bigger plan), or
-- hold the migration back. Do not silently break someone who was never told
-- there was a ceiling.
-- =============================================================================

with counted as (
  select
    o.id   as organization_id,
    o.name as organization,
    p.code as plan,
    om.module_code,
    om.limits,
    -- Only devices still paired count, the same rule the trigger uses. A
    -- store that has cycled through hardware must not be judged on history.
    (select count(*) from public.devices d
      where d.store_id = o.id and d.unpaired_at is null)        as devices,
    (select count(*) from public.products pr
      where pr.store_id = o.id)                                  as products,
    (select count(*) from public.warehouses w
      where w.store_id = o.id)                                   as warehouses,
    (select count(*) from core.branches b
      where b.organization_id = o.id and b.status <> 'CLOSED')   as branches
  from core.organizations o
  join core.organization_modules om on om.organization_id = o.id
  left join core.organization_subscriptions s
    on s.organization_id = o.id and s.status <> 'CANCELLED'
  left join core.subscription_plans p on p.id = s.plan_id
),
measured as (
  select organization_id, organization, plan, module_code, 'devices' as limit_key,
         devices as current_count, (limits->>'devices')::int as cap from counted
  union all
  select organization_id, organization, plan, module_code, 'products',
         products, (limits->>'products')::int from counted
  union all
  select organization_id, organization, plan, module_code, 'warehouses',
         warehouses, (limits->>'warehouses')::int from counted
  union all
  select organization_id, organization, plan, module_code, 'branches',
         branches, (limits->>'branches')::int from counted
)
select
  organization,
  plan,
  module_code,
  limit_key,
  current_count,
  cap,
  case
    when current_count >  cap then 'OVER -- will be blocked from adding more'
    when current_count =  cap then 'AT LIMIT -- the next one will be refused'
  end as verdict
from measured
where cap is not null           -- null/absent means unlimited (e.g. ENTERPRISE)
  and current_count >= cap
order by (current_count - cap) desc, organization, limit_key;

-- An empty result means enforcement is a no-op for every existing tenant and
-- the migration can be applied without warning anyone.
