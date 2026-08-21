-- =============================================================================
-- A fifth plan, real prices, and a tenant-facing way to see either
-- -----------------------------------------------------------------------------
-- The tier split (20260815113000) built four products and priced none of
-- them. The business has now made two decisions at once: what the four
-- existing plans cost, and that a fifth plan -- BUSINESS -- belongs between
-- BASIC and PRO.
--
--   FREE          ₱0        (unchanged)
--   BASIC         ₱299 / month
--   BUSINESS      ₱599 / month   -- new
--   PRO           ₱999 / month
--   ENTERPRISE    custom -- price_php stays NULL, deliberately (see below)
--
-- BUSINESS carves three real features out of what was PRO-exclusive:
-- purchase orders, stock counts, unit conversions. PRO keeps multi-register
-- and BIR receipting as its own differentiator -- both are currently
-- unenforced (290_every_feature_is_decided's known gap), so today this is
-- mostly a pricing distinction, but the ladder still has to be honest about
-- what each tier actually sells.
--
-- PRO'S FEATURE SET DOES NOT CHANGE. It was BASIC + 5; it is now
-- BASIC + 3 (via BUSINESS) + 2, the same fourteen codes as before. Existing
-- tenants already grandfathered onto PRO-level access see nothing different.
-- Nothing moves OUT of BASIC or into ENTERPRISE -- suppliers and receiving
-- stay at BASIC (a module with none of its features live is an empty shell,
-- 20260815113000's own reasoning), and stock transfers stay ENTERPRISE-only
-- (the multi-branch signal; a document proposing this tier structure listed
-- transfers under BUSINESS, which contradicts that document's OWN later
-- customer-segmentation section putting multi-branch at the top tier, and
-- contradicts what is already live in production -- read as an internal
-- inconsistency in an aspirational brief, not a deliberate instruction to
-- undo a shipped decision).
--
-- ENTERPRISE stays NULL, and that null is not the same "not decided yet"
-- null the other three just left. Its description already said so before
-- this migration touched anything: "Everything, with limits agreed per
-- contract." A multi-branch tier gets negotiated, not listed.
--
-- Affected schemas : core (1 new plan, 1 plan_modules row, plan_features
--                    rewritten for the whole ladder, 3 price updates),
--                    public (1 new function)
-- Rollback         : delete the BUSINESS plan row (cascades plan_modules and
--                    plan_features for it); set price_php back to null for
--                    BASIC and PRO; drop public.plan_prices(). PRO's
--                    plan_features return to the pre-migration set
--                    automatically once BUSINESS's row is gone, because they
--                    were re-derived from the same feature list, not moved.
-- Risk             : low for every tenant alive today -- nobody is on
--                    BUSINESS yet because it did not exist before this
--                    migration, and PRO's real feature set is unchanged.
--                    The risk is entirely in NEW signups from here forward,
--                    which is the point: this is what they will be sold.
-- =============================================================================

insert into core.subscription_plans (code, name, description, price_php, billing_interval, is_active, sort_order)
values ('BUSINESS', 'Business',
        'POS and Inventory, with purchase orders, stock counts and unit conversions.',
        599.00, 'MONTHLY', true, 2)
on conflict (code) do nothing;

-- Shift PRO and ENTERPRISE's sort_order to make room, if this runs against an
-- environment where they were not already spaced for a fifth plan.
update core.subscription_plans set sort_order = 3 where code = 'PRO' and sort_order <> 3;
update core.subscription_plans set sort_order = 4 where code = 'ENTERPRISE' and sort_order <> 4;

update core.subscription_plans set price_php = 299.00 where code = 'BASIC';
update core.subscription_plans set price_php = 999.00 where code = 'PRO';
-- ENTERPRISE: no update. Staying NULL is the decision, not an omission.

-- Same modules as BASIC -- POS and INVENTORY, no ACCOUNTING. BUSINESS is not
-- positioned as an accounting tier; that starts at PRO.
insert into core.plan_modules (plan_id, module_code)
select p.id, m.module_code
from core.subscription_plans p
cross join (values ('POS'), ('INVENTORY')) m(module_code)
where p.code = 'BUSINESS'
on conflict do nothing;

-- The whole ladder, rewritten from the agreed tiers rather than patched,
-- matching how 20260815113000 itself was written -- a hand-patched ladder
-- drifts, and the failure mode is a paying tenant quietly missing something a
-- cheaper tenant has.
delete from core.plan_features
where plan_id in (select id from core.subscription_plans where code in ('BASIC', 'BUSINESS', 'PRO', 'ENTERPRISE'));

with plan_rank (plan_code, rank) as (
  values ('FREE', 0), ('BASIC', 1), ('BUSINESS', 2), ('PRO', 3), ('ENTERPRISE', 4)
),
feature_rank (feature_code, min_rank) as (
  values
    -- 0 · FREE
    ('pos.shifts',                0),
    ('pos.void',                  0),
    ('pos.discounts',             0),
    ('pos.pack_pricing',          0),
    -- 1 · BASIC — unchanged from 20260815113000
    ('pos.utang',                 1),
    ('pos.eload',                 1),
    ('pos.held_sales',            1),
    ('inventory.suppliers',       1),
    ('inventory.receiving',       1),
    -- 2 · BUSINESS — new, carved out of what was PRO-exclusive
    ('inventory.purchase_orders', 2),
    ('inventory.stock_count',     2),
    ('inventory.conversions',     2),
    -- 3 · PRO — its remaining differentiator; unchanged feature SET overall
    ('pos.multi_register',        3),
    ('pos.bir_receipts',          3),
    -- 4 · ENTERPRISE — unchanged
    ('inventory.transfers',       4)
)
insert into core.plan_features (plan_id, feature_code)
select p.id, fr.feature_code
from core.subscription_plans p
join plan_rank    pr on pr.plan_code = p.code
join feature_rank fr on fr.min_rank <= pr.rank
where p.code in ('FREE', 'BASIC', 'BUSINESS', 'PRO', 'ENTERPRISE')
on conflict do nothing;

-- Same two guards 20260815113000 shipped with, re-run against the now-five-
-- plan ladder. Both raise on failure, so a successful migration already
-- implies them.
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

-- -----------------------------------------------------------------------------
-- public.plan_prices() -- what a signed-in tenant needs to answer "what would
-- upgrading cost me". Mirrors platform_plans() in shape deliberately, minus
-- the admin gate and the `modules` column the console needs and a tenant does
-- not.
--
-- Gated to `authenticated`, not `anon`. There is no pre-login pricing page in
-- this app to serve -- "Your plan" only exists once someone has signed in --
-- so there is no reason for the anon key that ships in the bundle to carry
-- this, and 220_anon_surface's whole point is keeping that surface to exactly
-- what is needed.
-- -----------------------------------------------------------------------------
create or replace function public.plan_prices()
returns table (
  plan_code        text,
  name             text,
  description      text,
  price_php        numeric,
  billing_interval text,
  sort_order       integer,
  features         text[]
)
language sql
stable
security definer
set search_path = public, core, pg_temp
as $$
  select p.code, p.name, p.description, p.price_php, p.billing_interval, p.sort_order,
         coalesce((
           select array_agg(pf.feature_code order by pf.feature_code)
           from core.plan_features pf where pf.plan_id = p.id
         ), '{}'::text[])
  from core.subscription_plans p
  where p.is_active
  order by p.sort_order, p.code;
$$;

comment on function public.plan_prices is
  'What a signed-in tenant sees for "what would upgrading cost" -- every '
  'active plan''s price and feature set. NULL price_php means custom/contact '
  'us (ENTERPRISE today), not unset -- FREE is 0.00, not null, for exactly '
  'this reason.';

revoke all on function public.plan_prices() from public;
grant execute on function public.plan_prices() to authenticated;
