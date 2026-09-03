-- =============================================================================
-- pgTAP · "Void needs PIN" is enforced where the void actually happens
--
-- Settings -> Fees & limits has rendered this toggle since the fees/limits
-- redesign, saved only to feesLimitsMock.ts's localStorage. void_sale() has
-- never read it, so turning it on or off changed nothing a Supervisor could
-- actually do -- CASHIER holds no permissions at all (0044's RBAC seed), so
-- the only role that can reach void_sale() besides OWNER is SUPERVISOR, and
-- SUPERVISOR could always void alone.
--
-- The property under test: with the toggle on, a Supervisor voiding needs a
-- validated admin-PIN token (the same one the credit-limit override and the
-- offline-replay hardening use); an Owner voiding does not, because the
-- toggle protects against a Supervisor acting unaccompanied, not against an
-- Owner approving their own action; and with the toggle off (the default),
-- nothing changes from before this migration.
--
-- Run: psql -f supabase/tests/430_void_requires_pin.sql
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
  ('0e000000-0000-4000-8000-00000000f001', 'void.owner@test.local',
   '{"store_name":"Void Pin Store","owner_name":"Void Owner"}');

create or replace function pg_temp.store() returns uuid language sql as $$
  select id from stores where name = 'Void Pin Store'
$$;

create or replace function pg_temp.owner() returns uuid language sql as $$
  select id from staff where store_id = pg_temp.store() and role = 'admin'
$$;

update staff set pin_hash = crypt('9999', gen_salt('bf')) where id = pg_temp.owner();

-- A Supervisor: staff.role stays 'cashier' (the RBAC seed's two-value
-- column), SUPERVISOR comes entirely from staff_roles/assign_staff_role,
-- same as 210_permission_unification.sql establishes.
insert into auth.users (id, email, raw_user_meta_data) values
  ('0e000000-0000-4000-8000-00000000f002', 'void.throwaway@test.local',
   '{"store_name":"Throwaway","owner_name":"Supervisor"}');
delete from stores where id = (
  select store_id from staff where id = '0e000000-0000-4000-8000-00000000f002');
insert into staff (id, store_id, name, email, role)
  select '0e000000-0000-4000-8000-00000000f002', pg_temp.store(), 'Supervisor', 'void.throwaway@test.local', 'cashier';

set local role authenticated;
select pg_temp.act_as(pg_temp.owner());
select assign_staff_role('0e000000-0000-4000-8000-00000000f002', 'SUPERVISOR');

insert into products (store_id, name, price, stock, category_id)
  select pg_temp.store(), 'Bigas 1kg', 60, 100, c.id
    from categories c where c.store_id = pg_temp.store() limit 1;

create or replace function pg_temp.cart() returns jsonb language sql as $$
  select jsonb_build_array(jsonb_build_object(
    'product_id', (select id from products where store_id = pg_temp.store() limit 1),
    'quantity', 1))
$$;

-- checkout_sale() returns a fresh row per call, so each sale used below is
-- captured by label rather than re-queried by a predicate that couldn't
-- otherwise tell them apart.
create temporary table pg_temp_void_sales (label text primary key, id uuid not null);

-- -----------------------------------------------------------------------------
-- Toggle off (the default): a Supervisor can still void alone -- this
-- migration changes nothing for a store that hasn't opted in.
-- -----------------------------------------------------------------------------
select is(
  (select void_requires_pin from stores where id = pg_temp.store()),
  false,
  'void_requires_pin defaults to off'
);

select pg_temp.act_as(pg_temp.owner());
insert into pg_temp_void_sales values ('1', (select sale_id from checkout_sale(pg_temp.cart())));

select pg_temp.act_as('0e000000-0000-4000-8000-00000000f002');
select lives_ok($$
  select void_sale((select id from pg_temp_void_sales where label = '1'), 'toggle is off')
$$, 'toggle off: Supervisor voids alone, exactly as before this migration');

-- -----------------------------------------------------------------------------
-- Toggle on: the same Supervisor now needs a token
-- -----------------------------------------------------------------------------
select pg_temp.act_as(pg_temp.owner());
update stores set void_requires_pin = true where id = pg_temp.store();
insert into pg_temp_void_sales values ('2', (select sale_id from checkout_sale(pg_temp.cart())));

select pg_temp.act_as('0e000000-0000-4000-8000-00000000f002');
select throws_ok($$
  select void_sale((select id from pg_temp_void_sales where label = '2'), 'no token yet')
$$, 'P0001', 'VOID_PIN_REQUIRED',
   'toggle on: a Supervisor voiding without a token is refused');

-- A wrong PIN never even reaches void_sale() as a token: the exchange
-- itself refuses it (and counts the attempt, same as the credit-limit
-- override path), so this is asserted at the exchange rather than guessed
-- at the void call.
select is(
  (select error_code from check_credit_override_pin('0000')),
  'INVALID_OVERRIDE_PIN',
  'a wrong owner PIN is refused at the exchange, same as the credit-limit override path'
);

select lives_ok($$
  select void_sale((select id from pg_temp_void_sales where label = '2'), 'owner approved',
                    (select override_token from check_credit_override_pin('9999')))
$$, 'toggle on: the correct owner PIN, exchanged for a token first, lets the Supervisor void');

select is(
  (select status from sales where id = (select id from pg_temp_void_sales where label = '2')),
  'voided',
  'and the sale is actually voided, not just approved'
);

-- -----------------------------------------------------------------------------
-- An Owner is exempt: the toggle guards a Supervisor acting alone, not an
-- Owner approving their own action.
-- -----------------------------------------------------------------------------
select pg_temp.act_as(pg_temp.owner());
insert into pg_temp_void_sales values ('3', (select sale_id from checkout_sale(pg_temp.cart())));
select lives_ok($$
  select void_sale((select id from pg_temp_void_sales where label = '3'), 'owner voids their own store')
$$, 'toggle on: an Owner voids without a token');

-- -----------------------------------------------------------------------------
-- An old client calling the original two-argument shape still works --
-- CREATE OR REPLACE grew the signature in place rather than replacing it.
-- -----------------------------------------------------------------------------
select pg_temp.act_as(pg_temp.owner());
update stores set void_requires_pin = false where id = pg_temp.store();
insert into pg_temp_void_sales values ('4', (select sale_id from checkout_sale(pg_temp.cart())));
select pg_temp.act_as('0e000000-0000-4000-8000-00000000f002');
select lives_ok($$
  select void_sale((select id from pg_temp_void_sales where label = '4'), 'two-argument call, toggle off')
$$, 'a two-argument void_sale(uuid, text) call still resolves and works');

select * from finish();
rollback;
