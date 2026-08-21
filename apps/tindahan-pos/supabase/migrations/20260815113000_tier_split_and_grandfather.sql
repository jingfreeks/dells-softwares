-- =============================================================================
-- The tier split · make the four plans actually differ
-- -----------------------------------------------------------------------------
-- 20260815109000 built the feature layer and deliberately left every plan
-- holding every feature, so that applying it changed nothing for anyone. It
-- also said, in as many words, that WHICH FEATURES BELONG TO WHICH TIER is a
-- pricing decision that deserves its own migration with its own audit.
--
-- This is that migration. Until now the entitlement machinery had nothing to
-- sell: four plans that grant identical capabilities are one plan with four
-- names.
--
-- THE LADDER IS CUMULATIVE BY CONSTRUCTION. Each feature is stamped with the
-- lowest tier that includes it, and a plan gets everything at or below its own
-- rank. That shape is chosen over four hand-written lists on purpose -- hand-
-- written lists drift, and the failure mode is a paying tenant quietly missing
-- something a cheaper tenant has.
--
--   0 FREE        POS only. Ring up a sale, count the drawer, void a mistake.
--   1 BASIC       The sari-sari store: utang and e-load, which is what that
--                 shop actually runs on, plus enough stock-in to be honest.
--   2 PRO         The convenience store: purchase orders, stock counts, BIR
--                 receipting, more than one register.
--   3 ENTERPRISE  Stock transfers, i.e. more than one branch.
--
-- WHY SUPPLIERS AND RECEIVING SIT AT BASIC AND NOT PRO. BASIC already grants
-- the INVENTORY module (see core.plan_modules). A module whose every feature
-- is off is an empty shell -- the tenant sees the section in the navigation
-- and finds nothing in it. The feature split has to agree with the module
-- split, so the two capabilities that make INVENTORY worth opening at all
-- come with the module.
--
-- EXISTING TENANTS ARE GRANDFATHERED, and this is the whole risk of the
-- migration. Every tenant alive today holds all fifteen features, because
-- that is what 109000 gave them. The moment the plans differ, the next call
-- to core.materialize_subscription_features() would switch off anything the
-- tenant's plan no longer lists -- a shop that took utang yesterday could not
-- take it today. That is a live-data regression dressed up as a pricing
-- change, and it is not what tiering is meant to do.
--
-- So before the plans are narrowed, every feature a tenant currently holds is
-- re-sourced from SUBSCRIPTION to GRANDFATHERED, which outranks the plan
-- exactly as MANUAL does. Nobody loses anything they are already using, and
-- the split governs new subscriptions only. An operator who wants a given
-- tenant back on plan terms calls public.platform_reset_feature_to_plan(),
-- one feature at a time, deliberately and with the reason recorded.
--
-- WHY A FOURTH SOURCE RATHER THAN REUSING MANUAL. MANUAL means a human looked
-- at one tenant and decided something. If this backfill wrote MANUAL, then
-- every feature of every tenant would read MANUAL the morning after the push
-- -- 15 x 661 of them -- and the word would stop carrying any information at
-- all. The console says, in as many words, that MANUAL "records a manual
-- decision"; that sentence has to stay true. GRANDFATHERED says the other
-- thing honestly: nobody chose this for you, it is simply what you already
-- had.
--
-- It is a distinction with real operational value. "Which tenants are we
-- carrying on grandfathered terms, and which did we genuinely comp?" is a
-- question the business will ask, and it is unanswerable if both write the
-- same word.
--
-- Affected schemas : core (plan_features rewritten, organization_features
--                    re-sourced)
-- Rollback         : re-run 109000's cross join to restore all-plans-all-
--                    features; the MANUAL re-sourcing is harmless if left.
-- Risk             : medium -- it changes what plans mean. Mitigated by the
--                    grandfather step, which is why that runs FIRST.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Step 0 -- make room for the new source, and teach materialization to
-- respect it.
--
-- Both must happen before a single row is re-sourced: the update would fail
-- the check constraint, and a materialize call landing in between would strip
-- exactly the tenants this migration exists to protect.
-- -----------------------------------------------------------------------------
alter table core.organization_features
  drop constraint organization_features_source_valid;

alter table core.organization_features
  add constraint organization_features_source_valid
  check (source in ('SUBSCRIPTION', 'MANUAL', 'TRIAL', 'GRANDFATHERED'));

create or replace function core.materialize_subscription_features(p_org uuid)
returns int
language plpgsql
security definer
set search_path = core, pg_temp
as $fn$
declare
  v_plan  uuid;
  v_count int := 0;
