-- =============================================================================
-- pgTAP · The cashier cash-out cap is enforced where the cash actually moves
--
-- Settings -> Fees & limits has rendered a "Cashier cash-out cap" number
-- field since the fees/limits redesign, saved only to feesLimitsMock.ts's
-- localStorage, and the Staff page's CashierPermissionCard has hardcoded
-- "needs PIN" regardless of what it was set to. checkout_sale() never learned
-- the actual cash-out amount at all -- a cash-out service line has always
-- carried only the store's fee revenue, never the cash physically handed
-- over, which lived solely in the browser's local drawer arithmetic.
--
-- The property under test: a p_services row now MAY carry service_type and
-- cash_handed_over; when the sum of cash_handed_over across cashout-typed
-- lines exceeds stores.cashier_cash_out_cap (null = no cap), a non-admin
-- caller needs the same admin-PIN token the credit-limit override and
-- void_requires_pin use. An old client that never sends the new keys keeps
-- working exactly as before, whatever the amount, because there is nothing
-- for the cap check to sum.
--
-- Run: psql -f supabase/tests/440_cashier_cash_out_cap.sql
-- =============================================================================
begin;
set local search_path = public, core, extensions;
select * from no_plan();

create or replace function pg_temp.act_as(p_user uuid)
returns void language sql as $$
  select set_config('request.jwt.claims',
                    json_build_object('sub', p_user, 'role', 'authenticated')::text, true);
$$;

insert into auth.users (id, email, raw_user_meta_data) values
  ('0f000000-0000-4000-8000-00000000a001', 'cashout.owner@test.local',
   '{"store_name":"Cash Out Cap Store","owner_name":"Cap Owner"}');

create temporary table t_store as
  select id from stores where name = 'Cash Out Cap Store';
grant select on t_store to authenticated;

create or replace function pg_temp.store() returns uuid language sql as $$
  select id from t_store
$$;

-- Captured into a temp table while still postgres, and read from there.
-- Reading `staff` inside the helper breaks the moment the suite drops to
-- `authenticated`: RLS scopes that table to the caller's own store, and the
-- helper is called to SET the caller -- so it returns null and every later
-- assertion fails with "Not a registered staff member of any store".
create temporary table t_owner as
  select id from staff where store_id = pg_temp.store() and role = 'admin';
grant select on t_owner to authenticated;

create or replace function pg_temp.owner() returns uuid language sql as $$
  select id from t_owner
$$;

update staff set pin_hash = crypt('4321', gen_salt('bf')) where id = pg_temp.owner();

insert into auth.users (id, email, raw_user_meta_data) values
  ('0f000000-0000-4000-8000-00000000a002', 'cashout.throwaway@test.local',
   '{"store_name":"Throwaway","owner_name":"Supervisor"}');
delete from stores where id = (
  select store_id from staff where id = '0f000000-0000-4000-8000-00000000a002');
insert into staff (id, store_id, name, email, role)
  select '0f000000-0000-4000-8000-00000000a002', pg_temp.store(), 'Supervisor', 'cashout.throwaway@test.local', 'cashier';

set local role authenticated;
select pg_temp.act_as(pg_temp.owner());
select assign_staff_role('0f000000-0000-4000-8000-00000000a002', 'SUPERVISOR');

-- A cash-out service line, shaped exactly as CashOutServicePanel/hooks.tsx
-- send it: amount is the store's fee revenue (what actually adds to the
-- sale total), cash_handed_over is the separate, larger figure the cap
-- compares against.
create or replace function pg_temp.cashout(p_fee numeric, p_handed_over numeric) returns jsonb language sql as $$
  select jsonb_build_array(jsonb_build_object(
    'label', 'GCash cash-out',
    'amount', p_fee,
    'fee', 0,
    'service_type', 'cashout',
    'cash_handed_over', p_handed_over
  ))
$$;

-- An old-shaped service line: same cash-out in substance, but without the
-- two new keys -- what a client that has not yet shipped this change sends.
create or replace function pg_temp.legacy_cashout(p_fee numeric) returns jsonb language sql as $$
  select jsonb_build_array(jsonb_build_object('label', 'GCash cash-out', 'amount', p_fee, 'fee', 0))
