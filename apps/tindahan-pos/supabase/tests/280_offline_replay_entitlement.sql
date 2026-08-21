-- =============================================================================
-- pgTAP · Replaying a sale that already happened
--
-- The register works offline. A credit sale rung up with no signal sits in the
-- device queue until the connection returns. If pos.utang is withdrawn in
-- between, refusing the replay does not undo anything -- the goods are gone and
-- the customer owes the money -- it only stops the shop's books recording it.
--
-- checkout_sale() already decided this for stock in migration 0030: a replay is
-- allowed to drive stock negative and records a discrepancy. 20260815118000
-- makes the entitlement layer agree.
--
-- The four things that must hold, and the third is the one that keeps this
-- from being a hole rather than a fix:
--
--   1. a live credit sale is still refused without the capability
--   2. a replay of a sale made BEFORE the withdrawal lands
--   3. a replay CLAIMING the flag for a sale made after it is still refused --
--      is_offline_replay is caller-supplied, so the flag alone must not be
--      enough or every store gets utang for free
--   4. a store that never held pos.utang at all is exempt from nothing
--
-- Run: psql -f supabase/tests/280_offline_replay_entitlement.sql
-- =============================================================================
begin;
set local search_path = public, core, extensions;
select * from no_plan();

insert into auth.users (id, email, raw_user_meta_data) values
  ('fb800000-0000-4000-8000-000000000001', 'replay@test.local',
   '{"store_name":"Replay Store","owner_name":"Owner"}');

create or replace function pg_temp.org() returns uuid language sql as $$
  select id from stores where name = 'Replay Store'
$$;

insert into customers (store_id, name) select pg_temp.org(), 'Aling Rosa';

-- Withdraw the capability. updated_at becomes the moment of withdrawal, which
-- is what the exemption compares against.
update core.organization_features
   set enabled = false, updated_at = now()
 where organization_id = pg_temp.org() and feature_code = 'pos.utang';

-- Written directly rather than through checkout_sale() so each case isolates
-- the TRIGGER. checkout_sale has its own reasons to refuse a sale (stock,
-- cashier session, an empty cart) and any of them would mask what is under
-- test here.
create or replace function pg_temp.try_sale(p_replay boolean, p_occurred timestamptz)
returns text language plpgsql as $$
begin
  insert into sales (store_id, total, payment_type, customer_id,
                     is_offline_replay, occurred_at, cashier_id)
  values (pg_temp.org(), 100, 'credit',
          (select id from customers where store_id = pg_temp.org() limit 1),
          p_replay, p_occurred, 'fb800000-0000-4000-8000-000000000001');
  return 'accepted';
exception when others then
  return sqlerrm;
end;
$$;

-- 1 · a live sale is still refused
select is(
  pg_temp.try_sale(false, now()),
  'FEATURE_NOT_ENABLED: pos.utang',
  'a live credit sale is still refused without the capability'
);

-- 3 · the flag alone is not enough. This is the assertion that stops the fix
--     from being a way to buy nothing and get utang anyway.
select is(
  pg_temp.try_sale(true, now()),
  'FEATURE_NOT_ENABLED: pos.utang',
  'and claiming the replay flag for a sale made NOW is still refused -- the '
  || 'flag is caller-supplied, so it cannot be the whole test'
);

-- 2 · a genuine replay lands
select is(
  pg_temp.try_sale(true, now() - interval '2 hours'),
  'accepted',
  'but a replay of a sale made BEFORE the withdrawal lands -- refusing it '
  || 'would not undo the sale, only hide it from the books'
);

select is(
  (select count(*)::int from sales
    where store_id = pg_temp.org() and payment_type = 'credit'),
  1,
  'and exactly that one sale is on the books'
);

-- A replay without an occurred_at cannot be shown to predate anything.
select is(
  pg_temp.try_sale(true, null),
  'FEATURE_NOT_ENABLED: pos.utang',
  'a replay with no occurred_at proves nothing and is refused'
);

-- -----------------------------------------------------------------------------
-- 4 · a store that never held the capability
-- -----------------------------------------------------------------------------
insert into auth.users (id, email, raw_user_meta_data) values
  ('fb800000-0000-4000-8000-000000000002', 'never@test.local',
   '{"store_name":"Never Had It","owner_name":"Owner"}');

delete from core.organization_features
 where organization_id = (select id from stores where name = 'Never Had It')
   and feature_code = 'pos.utang';

insert into customers (store_id, name)
select id, 'Walk In' from stores where name = 'Never Had It';

create or replace function pg_temp.try_never() returns text language plpgsql as $$
begin
  insert into sales (store_id, total, payment_type, customer_id,
                     is_offline_replay, occurred_at, cashier_id)
  select s.id, 100, 'credit',
         (select id from customers where store_id = s.id limit 1),
         true, now() - interval '2 hours',
         'fb800000-0000-4000-8000-000000000002'
  from stores s where s.name = 'Never Had It';
  return 'accepted';
exception when others then
  return sqlerrm;
end;
$$;

select is(
  pg_temp.try_never(),
  'FEATURE_NOT_ENABLED: pos.utang',
  'a store that never held pos.utang is exempt from nothing -- no grant row, '
  || 'nothing to have predated'
);

select * from finish();
rollback;
