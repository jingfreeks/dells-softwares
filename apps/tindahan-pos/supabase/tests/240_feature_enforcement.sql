-- =============================================================================
-- pgTAP · Feature enforcement, server-side
--
-- The client hides a feature it does not hold. That is UX. This file is about
-- the half that matters: what happens when someone asks anyway, with the anon
-- key that ships in the bundle and a request the UI would never send.
--
-- The properties, in the order they would hurt if wrong:
--
--   1. it is a NO-OP today -- every tenant holds everything, so nothing here
--      can refuse anything until a feature is deliberately turned off
--   2. turning one off actually refuses the write
--   3. it refuses WRITES ONLY -- §08's "data is never destroyed on downgrade"
--      has to keep holding, so the tenant can still read what they made
--   4. one tenant's entitlement never decides another's
--
-- Run: psql -f supabase/tests/240_feature_enforcement.sql
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
  ('ea200000-0000-4000-8000-000000000001', 'enf.one@test.local',
   '{"store_name":"Enforce One","owner_name":"One"}'),
  ('eb200000-0000-4000-8000-000000000002', 'enf.two@test.local',
   '{"store_name":"Enforce Two","owner_name":"Two"}');

create or replace function pg_temp.org() returns uuid language sql as $$
  select id from stores where name = 'Enforce One'
$$;
create or replace function pg_temp.org2() returns uuid language sql as $$
  select id from stores where name = 'Enforce Two'
$$;

-- Both stores provision onto BASIC, which since 20260815113000 does not sell
-- purchase orders -- those start at PRO. This file is about ENFORCEMENT
-- mechanics, not about which tier owns what, so it grants the feature
-- outright and then tests what happens when it is taken away again. Keeping
-- the two concerns apart means a later pricing change edits 250_tier_split.sql
-- and leaves this file alone.
insert into core.organization_features (organization_id, feature_code, enabled, source)
select o.id, 'inventory.purchase_orders', true, 'MANUAL'
from core.organizations o
where o.id in (pg_temp.org(), pg_temp.org2())
on conflict (organization_id, feature_code)
do update set enabled = true, source = 'MANUAL';

-- Something to still be able to read after the feature is revoked, and
-- something to actually sell -- checkout_sale refuses an empty catalogue
-- before it ever reaches the entitlement check.
insert into customers (store_id, name) select pg_temp.org(), 'Aling Rosa';
insert into products (store_id, name, price, stock, category_id)
select pg_temp.org(), 'Sardinas', 22, 100, c.id
from categories c where c.store_id = pg_temp.org() limit 1;

-- -----------------------------------------------------------------------------
-- 1. A no-op today
-- -----------------------------------------------------------------------------
set local role authenticated;
select pg_temp.act_as('ea200000-0000-4000-8000-000000000001');

select ok(public.current_store_has_feature('pos.utang'),
  'the store holds utang to begin with');

-- Through checkout_sale(), which is the only way a sale is ever written:
-- `sales` carries no INSERT policy at all, so a direct insert is refused by
-- RLS regardless of entitlement. Testing the real path also means the trigger
-- is exercised the way production reaches it.
select lives_ok($$
  select checkout_sale(
    jsonb_build_array(jsonb_build_object(
      'product_id', (select id from products where store_id = pg_temp.org() limit 1),
      'quantity', 1)),
    '[]'::jsonb,
    (select id from customers where store_id = pg_temp.org() limit 1),
    'credit')
$$, 'so a credit sale goes through -- enforcement changes nothing today');

select lives_ok($$
  insert into purchase_orders (store_id, warehouse_id, status, created_by)
  select pg_temp.org(), w.id, 'draft', auth.uid()
  from warehouses w where w.store_id = pg_temp.org() and w.is_default limit 1
$$, 'and so does a purchase order, for a store that holds the feature');

reset role;

-- -----------------------------------------------------------------------------
-- 2. Turning it off refuses the write
-- -----------------------------------------------------------------------------
update core.organization_features set enabled = false, source = 'MANUAL'
 where organization_id = pg_temp.org() and feature_code = 'pos.utang';

set local role authenticated;
select pg_temp.act_as('ea200000-0000-4000-8000-000000000001');

select ok(not public.current_store_has_feature('pos.utang'),
  'utang is now withheld');

