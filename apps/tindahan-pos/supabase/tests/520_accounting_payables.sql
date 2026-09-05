-- =============================================================================
-- pgTAP · Deliveries, payables and settlement
--
--   * a delivery posts DR Inventory / CR Accounts Payable, once
--   * marking it paid posts DR Accounts Payable / CR Cash, once
--   * a settlement is never posted before its receipt is
--   * due dates come from the supplier's payment terms
--   * a delivery with no priced lines produces no entry rather than a pair of
--     zero-value lines
--
-- Run: psql -f supabase/tests/520_accounting_payables.sql
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
  ('acc60000-0000-4000-8000-000000000001', 'ap.owner@test.local',
   '{"store_name":"Payables Store","owner_name":"Owner"}');

create or replace function pg_temp.org() returns uuid language sql as $$
  select id from stores where name = 'Payables Store'
$$;

insert into core.organization_modules (organization_id, module_code, enabled, source)
select pg_temp.org(), 'ACCOUNTING', true, 'MANUAL'
on conflict (organization_id, module_code) do update set enabled = true;

insert into categories (store_id, name) select pg_temp.org(), 'Test';
insert into products (store_id, category_id, name, price, cost, stock)
select pg_temp.org(), c.id, 'Asukal', 60, 40, 0 from categories c where c.store_id = pg_temp.org();
insert into suppliers (store_id, name, payment_terms)
values (pg_temp.org(), 'Aling Nena Trading', '15_days'),
       (pg_temp.org(), 'Cash Only Supplier', 'cash');

create or replace function pg_temp.supplier(p_name text) returns uuid language sql as $$
  select id from suppliers where store_id = pg_temp.org() and name = p_name
$$;

create or replace function pg_temp.deliver(
  p_supplier uuid, p_value numeric, p_days_ago integer, p_paid boolean default false
) returns uuid language plpgsql security definer as $$
declare v_id uuid;
begin
  insert into receiving_entries (store_id, supplier_id, warehouse_id, supplier, received_on,
                                 created_by, paid, paid_at)
  select pg_temp.org(), p_supplier, w.id, 'legacy text', current_date - p_days_ago,
         'acc60000-0000-4000-8000-000000000001', p_paid,
         case when p_paid then now() end
    from warehouses w where w.store_id = pg_temp.org() and w.is_default limit 1
  returning id into v_id;

  insert into receiving_lines (receiving_entry_id, product_id, product_name, quantity, cost_each)
  select v_id, id, 'Asukal', 1, p_value from products where store_id = pg_temp.org() limit 1;
  return v_id;
end $$;

set local role authenticated;
select pg_temp.act_as('acc60000-0000-4000-8000-000000000001');

select public.seed_accounting_chart();
select public.open_accounting_period('NOW', current_date - 400, current_date + 30);

create or replace function pg_temp.bal(p_code text) returns numeric language sql as $$
  select coalesce(sum(l.debit - l.credit), 0)
    from accounting.journal_lines l
    join accounting.accounts a on a.id = l.account_id
    join accounting.journal_entries e on e.id = l.entry_id
   where a.organization_id = pg_temp.org() and a.code = p_code and e.status in ('POSTED','REVERSED')
$$;

-- -----------------------------------------------------------------------------
-- 1 · A delivery raises a payable
-- -----------------------------------------------------------------------------
select lives_ok(
  $$ select pg_temp.deliver(pg_temp.supplier('Aling Nena Trading'), 1000, 20) $$,
  'a ₱1,000 delivery on 15-day terms, 20 days ago'
);

select is(
  (select received from public.post_purchases_to_journal(current_date - 30, current_date)), 1,
  'it posts'
);
select is(pg_temp.bal('1040'), 1000::numeric, 'Inventory is debited');
select is(pg_temp.bal('2010'), -1000::numeric, 'and Accounts Payable is credited');

select is(
  (select received from public.post_purchases_to_journal(current_date - 30, current_date)), 0,
  'running it again posts nothing'
);

-- -----------------------------------------------------------------------------
-- 2 · Aging runs from the DUE date, not the delivery date
-- -----------------------------------------------------------------------------
select is(
  (select outstanding from public.my_payables() where supplier_name = 'Aling Nena Trading'),
  1000::numeric, 'it is outstanding'
);

select is(
  (select d1_30 from public.my_payables() where supplier_name = 'Aling Nena Trading'),
  1000::numeric,
  'delivered 20 days ago on 15-day terms, so it fell due 5 days ago and sits '
  'in 1-30 -- aging a payable from the delivery date would call it 20 days late '
  'when the supplier agreed to wait 15 of them'
);

