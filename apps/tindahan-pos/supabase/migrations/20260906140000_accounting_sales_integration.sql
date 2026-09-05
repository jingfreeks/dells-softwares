-- Accounting, chunk C1: a sale becomes a journal entry
--
-- The first integration. Planning §10: the POS records what happened, and
-- accounting records what it means -- without modifying the original sale.
-- Nothing here writes to sales, sale_items or products.
--
-- WHAT A SALE POSTS
--
--   cash sale          DR Cash on Hand        CR Sales Revenue
--   QR sale            DR Cash in Bank        CR Sales Revenue
--   credit (utang)     DR Accounts Receivable CR Sales Revenue
--   plus, per sale     DR Cost of Goods Sold  CR Inventory
--   and if VAT applies CR Output VAT, with revenue reduced by the same amount
--
-- QR GOES TO THE BANK, NOT THE TILL
--
-- A GCash or QR payment is money the shop has but cannot count in the drawer.
-- Posting it to Cash on Hand would make every drawer count look short by the
-- day's QR takings, and the variance report would blame the cashier.
--
-- VAT IS NOT OPTIONAL, SO THE CHART GAINS AN ACCOUNT
--
-- sales.vat_amount is the tax collected on behalf of the BIR. It is a
-- liability, not revenue: crediting the gross total to Sales Revenue overstates
-- income by exactly the VAT and produces a P&L a bookkeeper cannot file. The
-- starter chart had nowhere to put it, so 2030 Output VAT Payable is added
-- here and seed_accounting_chart() now installs it. A tenant seeded before
-- this migration gets it by running the seeder again -- it only adds what is
-- missing.
--
-- COST COVERAGE IS REPORTED, NOT HIDDEN
--
-- COGS uses sale_items.cost_at_sale, the snapshot taken at checkout since
-- 20260905150000. Sales made before that migration have no snapshot, so those
-- lines fall back to products.cost -- TODAY's cost, which is wrong for a
-- historical margin and right about nothing except being the only number
-- available.
--
-- post_sales_to_journal() therefore returns cost_coverage: the share of COGS
-- that came from a real snapshot. The design's screens say "estimated" and
-- name a percentage; this is where that percentage comes from, rather than
-- being a figure someone typed into a mockup.
--
-- A VOIDED SALE THAT WAS ALREADY POSTED IS REVERSED
--
-- Excluding voided sales from posting is not enough. A sale posted on Monday
-- and voided on Tuesday leaves the ledger overstated forever. The same
-- function reverses those entries, which is why it does two passes.
--
-- Affected schemas : accounting (1 helper), public (2 functions, 1 seeder
--                    updated to add 2030)
-- Rollback         : drop function public.post_sales_to_journal(date,date);
--                    drop function accounting.mapped_account(uuid,text);
--                    -- and restore seed_accounting_chart from 20260906100000
-- Risk             : medium. It posts real entries. It is idempotent by the
--                    partial unique index from B2, refuses a closed period,
--                    and posts nothing for a tenant without the module.

-- -----------------------------------------------------------------------------
-- The account map
--
-- One seam. Today it resolves a fixed code per purpose; chunk F1's Settings
-- screen will back it with a per-tenant mapping table, and no integration has
-- to change when it does. Planning §8: account NAMES are never hard-coded --
-- the code is the stable handle, which is why B3b froze it for system rows.
-- -----------------------------------------------------------------------------

create or replace function accounting.mapped_account(p_org uuid, p_purpose text)
returns uuid
language plpgsql
stable
security definer
set search_path = accounting, pg_temp
as $$
declare
  v_code text := case p_purpose
                   when 'CASH'       then '1010'
                   when 'BANK'       then '1020'
                   when 'RECEIVABLE' then '1030'
                   when 'INVENTORY'  then '1040'
                   when 'OUTPUT_VAT' then '2030'
                   when 'REVENUE'    then '4010'
                   when 'COGS'       then '5010'
                 end;
  v_id uuid;
begin
  if v_code is null then
    raise exception 'UNKNOWN_ACCOUNT_PURPOSE' using errcode = 'P0001', hint = p_purpose;
  end if;

  select id into v_id from accounting.accounts
   where organization_id = p_org and code = v_code and active;

  if v_id is null then
    raise exception 'ACCOUNT_NOT_MAPPED' using errcode = 'P0001',
      hint = p_purpose || ' expects account ' || v_code || ', which is missing or inactive';
  end if;
  return v_id;
end;
$$;

