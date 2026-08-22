-- =============================================================================
-- Tier split · what to run on staging BEFORE production
-- -----------------------------------------------------------------------------
-- 20260815113000 narrows the four plans and grandfathers every existing tenant
-- so nobody loses a capability they are already using.
--
-- THE GRANDFATHER STEP CANNOT BE TESTED LOCALLY. A fresh local database has no
-- organizations at the moment the migration runs, so the backfill updates zero
-- rows and the pgTAP suite can only pin the mechanism it relies on. Staging has
-- the tenants. Run this there, before and after the push, and compare.
--
--   psql "$STAGING_URL" -f supabase/snippets/tier-split-audit.sql
-- =============================================================================

\echo '== 1. tenants, and what they hold =========================================='
-- BEFORE the migration every tenant should hold all 15, all SUBSCRIPTION.
-- AFTER, the same tenants should hold all 15, all GRANDFATHERED. The count of
-- enabled grants per tenant MUST NOT FALL. That is the whole promise.
--
-- manual_grants must NOT move: MANUAL means a human comped a feature for one
-- tenant, and the backfill is not that. If this number jumps, the migration
-- wrote the wrong source and the distinction is lost for good.
select
  count(distinct o.id)                                             as tenants,
  count(*) filter (where f.enabled)                                as enabled_grants,
  count(*) filter (where f.enabled and f.source = 'GRANDFATHERED') as grandfathered,
  count(*) filter (where f.enabled and f.source = 'MANUAL')        as manual_grants,
  count(*) filter (where f.enabled and f.source = 'SUBSCRIPTION')  as subscription_grants
from core.organizations o
left join core.organization_features f on f.organization_id = o.id;

\echo '== 2. anyone who LOST something ==========================================='
-- Must be empty. A tenant whose plan no longer sells a feature they hold is
-- fine (that is the grandfather working); a tenant who holds NOTHING where the
-- catalogue says they should is not.
select o.id, o.name, count(*) filter (where f.enabled) as still_held
from core.organizations o
left join core.organization_features f on f.organization_id = o.id
group by o.id, o.name
having count(*) filter (where f.enabled) = 0
order by o.name;

\echo '== 3. the ladder itself ==================================================='
select p.code,
       count(pf.feature_code) as features,
       string_agg(pf.feature_code, ', ' order by pf.feature_code) as sells
from core.subscription_plans p
left join core.plan_features pf on pf.plan_id = p.id
group by p.code
order by count(pf.feature_code);
-- Expect 4 / 9 / 14 / 15 for FREE / BASIC / PRO / ENTERPRISE.

\echo '== 4. cumulative? (must be empty) ========================================='
with rank (code, r) as (values ('FREE',0),('BASIC',1),('PRO',2),('ENTERPRISE',3))
select lo.code as cheaper, pf.feature_code, hi.code as dearer
from rank lo
join rank hi on hi.r > lo.r
join core.subscription_plans plo on plo.code = lo.code
join core.subscription_plans phi on phi.code = hi.code
join core.plan_features pf on pf.plan_id = plo.id
where not exists (
  select 1 from core.plan_features x
  where x.plan_id = phi.id and x.feature_code = pf.feature_code
);

\echo '== 5. a module granted with none of its features (must be empty) =========='
select p.code, pm.module_code
from core.subscription_plans p
join core.plan_modules pm on pm.plan_id = p.id
where exists (select 1 from core.features f where f.module_code = pm.module_code)
  and not exists (
    select 1 from core.plan_features pf
    join core.features f on f.code = pf.feature_code
    where pf.plan_id = p.id and f.module_code = pm.module_code
  );

\echo '== 6. spot-check one real tenant ==========================================' 
select o.name, p.code as plan, f.feature_code, f.enabled, f.source
from core.organizations o
join core.organization_subscriptions s
  on s.organization_id = o.id and s.status <> 'CANCELLED'
join core.subscription_plans p on p.id = s.plan_id
join core.organization_features f on f.organization_id = o.id
where o.id = (select id from core.organizations order by created_at limit 1)
order by f.feature_code;
-- The oldest tenant. After the push, every row should read enabled = t and
-- source = GRANDFATHERED, including the features BASIC no longer sells.
