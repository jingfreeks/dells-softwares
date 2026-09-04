-- Review becomes a sellable feature, from Growth upward
--
-- Review answers "how is my store doing, and what needs my attention" by
-- reading sales, stock and utang the tenant already has. Nothing here computes
-- any of that; this migration only establishes WHO IS ENTITLED to it, so the
-- entitlement exists and is testable before a single figure is exposed.
--
-- WHY 'pos.review' AND NOT 'inventory.review'
--
-- core.feature_enabled() fails closed on the MODULE as well as the feature: a
-- feature is dark when its module is off, however its own row reads. Review
-- draws on inventory, but every tenant who can be sold Review holds POS,
-- whereas a POS-only tenant does not hold INVENTORY. Filing it under INVENTORY
-- would make the feature silently unavailable to a tenant who had paid for it.
-- The module says where the capability LIVES, not where its data comes from.
--
-- THE LADDER
--
-- Growth is the plan code BUSINESS -- 20260815137000 renamed the display names
-- (BASIC -> 'Starter', BUSINESS -> 'Growth') without touching the codes, so the
-- marketing name and the primary key disagree by design. Anyone reading this
-- later: `Growth` in the brief is `BUSINESS` here.
--
-- Granted at rank 2 and above, matching how 20260815120000 expresses the
-- ladder: BUSINESS (Growth), PRO and ENTERPRISE. PRO is retired and inactive
-- since 20260903110000 and has no subscribers, but it is still ranked above
-- BUSINESS, and granting by rank rather than by naming plans is what keeps a
-- cheaper tier from quietly holding something a dearer one does not.
--
-- Starter (BASIC) is not granted, which is the entire point.
--
-- Affected schemas : core (1 feature row, plan_features for ranks 2+,
--                    re-materialization for affected tenants)
-- Rollback         : delete from core.organization_features where feature_code
--                    = 'pos.review'; delete from core.plan_features where
--                    feature_code = 'pos.review'; delete from core.features
--                    where code = 'pos.review';
-- Risk             : low -- adds an entitlement nobody holds today and no code
--                    reads yet. No existing tenant gains or loses anything
--                    they can currently see.

insert into core.features (code, module_code, name, description, is_sellable, sort_order)
values ('pos.review', 'POS', 'Review',
        'See how the store is doing and what needs attention: sales, stock health, '
        'slow movers and overdue utang, drawn from the tenant''s own records.',
        true, 60)
on conflict (code) do nothing;

-- Rank-based, not plan-named, for the reason in the header.
with plan_rank (plan_code, rank) as (
  values ('FREE', 0), ('BASIC', 1), ('BUSINESS', 2), ('PRO', 3), ('ENTERPRISE', 4)
)
insert into core.plan_features (plan_id, feature_code)
select p.id, 'pos.review'
  from core.subscription_plans p
  join plan_rank pr on pr.plan_code = p.code
 where pr.rank >= 2
on conflict (plan_id, feature_code) do nothing;

-- Hand it to the tenants who have already paid for it. materialize_subscription_
-- features() re-derives SUBSCRIPTION-sourced rows from the plan and leaves
-- MANUAL grants alone, so this is safe to run against a live tenant and safe to
-- run twice.
do $$
declare v_org uuid;
begin
  for v_org in
    select distinct s.organization_id
      from core.organization_subscriptions s
      join core.subscription_plans p on p.id = s.plan_id
      -- Same predicate materialize_subscription_features() uses internally, so
      -- a cancelled subscription is not handed the feature on the way out.
      -- status <> 'CANCELLED', not status = 'ACTIVE': the grace ladder has
      -- other live states and they all still hold the plan.
      join (values ('FREE', 0), ('BASIC', 1), ('BUSINESS', 2), ('PRO', 3), ('ENTERPRISE', 4))
        as pr (plan_code, rank) on pr.plan_code = p.code
     where pr.rank >= 2
       and s.status <> 'CANCELLED'
  loop
    perform core.materialize_subscription_features(v_org);
  end loop;
end $$;
