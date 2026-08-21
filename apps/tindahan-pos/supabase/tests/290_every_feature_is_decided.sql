-- =============================================================================
-- pgTAP · A capability is either withheld, or knowingly not withheld
--
-- The feature catalogue is the price list. Every code in it is something the
-- business offers to sell, and selling a capability the server does not
-- withhold is the bug this whole layer exists to prevent -- it is what
-- 20260815114000 fixed for suppliers and receiving, months after those two
-- were quietly sold to everyone.
--
-- The trouble is that "we forgot to enforce it" and "we decided not to enforce
-- it" look identical from the outside: in both cases nothing in the database
-- mentions the code. This file makes them look different. Enforcement is
-- detected by scanning every function body and policy expression for the
-- feature code; anything unenforced must appear in the list below, with the
-- reason written down.
--
-- So adding a sellable capability and forgetting to withhold it FAILS HERE,
-- and the only way past is to say out loud that it is not withheld and why.
--
-- Run: psql -f supabase/tests/290_every_feature_is_decided.sql
-- =============================================================================
begin;
set local search_path = public, core, extensions;
select * from no_plan();

-- -----------------------------------------------------------------------------
-- Deliberately not enforced in the database, and why.
--
-- The first five are held by EVERY plan, so nothing is being given away: the
-- tiers do not differ on them and non-enforcement costs nothing today. They
-- are also the ones with no unambiguous "off" -- you cannot half-open a
-- register, and refusing to let a shop apply a discount mid-queue is not a
-- downgrade, it is a broken till.
--
-- THE LAST TWO ARE DIFFERENT, and are recorded here as a known gap rather than
-- a decision. Both are PRO-only, so the tier split sells them, and neither is
-- withheld from anyone:
--
--   pos.multi_register  Whether a store may run more than one till is already
--                       expressed -- and actually enforced -- by the `devices`
--                       LIMIT, which BASIC currently sets to 3. So the plan
--                       says one thing and the limit says another. The two
--                       need reconciling, and which way is a pricing decision.
--
--   pos.bir_receipts    `stores.bir_registered` is a boolean the owner toggles
--                       for themselves. Nothing consults the entitlement, so
--                       any store can issue official receipts. Withholding it
--                       is a compliance-shaped decision, not a technical one:
--                       a shop that is registered with the BIR is legally
--                       required to issue them.
-- -----------------------------------------------------------------------------
create temp table not_enforced (code text primary key);
insert into not_enforced values
  ('pos.shifts'),        -- opening a register REQUIRES counting the drawer
  ('pos.discounts'),     -- refusing one mid-queue breaks the till, not the plan
  ('pos.pack_pricing'),  -- tingi selling; also has a separate global kill switch
  ('pos.held_sales'),    -- a parked cart has no meaningful "off"
  ('pos.eload'),         -- gated in the client only, and held by every plan
  ('pos.multi_register'),-- KNOWN GAP: the `devices` limit already governs this
  ('pos.bir_receipts');  -- KNOWN GAP: stores.bir_registered is owner-controlled

create temp view feature_enforcement as
with mentions as (
  select p.prosrc as body
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname in ('public', 'core')
  union all
  select coalesce(pg_get_expr(polqual, polrelid), '')
      || coalesce(pg_get_expr(polwithcheck, polrelid), '')
  from pg_policy
)
select f.code,
       exists (select 1 from mentions m where m.body like '%''' || f.code || '''%') as enforced
from core.features f;

-- -----------------------------------------------------------------------------
-- 1 · nothing is sold and silently unenforced
-- -----------------------------------------------------------------------------
select is_empty(
  $$ select code from feature_enforcement
      where not enforced and code not in (select code from not_enforced) $$,
  'every capability is either withheld by the database, or listed above with a reason'
);

-- -----------------------------------------------------------------------------
-- 2 · and the list does not rot
--
-- Without this, enforcing something later would leave a stale excuse behind,
-- and the next person would believe it.
-- -----------------------------------------------------------------------------
select is_empty(
  $$ select code from feature_enforcement
      where enforced and code in (select code from not_enforced) $$,
  'and nothing on that list is actually enforced -- a stale excuse is worse than none'
);

select is_empty(
  $$ select code from not_enforced
     except select code from core.features $$,
  'and the list names no capability that has left the catalogue'
);

-- -----------------------------------------------------------------------------
-- 3 · the ones that matter commercially
--
-- Spelled out so that enforcing either -- or moving it to BASIC -- has to
-- change this file, and cannot happen by accident in either direction.
-- -----------------------------------------------------------------------------
select ok(
  (select count(*) = 2 from not_enforced
    where code in ('pos.multi_register', 'pos.bir_receipts')),
  'the two PRO-only capabilities that nothing withholds are still on the record '
  || 'as a known gap, not quietly forgotten'
);

select ok(
  (select bool_and(sold) from (
     select exists (
       select 1 from core.plan_features pf
       join core.subscription_plans p on p.id = pf.plan_id
       where p.code = 'PRO' and pf.feature_code = n.code
     ) as sold
     from not_enforced n where n.code in ('pos.multi_register', 'pos.bir_receipts')
   ) t),
  'both are genuinely sold at PRO, which is what makes the gap worth money'
);

select ok(
  (select not exists (
     select 1 from core.plan_features pf
     join core.subscription_plans p on p.id = pf.plan_id
     where p.code = 'BASIC' and pf.feature_code = 'pos.multi_register'
   )),
  'BASIC does not sell multiple registers -- while its `devices` limit permits '
  || 'more than one, which is the contradiction to resolve'
);

select * from finish();
rollback;
