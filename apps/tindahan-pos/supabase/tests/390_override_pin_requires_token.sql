-- =============================================================================
-- pgTAP · The credit-override PIN cannot be guessed through the replay path
--
-- 20260815147000 moved the override-PIN check out of checkout_sale() because a
-- failed-attempt counter incremented inside a function that then raises is
-- rolled back with the transaction. It left the offline-replay branch on the
-- raw PIN deliberately, and recorded that hardening p_is_offline_replay was
-- pre-existing and separate.
--
-- What makes it not merely separate: p_is_offline_replay is an ordinary
-- parameter with a default. Nothing establishes that a call claiming to be a
-- replay is one. So the raw-PIN branch was reachable by any authenticated
-- staff member, while fully online, as many times as they liked -- an
-- unlimited oracle against an admin's PIN, with the live path's lockout
-- bypassed by setting a boolean.
--
-- The property under test is that both paths now go through the rate-limited
-- exchange, and -- the half that would otherwise be missed -- that a wrong
-- guess made through the replay path is actually COUNTED. A guard that
-- refuses the raw PIN but still cannot count attempts has moved the oracle,
-- not closed it.
--
-- Run: psql -f supabase/tests/390_override_pin_requires_token.sql
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
  ('0d000000-0000-4000-8000-00000000e001', 'override.owner@test.local',
   '{"store_name":"Override Store","owner_name":"Override Owner"}');

create or replace function pg_temp.store() returns uuid language sql as $$
  select id from stores where name = 'Override Store'
$$;

-- The approver's PIN. Set here rather than through admin_set_staff_pin() so
-- the test does not depend on that function's own rules.
update staff set pin_hash = crypt('1234', gen_salt('bf'))
 where store_id = pg_temp.store() and role = 'admin';

-- A limit low enough that one sardine can breaches it.
insert into customers (store_id, name, credit_limit, balance)
  select pg_temp.store(), 'Aling Rosa', 10, 0;

insert into products (store_id, name, price, stock, category_id)
  select pg_temp.store(), 'Sardinas', 22, 100, c.id
    from categories c where c.store_id = pg_temp.store() limit 1;

create or replace function pg_temp.cart() returns jsonb language sql as $$
  select jsonb_build_array(jsonb_build_object(
    'product_id', (select id from products where store_id = pg_temp.store() limit 1),
    'quantity', 1))
$$;

create or replace function pg_temp.customer() returns uuid language sql as $$
  select id from customers where store_id = pg_temp.store() limit 1
$$;

set local role authenticated;
select pg_temp.act_as('0d000000-0000-4000-8000-00000000e001');

-- -----------------------------------------------------------------------------
-- The raw PIN no longer opens the replay path -- even when it is correct
-- -----------------------------------------------------------------------------
select throws_ok($$
  select checkout_sale(pg_temp.cart(), '[]'::jsonb, pg_temp.customer(), 'credit',
                       p_override_pin => '1234', p_is_offline_replay => true)
$$, 'P0001', 'CREDIT_LIMIT_EXCEEDED',
   'the CORRECT PIN is refused on the replay path -- there is no raw-PIN path left to guess against');

select throws_ok($$
  select checkout_sale(pg_temp.cart(), '[]'::jsonb, pg_temp.customer(), 'credit',
                       p_override_pin => '0000', p_is_offline_replay => true)
$$, 'P0001', 'CREDIT_LIMIT_EXCEEDED',
   'and so is a wrong one, without ever revealing which it was');

-- -----------------------------------------------------------------------------
-- The supported path: exchange the stored PIN, then replay with the token
-- -----------------------------------------------------------------------------
select is(
  (select ok from check_credit_override_pin('1234')),
  true,
  'the rate-limited exchange still accepts the approver PIN'
);

select lives_ok($$
  select checkout_sale(pg_temp.cart(), '[]'::jsonb, pg_temp.customer(), 'credit',
                       p_override_token => (select override_token from check_credit_override_pin('1234')),
                       p_is_offline_replay => true)
$$, 'and a replay carrying a token goes through -- the offline capture is not lost');

-- -----------------------------------------------------------------------------
-- The half that matters: a wrong guess is now COUNTED
-- -----------------------------------------------------------------------------
select is(
  (select override_pin_failed_attempts from staff where id = auth.uid()),
  0,
  'the successful exchange reset the counter'
);

select is(
  (select error_code from check_credit_override_pin('0000')),
  'INVALID_OVERRIDE_PIN',
  'a wrong PIN is rejected'
);

select is(
  (select override_pin_failed_attempts from staff where id = auth.uid()),
  1,
  'and the attempt PERSISTS -- which the raw-PIN path could never do, because a raise rolls its own counter back'
);

select * from finish();
rollback;
