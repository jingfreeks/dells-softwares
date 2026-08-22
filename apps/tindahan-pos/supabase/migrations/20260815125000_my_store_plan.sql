-- =============================================================================
-- my_store_plan() -- what plan is the calling store actually on right now
-- -----------------------------------------------------------------------------
-- plan_prices() (20260815120000) answers "what could I upgrade to and for how
-- much" -- every active plan, no notion of which one is mine. Nothing exposes
-- the inverse question a dashboard needs to answer first: "what am I on
-- today." Same gap platform_organizations() already closes for the console
-- (it reads organization_subscriptions directly), just never given a
-- tenant-facing counterpart.
--
-- Shaped like my_store_billing_state() (status/writes_allowed) crossed with
-- plan_prices() (name/price/features) -- one row for the calling staff
-- member's own store, or none if they have no store or no subscription row
-- (matches my_store_billing_state's own documented "or none" contract).
create or replace function public.my_store_plan()
returns table (
  plan_code        text,
  name             text,
  price_php        numeric,
  billing_interval text,
  features         text[]
)
language sql
stable
security definer
set search_path = public, core, pg_temp
as $$
  select p.code, p.name, p.price_php, p.billing_interval,
         coalesce((
           select array_agg(pf.feature_code order by pf.feature_code)
           from core.plan_features pf where pf.plan_id = p.id
         ), '{}'::text[])
  from core.organization_subscriptions os
  join core.subscription_plans p on p.id = os.plan_id
  where os.organization_id = auth_store_id()
  order by os.created_at desc
  limit 1;
$$;

comment on function public.my_store_plan is
  'The plan the calling store is on today -- name, price, and its full '
  'feature set. One row, or none if the caller has no store or no '
  'subscription. Companion to plan_prices() (what could I have) and '
  'my_store_billing_state() (is it paused) -- neither answers "which plan '
  'is this."';

-- "revoke ... from public" alone is not enough on a hosted project: its
-- default ACL grants EXECUTE to anon and service_role explicitly at
-- creation time, and that grant sits alongside (not inside) the PUBLIC
-- pseudo-role entry -- discovered four separate times this session
-- (20260815121000, 20260815122000, and again for auth_role()/
-- auth_store_id() in 20260815123000). Revoking both explicitly up front
-- instead of waiting for the next audit to find it again.
revoke all on function public.my_store_plan() from public, anon, service_role;
grant execute on function public.my_store_plan() to authenticated;
