-- Grandfathers in every staff account that existed before the onboarding
-- wizard shipped, so they don't get redirected into onboarding on their
-- next login. Only staff created after this migration have a null
-- onboarded_at and go through the wizard.
--
-- Rollback: not meaningful to reverse (there's no way to distinguish
-- "genuinely never onboarded" from "backfilled" after the fact) — if
-- 0014_onboarding.sql is rolled back, this has no effect since the column
-- it touches no longer exists.

update staff set onboarded_at = now() where onboarded_at is null;
