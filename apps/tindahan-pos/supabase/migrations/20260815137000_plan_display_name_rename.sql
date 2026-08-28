-- Rename plan display names to match the landing page's marketing labels
-- (Starter/Growth/Business), so a customer who signs up seeing "Growth" on
-- the landing page doesn't later see "Business" for the same plan in
-- Settings -> Plan.
--
-- `code` is untouched -- this only updates the human-readable `name`
-- column that plan_prices() (and therefore PlanSettings.tsx's "You're on
-- Growth") reads. Nothing keyed off `code` (start_trial(),
-- request_plan_upgrade(), entitlements, the tier-rank table, super-admin's
-- plan picker -- confirmed by search, it only ever renders planCode, never
-- a display name) is affected by this change.
update core.subscription_plans set name = 'Starter' where code = 'BASIC';
update core.subscription_plans set name = 'Growth' where code = 'BUSINESS';
update core.subscription_plans set name = 'Business' where code = 'ENTERPRISE';