comment on function accounting.mapped_account is
  'Which account an integration posts to for a given purpose. The seam F1''s '
  'Settings mapping will sit behind.';

-- -----------------------------------------------------------------------------
-- The chart gains Output VAT Payable
-- -----------------------------------------------------------------------------

create or replace function public.seed_accounting_chart()
returns integer
language plpgsql
security definer
set search_path = public, accounting, core, pg_temp
as $$
declare
  v_org     uuid := auth_store_id();
  v_before  integer;
  v_after   integer;
begin
  if v_org is null then
    raise exception 'UNAUTHORIZED_ACTION' using errcode = 'P0001', hint = 'No store in session';
  end if;
  if not (auth_role() = 'admin' or has_permission('accounting.account.manage')) then
    raise exception 'UNAUTHORIZED_ACTION' using errcode = 'P0001',
      hint = 'accounting.account.manage required';
  end if;
  if not public.current_store_has_module('ACCOUNTING') then
    raise exception 'MODULE_NOT_AVAILABLE' using errcode = 'P0001', hint = 'ACCOUNTING';
  end if;
  if not public.current_store_writes_allowed() then
    raise exception 'WRITES_NOT_ALLOWED' using errcode = 'P0001';
  end if;

  select count(*) into v_before from accounting.accounts where organization_id = v_org;

  insert into accounting.accounts (organization_id, code, name, type, normal_balance, is_system)
  values
    (v_org, '1000', 'Assets',        'ASSET',         'DEBIT',  false),
    (v_org, '2000', 'Liabilities',   'LIABILITY',     'CREDIT', false),
    (v_org, '3000', 'Equity',        'EQUITY',        'CREDIT', false),
    (v_org, '4000', 'Revenue',       'REVENUE',       'CREDIT', false),
    (v_org, '5000', 'Cost of Sales', 'COST_OF_SALES', 'DEBIT',  false),
    (v_org, '6000', 'Expenses',      'EXPENSE',       'DEBIT',  false)
  on conflict (organization_id, code) do nothing;

  insert into accounting.accounts (organization_id, code, name, type, normal_balance, is_system, parent_id)
  select v_org, v.code, v.name, v.type::accounting.account_type,
         v.normal_balance::accounting.normal_balance, v.is_system, p.id
    from (values
      ('1010', 'Cash on Hand',        'ASSET',         'DEBIT',  true,  '1000'),
      ('1020', 'Cash in Bank',        'ASSET',         'DEBIT',  true,  '1000'),
      ('1030', 'Accounts Receivable', 'ASSET',         'DEBIT',  true,  '1000'),
      ('1040', 'Inventory',           'ASSET',         'DEBIT',  true,  '1000'),
      ('2010', 'Accounts Payable',    'LIABILITY',     'CREDIT', true,  '2000'),
      ('2020', 'Other Payables',      'LIABILITY',     'CREDIT', false, '2000'),
      -- New in C1. VAT collected is money held for the BIR, not income.
      ('2030', 'Output VAT Payable',  'LIABILITY',     'CREDIT', true,  '2000'),
      ('3010', 'Owner''s Capital',    'EQUITY',        'CREDIT', false, '3000'),
      ('3020', 'Owner''s Drawings',   'EQUITY',        'DEBIT',  false, '3000'),
      ('4010', 'Sales Revenue',       'REVENUE',       'CREDIT', true,  '4000'),
      ('5010', 'Cost of Goods Sold',  'COST_OF_SALES', 'DEBIT',  true,  '5000'),
      ('6010', 'Rent',                'EXPENSE',       'DEBIT',  false, '6000'),
      ('6020', 'Utilities',           'EXPENSE',       'DEBIT',  false, '6000'),
      ('6030', 'Salaries',            'EXPENSE',       'DEBIT',  false, '6000'),
      ('6040', 'Transportation',      'EXPENSE',       'DEBIT',  false, '6000'),
      ('6050', 'Other Expenses',      'EXPENSE',       'DEBIT',  false, '6000')
    ) as v (code, name, type, normal_balance, is_system, parent_code)
    join accounting.accounts p
      on p.organization_id = v_org and p.code = v.parent_code
  on conflict (organization_id, code) do nothing;

  select count(*) into v_after from accounting.accounts where organization_id = v_org;
  return v_after - v_before;
end;
$$;

comment on function public.seed_accounting_chart is
  'Install the starter chart for the caller''s store. Idempotent: returns how '
  'many accounts it added, so running it again after a migration that adds one '
  'returns 1 rather than 0.';

