-- =============================================================================
-- pgTAP · Sales become journal entries
--
-- The properties worth pinning:
--
--   * cash, QR and credit debit three DIFFERENT accounts
--   * VAT is credited to a liability, not to revenue
--   * COGS uses the snapshot, and cost_coverage says how much of it did
--   * a sale posts once, however many times the function runs
--   * a sale voided after posting is reversed, not left overstating the ledger
--   * a sale in a closed period is skipped, not forced through
--
-- Run: psql -f supabase/tests/500_accounting_sales_integration.sql
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
  ('acc40000-0000-4000-8000-000000000001', 'sales.owner@test.local',
   '{"store_name":"Sales Store","owner_name":"Owner"}');

create or replace function pg_temp.org() returns uuid language sql as $$
  select id from stores where name = 'Sales Store'
$$;

insert into core.organization_modules (organization_id, module_code, enabled, source)
select pg_temp.org(), 'ACCOUNTING', true, 'MANUAL'
on conflict (organization_id, module_code) do update set enabled = true;

-- A product with a cost, and one whose cost is only known today.
insert into categories (store_id, name) select pg_temp.org(), 'Test';
insert into products (store_id, category_id, name, price, cost, stock)
select pg_temp.org(), c.id, 'Sardinas', 30, 20, 100 from categories c where c.store_id = pg_temp.org();

create or replace function pg_temp.product() returns uuid language sql as $$
  select id from products where store_id = pg_temp.org() and name = 'Sardinas'
$$;

-- Sales are inserted directly rather than through checkout_sale(), so the test
-- controls payment type, VAT and the cost snapshot exactly.
--
-- security definer, created while still postgres: `sales` has an RLS policy
-- that refuses a direct insert even from the store's own owner, because the
-- POS funnels every sale through checkout_sale(). That policy is not what this
-- suite is testing -- it is testing what accounting does with a sale that
-- already exists -- so the fixture writes as the owner rather than pretending
-- the policy is absent.
create or replace function pg_temp.make_sale(
  p_payment text, p_total numeric, p_vat numeric, p_snapshot numeric,
  p_on timestamptz default now()
) returns uuid language plpgsql security definer as $$
declare v_id uuid;
begin
  -- sales_qr_reference_required: the schema will not accept a QR sale without
  -- the payment reference, which is the right rule -- a QR payment nobody can
  -- trace back to a transfer is not evidence of anything.
  insert into sales (store_id, cashier_id, total, payment_type, status, created_at,
                     vat_amount, vatable_sales, vat_exempt_sales, zero_rated_sales, discount_amount,
                     reference_no)
  values (pg_temp.org(), 'acc40000-0000-4000-8000-000000000001', p_total, p_payment,
          'completed', p_on, p_vat, 0, 0, 0, 0,
          case when p_payment = 'qr' then 'GC-' || substr(gen_random_uuid()::text, 1, 8) end)
  returning id into v_id;
  insert into sale_items (sale_id, product_id, name, quantity, price, line_total, cost_at_sale)
  values (v_id, pg_temp.product(), 'Sardinas', 1, p_total, p_total, p_snapshot);
  return v_id;
end $$;

-- Same reason as make_sale: sale_items is closed to direct writes too.
create or replace function pg_temp.add_item(p_sale uuid, p_snapshot numeric, p_amount numeric)
returns void language sql security definer as $$
  insert into sale_items (sale_id, product_id, name, quantity, price, line_total, cost_at_sale)
  values (p_sale, pg_temp.product(), 'Extra', 1, p_amount, p_amount, p_snapshot);
$$;

set local role authenticated;
select pg_temp.act_as('acc40000-0000-4000-8000-000000000001');

select public.seed_accounting_chart();
select public.open_accounting_period('NOW', current_date - 60, current_date + 60);

create or replace function pg_temp.bal(p_code text) returns numeric language sql as $$
  select coalesce(sum(l.debit - l.credit), 0)
    from accounting.journal_lines l
    join accounting.accounts a on a.id = l.account_id
    join accounting.journal_entries e on e.id = l.entry_id
   where a.organization_id = pg_temp.org() and a.code = p_code and e.status in ('POSTED','REVERSED')
$$;

-- -----------------------------------------------------------------------------
-- 1 · The chart gained Output VAT
-- -----------------------------------------------------------------------------
select isnt_empty(
  $$ select 1 from public.my_accounting_accounts() where code = '2030' $$,
  'the seeder now installs 2030 Output VAT Payable -- VAT collected is money '
  'held for the BIR, not income'
);

-- -----------------------------------------------------------------------------
-- 2 · Three payment types, three different debit accounts
-- -----------------------------------------------------------------------------
select lives_ok(
  $$ select pg_temp.make_sale('cash', 100, 0, 20) $$, 'a cash sale exists'
);
select lives_ok(
  $$ select pg_temp.make_sale('qr', 200, 0, 20) $$, 'a QR sale exists'
);
select lives_ok(
  $$ select pg_temp.make_sale('credit', 300, 0, 20) $$, 'a credit sale exists'
);