select lives_ok(
  $$ select pg_temp.deliver(pg_temp.supplier('Aling Nena Trading'), 500, 3) $$,
  'a second delivery, 3 days ago'
);

select is(
  (select not_yet_due from public.my_payables() where supplier_name = 'Aling Nena Trading'),
  500::numeric,
  'which is not yet due, because 15-day terms have 12 days left to run'
);

select is(
  (select deliveries from public.my_payables() where supplier_name = 'Aling Nena Trading'),
  2, 'both deliveries are counted'
);

-- -----------------------------------------------------------------------------
-- 3 · A supplier with cash terms is due on receipt
-- -----------------------------------------------------------------------------
select lives_ok(
  $$ select pg_temp.deliver(pg_temp.supplier('Cash Only Supplier'), 200, 2) $$,
  'a delivery from a cash-terms supplier 2 days ago'
);

select is(
  (select d1_30 from public.my_payables() where supplier_name = 'Cash Only Supplier'),
  200::numeric,
  'due on receipt, so already 2 days overdue'
);

-- -----------------------------------------------------------------------------
-- 4 · Marking a delivery paid settles the payable
-- -----------------------------------------------------------------------------
select is(
  (select received from public.post_purchases_to_journal(current_date - 30, current_date)), 2,
  'the two newer deliveries post'
);

reset role;
update receiving_entries set paid = true, paid_at = now()
 where store_id = pg_temp.org()
   and id = (select id from receiving_entries where store_id = pg_temp.org()
              order by received_on limit 1);
set local role authenticated;
select pg_temp.act_as('acc60000-0000-4000-8000-000000000001');

select is(
  (select settled from public.post_purchases_to_journal(current_date - 30, current_date)), 1,
  'the settlement posts'
);
select is(pg_temp.bal('2010'), -700::numeric, 'Accounts Payable drops by the ₱1,000 paid');
select is(pg_temp.bal('1010'), -1000::numeric, 'and Cash on Hand is credited');

select is(
  (select settled from public.post_purchases_to_journal(current_date - 30, current_date)), 0,
  'and settling it again posts nothing'
);

select is(
  (select count(*)::int from public.my_payables() where supplier_name = 'Aling Nena Trading'), 1,
  'the supplier is still owed for the other delivery'
);

-- -----------------------------------------------------------------------------
-- 5 · A settlement is never posted before its receipt
-- -----------------------------------------------------------------------------
-- 500 days back, where the open period starts 400 days back -- so the receipt
-- cannot post, and the settlement must not post either.
select lives_ok(
  $$ select pg_temp.deliver(pg_temp.supplier('Cash Only Supplier'), 300, 500, true) $$,
  'a delivery paid on arrival, but dated outside every open period'
);

select is(
  (select settled from public.post_purchases_to_journal(current_date - 600, current_date)), 0,
  'its settlement is not posted, because its receipt could not be -- crediting '
  'cash against a payable that was never raised would unbalance the books'
);

-- -----------------------------------------------------------------------------
-- 6 · A delivery with no priced lines has no accounting effect
-- -----------------------------------------------------------------------------
reset role;
-- receiving_entries.supplier is NOT NULL: the free-text name predates
-- supplier_id and every row still carries one.
insert into receiving_entries (store_id, supplier_id, warehouse_id, supplier, received_on, created_by)
select pg_temp.org(), pg_temp.supplier('Cash Only Supplier'), w.id, 'Cash Only Supplier',
       current_date, 'acc60000-0000-4000-8000-000000000001'
  from warehouses w where w.store_id = pg_temp.org() and w.is_default limit 1;
set local role authenticated;
select pg_temp.act_as('acc60000-0000-4000-8000-000000000001');

select is(
  (select received from public.post_purchases_to_journal(current_date - 30, current_date)), 0,
  'a delivery with nothing priced on it produces no entry, rather than a pair '
  'of zero-value lines saying nothing'
);

-- -----------------------------------------------------------------------------
-- 7 · Entitlement
-- -----------------------------------------------------------------------------
reset role;
update core.organization_modules set enabled = false
 where organization_id = pg_temp.org() and module_code = 'ACCOUNTING';
set local role authenticated;
select pg_temp.act_as('acc60000-0000-4000-8000-000000000001');

select throws_ok(
  $$ select public.post_purchases_to_journal(current_date - 30, current_date) $$,
  'P0001', 'MODULE_NOT_AVAILABLE', 'a store without the module posts nothing'
);

select isnt_empty(
  $$ select 1 from public.my_payables() $$, 'but still reads its payables -- §08'
);

select * from finish();
rollback;