-- -----------------------------------------------------------------------------
-- Posting sales
-- -----------------------------------------------------------------------------

create or replace function public.post_sales_to_journal(p_from date, p_to date)
returns table (
  posted        integer,
  reversed      integer,
  skipped       integer,
  cost_coverage numeric
)
language plpgsql
security definer
set search_path = public, accounting, core, pg_temp
as $$
declare
  v_org        uuid := auth_store_id();
  v_sale       record;
  v_entry      uuid;
  v_no         bigint;
  v_on         date;
  v_revenue    numeric(14, 2);
  v_vat        numeric(14, 2);
  v_cogs       numeric(14, 2);
  v_snapshot   numeric(14, 2);
  v_debit_acct uuid;
  v_line       integer;
  v_posted     integer := 0;
  v_reversed   integer := 0;
  v_skipped    integer := 0;
  v_cogs_all   numeric(14, 2) := 0;
  v_snap_all   numeric(14, 2) := 0;
begin
  if not (auth_role() = 'admin' or has_permission('accounting.journal.post')) then
    raise exception 'UNAUTHORIZED_ACTION' using errcode = 'P0001',
      hint = 'accounting.journal.post required';
  end if;
  if not public.current_store_has_module('ACCOUNTING') then
    raise exception 'MODULE_NOT_AVAILABLE' using errcode = 'P0001', hint = 'ACCOUNTING';
  end if;
  if not public.current_store_writes_allowed() then
    raise exception 'WRITES_NOT_ALLOWED' using errcode = 'P0001';
  end if;

  -- ---------------------------------------------------------------------------
  -- Pass 1 · sales that were posted and have since been voided
  --
  -- Excluding voided sales from pass 2 is not enough: a sale posted on Monday
  -- and voided on Tuesday would leave the ledger overstated for good.
  -- ---------------------------------------------------------------------------
  for v_sale in
    select e.id as entry_id
      from accounting.journal_entries e
      join sales s on s.id = e.source_id
     where e.organization_id = v_org
       and e.source_type = 'SALE'
       and e.status = 'POSTED'
       and s.status = 'voided'
  loop
    -- Dated today by reverse_journal_entry(), so today must be in an open
    -- period. If it is not, the void is left for the next run rather than
    -- reopening a month to file it.
    if accounting.posting_allowed(v_org, current_date) then
      perform public.reverse_journal_entry(v_sale.entry_id, 'Sale voided in Tindahan POS');
      v_reversed := v_reversed + 1;
    else
      v_skipped := v_skipped + 1;
    end if;
  end loop;

  -- ---------------------------------------------------------------------------
  -- Pass 2 · completed sales not yet posted
  --
  -- coalesce(occurred_at, created_at) is the convention: occurred_at is set
  -- only on an offline replay, and taking it bare would file every online sale
  -- under no date at all -- the defect #515 fixed in review_summary().
  -- ---------------------------------------------------------------------------
  for v_sale in
    select s.id, s.total, s.payment_type, s.vat_amount,
           coalesce(s.occurred_at, s.created_at) as happened_at,
           s.receipt_number
      from sales s
     where s.store_id = v_org
       and s.status = 'completed'
       and (coalesce(s.occurred_at, s.created_at) at time zone 'Asia/Manila')::date
             between p_from and p_to
       and not exists (
         select 1 from accounting.journal_entries e
          where e.organization_id = v_org
            and e.source_type = 'SALE'
            and e.source_id = s.id
            and e.status = 'POSTED'
       )
     order by coalesce(s.occurred_at, s.created_at)
  loop
    -- The business date, in Manila, because that is what take_reading() and
    -- accounting periods both use. A sale at 00:30 Manila is 16:30 UTC the
    -- previous day, and filing it under the previous day is how a month's
    -- takings and its Z-readings disagree.
    v_on := (v_sale.happened_at at time zone 'Asia/Manila')::date;

    if not accounting.posting_allowed(v_org, v_on) then
      v_skipped := v_skipped + 1;
      continue;
    end if;

    v_vat     := coalesce(v_sale.vat_amount, 0);
    v_revenue := v_sale.total - v_vat;

    -- COGS from the snapshot where there is one, today's cost where there is
    -- not, and nothing at all where neither exists. v_snapshot is what came
    -- from a real snapshot, which is the numerator of the coverage figure.
    select
      coalesce(sum(i.quantity * coalesce(i.cost_at_sale, p.cost)), 0),
      coalesce(sum(i.quantity * i.cost_at_sale), 0)
      into v_cogs, v_snapshot
      from sale_items i
      left join products p on p.id = i.product_id
     where i.sale_id = v_sale.id
       and i.item_type = 'product';

    v_debit_acct := case v_sale.payment_type
                      when 'cash'   then accounting.mapped_account(v_org, 'CASH')
                      -- A QR payment is money the shop has but cannot count in
                      -- the drawer; posting it to Cash on Hand would make every
                      -- drawer count read short and blame the cashier.
                      when 'qr'     then accounting.mapped_account(v_org, 'BANK')
                      when 'credit' then accounting.mapped_account(v_org, 'RECEIVABLE')
                    end;
    if v_debit_acct is null then
      raise exception 'UNKNOWN_PAYMENT_TYPE' using errcode = 'P0001', hint = v_sale.payment_type;
    end if;

    insert into accounting.journal_entries
      (organization_id, entry_date, description, reference, source_type, source_id, created_by)
    values (
      v_org, v_on,
      'Sale ' || coalesce(v_sale.receipt_number, v_sale.id::text),
      v_sale.receipt_number, 'SALE', v_sale.id, auth.uid()
    )
    returning id into v_entry;

    v_line := 0;

    v_line := v_line + 1;
    insert into accounting.journal_lines
      (organization_id, entry_id, line_no, account_id, description, debit, credit)
    values (v_org, v_entry, v_line, v_debit_acct, 'Sale proceeds', v_sale.total, 0);

    v_line := v_line + 1;
    insert into accounting.journal_lines
      (organization_id, entry_id, line_no, account_id, description, debit, credit)
    values (v_org, v_entry, v_line, accounting.mapped_account(v_org, 'REVENUE'),
            'Sales revenue', 0, v_revenue);

    if v_vat > 0 then
      v_line := v_line + 1;
      insert into accounting.journal_lines
        (organization_id, entry_id, line_no, account_id, description, debit, credit)
      values (v_org, v_entry, v_line, accounting.mapped_account(v_org, 'OUTPUT_VAT'),
              'VAT collected', 0, v_vat);
    end if;

    -- No cost data at all means no COGS lines rather than a zero-value pair.
    -- A ₱0.00 debit and credit would still be two lines saying nothing.
    if v_cogs > 0 then
      v_line := v_line + 1;
      insert into accounting.journal_lines
        (organization_id, entry_id, line_no, account_id, description, debit, credit)
      values (v_org, v_entry, v_line, accounting.mapped_account(v_org, 'COGS'),
              'Cost of goods sold', v_cogs, 0);

      v_line := v_line + 1;
      insert into accounting.journal_lines
        (organization_id, entry_id, line_no, account_id, description, debit, credit)
      values (v_org, v_entry, v_line, accounting.mapped_account(v_org, 'INVENTORY'),
              'Inventory relieved', 0, v_cogs);
    end if;

    update accounting.entry_counters set next_no = next_no + 1
     where organization_id = v_org
    returning next_no - 1 into v_no;
    if v_no is null then
      insert into accounting.entry_counters (organization_id, next_no) values (v_org, 2);
      v_no := 1;
    end if;

    -- Balance, line count and open period are all checked by B2's lifecycle
    -- trigger on this update. Nothing here restates them.
    update accounting.journal_entries
       set status = 'POSTED', entry_no = 'JE-' || lpad(v_no::text, 6, '0'),
           posted_by = auth.uid(), posted_at = now(), updated_at = now()
     where id = v_entry;

    v_posted   := v_posted + 1;
    v_cogs_all := v_cogs_all + v_cogs;
    v_snap_all := v_snap_all + v_snapshot;
  end loop;

  return query select
    v_posted, v_reversed, v_skipped,
    -- Null, not 1.0, when nothing has a cost: "we do not know" and "perfectly
    -- covered" must not render as the same number on a screen that says
    -- "estimated".
    case when v_cogs_all > 0 then round(v_snap_all / v_cogs_all, 4) else null end;
end;
$$;

comment on function public.post_sales_to_journal is
  'Post completed sales in a date range, and reverse entries for sales voided '
  'since. Idempotent: a sale already posted is skipped by the unique index, '
  'not by this function remembering. cost_coverage is the share of COGS drawn '
  'from a real cost snapshot rather than from today''s product cost.';

revoke all on function public.post_sales_to_journal(date, date) from public, anon;
grant execute on function public.post_sales_to_journal(date, date) to authenticated;
