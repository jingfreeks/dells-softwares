-- Retire the two plans that are not sold.
--
-- FREE (₱0) and PRO (₱999) are both is_active = true, appear nowhere on the
-- pricing page, and have zero subscribers. PRO also sits between Growth and
-- Business, so its existence quietly muddles the ladder for anyone reading the
-- catalogue.
--
-- #457 decided the catalogue is the intended product and the page was rewritten
-- to match it. These two are the part of the catalogue that the page was right
-- to omit.
--
-- What deactivating actually does, since it is more than hiding a row:
-- platform_set_plan(), platform_plans() and plan_prices() all filter on
-- is_active, so after this a platform admin can no longer ASSIGN FREE or PRO to
-- a tenant, and neither appears in the console's plan list. That is the point
-- of the change rather than a side effect -- a plan nobody may buy should not
-- be assignable by hand either -- but it is a capability being removed, so it
-- is stated plainly here.
--
-- start_trial() does NOT filter on is_active. So this migration alone would
-- leave /register?plan=PRO able to open a trial on a retired plan. The client
-- stops offering PRO in the same change; the check is not added to start_trial
-- here because that function is reached during registration before any session
-- exists and its failure modes deserve their own look, not a condition bolted
-- on at the end of an unrelated migration.
--
-- Nothing is deleted. The rows, their features and their modules stay, so a
-- tenant that was ever on one keeps a readable history and reactivating is one
-- update away.

update core.subscription_plans
   set is_active = false,
       updated_at = now()
 where code in ('FREE', 'PRO');

-- Verify after applying:
--
--   select code, name, is_active,
--          (select count(*) from core.organization_subscriptions s
--            where s.plan_id = p.id) as subscribers
--     from core.subscription_plans p order by sort_order;
--
-- Expected: FREE and PRO inactive with 0 subscribers; BASIC, BUSINESS and
-- ENTERPRISE still active.