select throws_ok($$
  select checkout_sale(
    jsonb_build_array(jsonb_build_object(
      'product_id', (select id from products where store_id = pg_temp.org() limit 1),
      'quantity', 1)),
    '[]'::jsonb,
    (select id from customers where store_id = pg_temp.org() limit 1),
    'credit')
$$, 'P0001', 'FEATURE_NOT_ENABLED: pos.utang',
   'a credit sale is refused, naming the feature rather than an opaque denial');

-- The trigger covers every path into `sales`, not just checkout_sale -- which
-- is the reason it is a trigger and not a guard inside that function.
select throws_ok($$
  insert into credit_payments (store_id, customer_id, amount, created_by)
  select pg_temp.org(), c.id, 10, 'ea200000-0000-4000-8000-000000000001'
  from customers c where c.store_id = pg_temp.org() limit 1
$$, 'P0001', 'FEATURE_NOT_ENABLED: pos.utang',
   'and so is collecting against an utang balance -- the other half of the same capability');

-- -----------------------------------------------------------------------------
-- 3. WRITES ONLY. §08: data is never destroyed on downgrade.
-- -----------------------------------------------------------------------------
select isnt_empty($$ select 1 from customers where store_id = pg_temp.org() $$,
  'their customers are still readable');
select isnt_empty($$ select 1 from sales where store_id = pg_temp.org() and payment_type = 'credit' $$,
  'and the credit sales they already made are still there');

-- A cash sale is untouched: revoking utang must not stop the shop selling.
select lives_ok($$
  select checkout_sale(
    jsonb_build_array(jsonb_build_object(
      'product_id', (select id from products where store_id = pg_temp.org() limit 1),
      'quantity', 1)),
    '[]'::jsonb, null, 'cash')
$$, 'and they can still sell for cash -- the till never stops');

reset role;

-- -----------------------------------------------------------------------------
-- 4. One tenant's entitlement is not another's
-- -----------------------------------------------------------------------------
set local role authenticated;
select pg_temp.act_as('eb200000-0000-4000-8000-000000000002');

select ok(public.current_store_has_feature('pos.utang'),
  'the second store still holds utang');
select lives_ok($$
  insert into customers (store_id, name) select pg_temp.org2(), 'Mang Tonio'
$$, 'and can still work with credit customers');

reset role;

-- -----------------------------------------------------------------------------
-- The inventory features, gated by policy rather than trigger
-- -----------------------------------------------------------------------------
update core.organization_features set enabled = false, source = 'MANUAL'
 where organization_id = pg_temp.org() and feature_code = 'inventory.purchase_orders';

set local role authenticated;
select pg_temp.act_as('ea200000-0000-4000-8000-000000000001');

select throws_ok($$
  insert into purchase_orders (store_id, warehouse_id, status, created_by)
  select pg_temp.org(), w.id, 'draft', auth.uid()
  from warehouses w where w.store_id = pg_temp.org() and w.is_default limit 1
$$, '42501', null, 'a purchase order is refused once the feature is withheld');

select isnt_empty($$ select 1 from purchase_orders where store_id = pg_temp.org() $$,
  'while the orders already raised remain readable');

reset role;

-- -----------------------------------------------------------------------------
-- inventory.transfers -- guarded by a trigger for the same reason utang is:
-- warehouse_transfers has no INSERT policy, so transfer_stock() is the only
-- way in, and restating 95 lines of stock arithmetic to add one condition is
-- the riskier option.
-- -----------------------------------------------------------------------------
insert into warehouses (store_id, name, is_default)
select pg_temp.org(), 'Back Room', false;

update core.organization_features set enabled = false, source = 'MANUAL'
 where organization_id = pg_temp.org() and feature_code = 'inventory.transfers';

set local role authenticated;
select pg_temp.act_as('ea200000-0000-4000-8000-000000000001');

select throws_ok($$
  select transfer_stock(
    (select id from warehouses where store_id = pg_temp.org() and is_default limit 1),
    (select id from warehouses where store_id = pg_temp.org() and not is_default limit 1),
    (select id from products where store_id = pg_temp.org() limit 1), 1)
$$, 'P0001', 'FEATURE_NOT_ENABLED: inventory.transfers',
   'a stock transfer is refused when the feature is withheld');

select isnt_empty($$ select 1 from warehouses where store_id = pg_temp.org() $$,
  'and the warehouses themselves are untouched -- writes only, again');

reset role;
select * from finish();
rollback;