select is(
  (select posted from public.post_sales_to_journal(current_date - 1, current_date + 1)),
  3,
  'all three post'
);

select is(pg_temp.bal('1010'), 100::numeric, 'the cash sale debits Cash on Hand');
select is(
  pg_temp.bal('1020'), 200::numeric,
  'the QR sale debits Cash in Bank -- money the shop has but cannot count in '
  'the drawer, so posting it to the till would make every drawer count read short'
);
select is(pg_temp.bal('1030'), 300::numeric, 'the credit sale debits Accounts Receivable');
select is(pg_temp.bal('4010'), -600::numeric, 'and all three credit Sales Revenue');

-- -----------------------------------------------------------------------------
-- 3 · COGS and inventory
-- -----------------------------------------------------------------------------
select is(pg_temp.bal('5010'), 60::numeric, 'COGS is debited from the cost snapshot');
select is(pg_temp.bal('1040'), -60::numeric, 'and inventory is relieved by the same amount');

-- -----------------------------------------------------------------------------
-- 4 · VAT is a liability, and revenue is net of it
-- -----------------------------------------------------------------------------
select lives_ok(
  $$ select pg_temp.make_sale('cash', 112, 12, 20) $$, 'a VAT sale exists'
);
select is(
  (select posted from public.post_sales_to_journal(current_date - 1, current_date + 1)), 1,
  'it posts'
);
select is(
  pg_temp.bal('2030'), -12::numeric,
  'VAT is credited to Output VAT Payable'
);
select is(
  pg_temp.bal('4010'), -700::numeric,
  'and revenue rises by 100, not 112 -- crediting the gross total would '
  'overstate income by exactly the VAT'
);

-- -----------------------------------------------------------------------------
-- 5 · Idempotency
-- -----------------------------------------------------------------------------
select is(
  (select posted from public.post_sales_to_journal(current_date - 1, current_date + 1)), 0,
  'running it again posts nothing -- the unique index decides, not the function '
  'remembering'
);
select is(pg_temp.bal('4010'), -700::numeric, 'and revenue is unchanged');

-- -----------------------------------------------------------------------------
-- 6 · Cost coverage
-- -----------------------------------------------------------------------------
-- One sale, two lines: one carrying a snapshot, one predating 20260905150000
-- and so falling back to today's product cost. COGS is 20 + 20; half of it is
-- real history and half of it is a guess.
create or replace function pg_temp.mixed() returns uuid language plpgsql as $$
declare v_id uuid;
begin
  v_id := pg_temp.make_sale('cash', 90, 0, 20);
  perform pg_temp.add_item(v_id, null, 45);
  return v_id;
end $$;

select lives_ok($$ select pg_temp.mixed() $$, 'a sale with one snapshot line and one without');

select is(
  (select cost_coverage from public.post_sales_to_journal(current_date - 1, current_date + 1)),
  0.5::numeric,
  'cost_coverage is 0.5 -- half the COGS came from a real snapshot and half '
  'from today''s product cost. This is the number the design''s "estimated, '
  'cost coverage 82%" label is meant to be reporting, rather than a figure '
  'typed into a mockup'
);

-- -----------------------------------------------------------------------------
-- 7 · A sale voided after posting is reversed
-- -----------------------------------------------------------------------------
reset role;
update sales set status = 'voided', voided_at = now()
 where store_id = pg_temp.org() and total = 300;
set local role authenticated;
select pg_temp.act_as('acc40000-0000-4000-8000-000000000001');

select is(
  (select reversed from public.post_sales_to_journal(current_date - 1, current_date + 1)),
  1,
  'the void is reversed rather than left overstating the ledger'
);

select is(
  pg_temp.bal('1030'), 0::numeric,
  'and Accounts Receivable is back to nil -- the reversal mirrors the original'
);

-- -----------------------------------------------------------------------------
-- 8 · A closed period is skipped, not forced
-- -----------------------------------------------------------------------------
select lives_ok(
  $$ select pg_temp.make_sale('cash', 55, 0, 10, now() - interval '400 days') $$,
  'a sale outside every period exists'
);

select is(
  (select skipped from public.post_sales_to_journal(current_date - 500, current_date + 1)),
  1,
  'it is skipped rather than forced into a period that does not exist'
);

-- -----------------------------------------------------------------------------
-- 9 · Entitlement
-- -----------------------------------------------------------------------------
reset role;
update core.organization_modules set enabled = false
 where organization_id = pg_temp.org() and module_code = 'ACCOUNTING';
set local role authenticated;
select pg_temp.act_as('acc40000-0000-4000-8000-000000000001');

select throws_ok(
  $$ select public.post_sales_to_journal(current_date - 1, current_date + 1) $$,
  'P0001', 'MODULE_NOT_AVAILABLE',
  'a store without the module posts nothing'
);

select * from finish();
rollback;