$$;

-- -----------------------------------------------------------------------------
-- No cap set (the default): any amount goes through without a token.
-- -----------------------------------------------------------------------------
select is(
  (select cashier_cash_out_cap from stores where id = pg_temp.store()),
  null,
  'cashier_cash_out_cap defaults to unset'
);

select pg_temp.act_as('0f000000-0000-4000-8000-00000000a002');
select lives_ok($$
  select checkout_sale('[]'::jsonb, pg_temp.cashout(15, 5000))
$$, 'no cap configured: a large cash-out goes through without a token');

-- -----------------------------------------------------------------------------
-- A cap is set: over it needs a token, under it does not.
-- -----------------------------------------------------------------------------
select pg_temp.act_as(pg_temp.owner());
update stores set cashier_cash_out_cap = 1000 where id = pg_temp.store();

select pg_temp.act_as('0f000000-0000-4000-8000-00000000a002');
select lives_ok($$
  select checkout_sale('[]'::jsonb, pg_temp.cashout(10, 800))
$$, 'under the cap: no token needed');

select throws_ok($$
  select checkout_sale('[]'::jsonb, pg_temp.cashout(15, 1500))
$$, 'P0001', 'CASH_OUT_CAP_EXCEEDED',
   'over the cap: refused without a token');

select lives_ok($$
  select checkout_sale('[]'::jsonb, pg_temp.cashout(15, 1500),
                        p_override_token => (select override_token from check_credit_override_pin('4321')))
$$, 'over the cap: the owner-approved token lets it through');

-- -----------------------------------------------------------------------------
-- Multiple cash-out lines in one sale are summed before comparing to the cap
-- -----------------------------------------------------------------------------
select throws_ok($$
  select checkout_sale('[]'::jsonb,
    (select pg_temp.cashout(5, 600) || pg_temp.cashout(5, 600)))
$$, 'P0001', 'CASH_OUT_CAP_EXCEEDED',
   'two lines under the cap individually (600 + 600 = 1200) are summed and still refused without a token');

-- -----------------------------------------------------------------------------
-- The fee, not the cash handed over, is what lands in the sale total --
-- cash_handed_over is purely an input to the cap check.
-- -----------------------------------------------------------------------------
select is(
  (select total from checkout_sale('[]'::jsonb, pg_temp.cashout(12, 700))),
  12::numeric,
  'the sale total is the fee revenue, not the (uncapped) cash handed over'
);

-- -----------------------------------------------------------------------------
-- An Owner is exempt, same rationale as void_requires_pin.
-- -----------------------------------------------------------------------------
select pg_temp.act_as(pg_temp.owner());
select lives_ok($$
  select checkout_sale('[]'::jsonb, pg_temp.cashout(20, 5000))
$$, 'an Owner processing their own store''s cash-out is exempt from the cap');

-- -----------------------------------------------------------------------------
-- An old client that never sends service_type/cash_handed_over is
-- unaffected by the cap, whatever the amount -- there is nothing to sum.
-- -----------------------------------------------------------------------------
select pg_temp.act_as('0f000000-0000-4000-8000-00000000a002');
select lives_ok($$
  select checkout_sale('[]'::jsonb, pg_temp.legacy_cashout(50))
$$, 'a service line without service_type is not treated as a cash-out, cap or no cap');

-- -----------------------------------------------------------------------------
-- A negative cash_handed_over can't be used to net a large one out
-- -----------------------------------------------------------------------------
select pg_temp.act_as('0f000000-0000-4000-8000-00000000a002');
select throws_ok($$
  select checkout_sale('[]'::jsonb,
    (select pg_temp.cashout(15, 5000) || pg_temp.cashout(0, -4500)))
$$, 'P0001', 'CASH_OUT_CAP_EXCEEDED',
   'a fabricated negative cash_handed_over on a second line does not offset the first and slip under the cap');

select * from finish();
rollback;