begin
  select s.plan_id into v_plan
  from core.organization_subscriptions s
  where s.organization_id = p_org and s.status <> 'CANCELLED'
  limit 1;

  if v_plan is null then
    return 0;
  end if;

  insert into core.organization_features (organization_id, feature_code, enabled, source)
  select p_org, pf.feature_code, true, 'SUBSCRIPTION'
  from core.plan_features pf
  where pf.plan_id = v_plan
  on conflict (organization_id, feature_code) do update
    set enabled    = true,
        updated_at = now()
    -- A grant that outranks the plan must survive a plan change rather than
    -- expiring on renewal: MANUAL because a human decided it, GRANDFATHERED
    -- because the tenant already had it before the plans narrowed.
    where core.organization_features.source not in ('MANUAL', 'GRANDFATHERED');

  get diagnostics v_count = row_count;

  update core.organization_features f
     set enabled = false, updated_at = now()
   where f.organization_id = p_org
     and f.source = 'SUBSCRIPTION'
     and f.enabled
     and not exists (
       select 1 from core.plan_features pf
       where pf.plan_id = v_plan and pf.feature_code = f.feature_code
     );

  return v_count;
end;
$fn$;

-- -----------------------------------------------------------------------------
-- Step 1 -- grandfather, BEFORE anything about the plans changes.
--
-- Order matters. Narrowing the plans first would leave a window in which a
-- materialize call could strip a tenant, and materialize is called from plan
-- changes that operators make at will.
-- -----------------------------------------------------------------------------
do $$
declare
  v_grandfathered int;
begin
  update core.organization_features
     set source     = 'GRANDFATHERED',
         updated_at = now()
   where enabled
     and source = 'SUBSCRIPTION';

  get diagnostics v_grandfathered = row_count;
  raise notice 'tier split: grandfathered % feature grants', v_grandfathered;
end;
$$;

-- -----------------------------------------------------------------------------
-- Step 2 -- the ladder itself.
-- -----------------------------------------------------------------------------
delete from core.plan_features;

with plan_rank (plan_code, rank) as (
  values ('FREE', 0), ('BASIC', 1), ('PRO', 2), ('ENTERPRISE', 3)
),
feature_rank (feature_code, min_rank) as (
  values
    -- 0 · FREE — selling, and being able to correct yourself while selling.
    ('pos.shifts',                0),
    ('pos.void',                  0),
    ('pos.discounts',             0),
    ('pos.pack_pricing',          0),  -- tingi selling; table stakes in PH
    -- 1 · BASIC — the sari-sari store.
    ('pos.utang',                 1),
    ('pos.eload',                 1),
    ('pos.held_sales',            1),
    ('inventory.suppliers',       1),
    ('inventory.receiving',       1),
    -- 2 · PRO — the convenience store.
    ('pos.multi_register',        2),
    ('pos.bir_receipts',          2),
    ('inventory.purchase_orders', 2),
    ('inventory.stock_count',     2),
    ('inventory.conversions',     2),
    -- 3 · ENTERPRISE — more than one branch.
    ('inventory.transfers',       3)
)
insert into core.plan_features (plan_id, feature_code)
select p.id, fr.feature_code
from core.subscription_plans p
join plan_rank    pr on pr.plan_code = p.code
join feature_rank fr on fr.min_rank <= pr.rank
on conflict do nothing;

-- -----------------------------------------------------------------------------
-- Step 3 -- refuse to apply a split that does not cover the catalogue.
--
-- If someone adds a feature to core.features and forgets to place it on the
-- ladder, it would silently belong to no plan at all -- unsellable, and
-- invisible until a tenant asks why they cannot use it. Fail the migration
-- instead.
-- -----------------------------------------------------------------------------
do $$
declare
  v_orphan text;
  v_empty  text;
begin
  select string_agg(f.code, ', ')
    into v_orphan
  from core.features f
  where not exists (select 1 from core.plan_features pf where pf.feature_code = f.code);

  if v_orphan is not null then
    raise exception 'features on no plan (add them to the ladder): %', v_orphan;
  end if;

  -- A plan that grants a module but none of that module's features shows the
  -- tenant an empty section. Catch it here rather than in a support ticket.
  select string_agg(format('%s/%s', p.code, pm.module_code), ', ')
    into v_empty
  from core.subscription_plans p
  join core.plan_modules pm on pm.plan_id = p.id
  where exists (select 1 from core.features f where f.module_code = pm.module_code)
    and not exists (
      select 1
      from core.plan_features pf
      join core.features f on f.code = pf.feature_code
      where pf.plan_id = p.id and f.module_code = pm.module_code
    );

  if v_empty is not null then
    raise exception 'plan grants a module with none of its features: %', v_empty;
  end if;
end;
$$;
