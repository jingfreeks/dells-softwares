-- =============================================================================
-- pgTAP · Tenant isolation -- the invariant the whole product rests on
--
-- Architecture §30 names this as the first security test: "Tenant A cannot
-- read Tenant B". Nothing asserted it until now. Every other guard in this
-- suite protects a feature; this one protects the premise that one shop
-- cannot see another shop's sales, customers, costs or staff.
--
-- Two real tenants are created the way production creates them -- an
-- auth.users insert, letting handle_new_user() build the store and its admin
-- -- then each table is checked from inside tenant A's session:
--
--   * A sees its own row          (the policy is not simply denying everything)
--   * A sees NONE of B's rows     (the isolation itself)
--   * A cannot write into B       (isolation holds for writes, not just reads)
--
-- The first of those matters as much as the second: a policy that denied
-- everyone would sail through a leak test while breaking the product, so
-- every table is asserted in both directions.
--
-- Run: psql -f supabase/tests/130_tenant_isolation.sql
-- =============================================================================
begin;
set local search_path = public, core, extensions;
select * from no_plan();

create or replace function pg_temp.act_as(p_user uuid)
returns void language sql as $$
  select set_config('request.jwt.claims',
                    json_build_object('sub', p_user, 'role', 'authenticated')::text, true);
$$;

-- Two tenants, created exactly as a real signup does.
insert into auth.users (id, email, raw_user_meta_data) values
  ('d1000000-0000-4000-8000-00000000a001', 'iso.a@test.local',
   '{"store_name":"Isolation Store A","owner_name":"Owner A"}'),
  ('d2000000-0000-4000-8000-00000000b001', 'iso.b@test.local',
   '{"store_name":"Isolation Store B","owner_name":"Owner B"}');

-- Bake both store ids into literal-returning functions while still owner.
-- This is the point: once acting as tenant A, `select id from stores` can no
-- longer resolve B at all -- so a test that looked B up at query time would
-- be comparing against NULL and would pass no matter how broken RLS was.
do $$
declare v_a uuid; v_b uuid;
begin
  select id into v_a from stores where name = 'Isolation Store A';
  select id into v_b from stores where name = 'Isolation Store B';
  execute format(
    'create or replace function pg_temp.id_a() returns uuid language sql immutable as $f$ select %L::uuid $f$', v_a);
  execute format(
    'create or replace function pg_temp.id_b() returns uuid language sql immutable as $f$ select %L::uuid $f$', v_b);
end $$;

-- Comparable data on both sides, inserted as owner so RLS is not in the way
-- of the fixtures themselves.
-- handle_new_user() already seeds one "Uncategorized" category per store,
-- so these reuse it rather than adding a second and making the per-tenant
-- counts below ambiguous.
insert into products (store_id, category_id, name, price, stock)
  values (pg_temp.id_a(),
          (select id from categories where store_id = pg_temp.id_a() limit 1),
          'Product A', 10, 5),
         (pg_temp.id_b(),
          (select id from categories where store_id = pg_temp.id_b() limit 1),
          'Product B', 10, 5);
insert into customers (store_id, name, credit_limit, balance)
  values (pg_temp.id_a(), 'Customer A', 500, 0), (pg_temp.id_b(), 'Customer B', 500, 0);
insert into suppliers (store_id, name)
  values (pg_temp.id_a(), 'Supplier A'), (pg_temp.id_b(), 'Supplier B');
insert into sales (store_id, cashier_id, total)
  values (pg_temp.id_a(), 'd1000000-0000-4000-8000-00000000a001', 100),
         (pg_temp.id_b(), 'd2000000-0000-4000-8000-00000000b001', 200);

-- Grants as a real Supabase project has them, so `authenticated` is stopped
-- by RLS rather than by a missing table grant, which would prove nothing.
grant select, insert, update, delete on all tables in schema public to authenticated;

set local role authenticated;
select pg_temp.act_as('d1000000-0000-4000-8000-00000000a001');

-- -----------------------------------------------------------------------------
-- Each tenant-scoped table: A sees its own, and none of B's
-- -----------------------------------------------------------------------------
select is((select count(*)::int from stores), 1, 'stores: A sees exactly one');
select is((select name from stores), 'Isolation Store A', 'stores: and it is their own');

select is((select count(*)::int from products),   1, 'products: A sees only their own');
select is((select count(*)::int from categories), 1, 'categories: A sees only their own');
select is((select count(*)::int from customers),  1, 'customers: A sees only their own');
select is((select count(*)::int from suppliers),  1, 'suppliers: A sees only their own');
select is((select count(*)::int from warehouses), 1, 'warehouses: A sees only their own');
select is((select count(*)::int from staff),      1, 'staff: A sees only their own roster');
select is((select count(*)::int from sales),      1, 'sales: A sees only their own');

-- Naming B's id outright is the real attack: a client that has somehow
-- learned another organization's id must still come away with nothing.
select is_empty($$ select 1 from products   where store_id = pg_temp.id_b() $$,
  'products: naming B''s id explicitly returns nothing');
select is_empty($$ select 1 from customers  where store_id = pg_temp.id_b() $$,
  'customers: naming B''s id explicitly returns nothing');
select is_empty($$ select 1 from sales      where store_id = pg_temp.id_b() $$,
  'sales: naming B''s id explicitly returns nothing');
select is_empty($$ select 1 from suppliers  where store_id = pg_temp.id_b() $$,
  'suppliers: naming B''s id explicitly returns nothing');
select is_empty($$ select 1 from stores     where id       = pg_temp.id_b() $$,
  'stores: B is not even visible as a row');

-- -----------------------------------------------------------------------------
-- Writes: isolation is not read-only
-- -----------------------------------------------------------------------------
select throws_ok($$
  insert into products (store_id, name, price, stock)
  values (pg_temp.id_b(), 'Injected', 1, 1)
$$, '42501', null, 'products: A cannot insert into B');

select throws_ok($$
  insert into customers (store_id, name, credit_limit, balance)
  values (pg_temp.id_b(), 'Injected', 100, 0)
$$, '42501', null, 'customers: A cannot insert into B');

-- An UPDATE against invisible rows is not an error; it simply matches
-- nothing. Asserting the row is untouched is what proves it.
select lives_ok($$ update products set price = 9999 where store_id = pg_temp.id_b() $$,
  'products: updating B raises no error (the rows are invisible)');

reset role;
select is((select price::int from products where store_id = pg_temp.id_b()), 10,
  'products: and B''s price is unchanged -- the UPDATE matched zero rows');

-- -----------------------------------------------------------------------------
-- Symmetry: the same holds from B's side, so this is not an artefact of
-- which tenant happened to be created first.
-- -----------------------------------------------------------------------------
set local role authenticated;
select pg_temp.act_as('d2000000-0000-4000-8000-00000000b001');

select is((select name from stores), 'Isolation Store B', 'stores: B sees their own');
select is((select count(*)::int from products), 1, 'products: B sees only their own');
select is_empty($$ select 1 from sales where store_id = pg_temp.id_a() $$,
  'sales: B cannot read A either');

-- -----------------------------------------------------------------------------
-- A signed-in user with no staff row is a member of nothing.
-- -----------------------------------------------------------------------------
reset role;
insert into auth.users (id, email) values
  ('d3000000-0000-4000-8000-00000000c001', 'iso.outsider@test.local');
delete from staff where id = 'd3000000-0000-4000-8000-00000000c001';

set local role authenticated;
select pg_temp.act_as('d3000000-0000-4000-8000-00000000c001');
select is((select count(*)::int from stores),   0, 'outsider: sees no stores');
select is((select count(*)::int from products), 0, 'outsider: sees no products');
select is((select count(*)::int from sales),    0, 'outsider: sees no sales');
reset role;

select * from finish();
rollback;
