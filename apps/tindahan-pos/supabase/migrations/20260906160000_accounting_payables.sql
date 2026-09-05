-- Accounting, chunk C3: deliveries, what they cost, and what is still owed
--
--   goods received      DR Inventory            CR Accounts Payable
--   delivery paid       DR Accounts Payable     CR Cash on Hand
--
-- WHY A CASH PURCHASE STILL GOES THROUGH PAYABLES
--
-- A delivery paid on the spot could post DR Inventory / CR Cash in one entry.
-- It posts two instead, and the payable is open for no time at all.
--
-- That is deliberate: `paid` is a boolean the shop flips whenever it likes,
-- including days later, so "was this a cash purchase" is not knowable at
-- receipt. Routing everything through Accounts Payable means the flow is the
-- same however the flag moves afterwards, and the account shows every peso
-- that was ever owed to a supplier rather than only the ones that stayed
-- unpaid overnight.
--
-- WHAT THE SCHEMA CANNOT DO, AND THIS THEREFORE DOES NOT PRETEND TO
--
-- There is no supplier payment table. Settlement is `receiving_entries.paid`
-- and `paid_at` -- a boolean and a timestamp. That means:
--
--   * no partial payments. An entry is owed in full or settled in full.
--   * no payment method. A settlement credits Cash on Hand, because that is
--     what a sari-sari store hands a delivery driver.
--   * no payment reference, so nothing ties a settlement to a bank transfer.
--
-- The design's AP Supplier screen has an inline "Record a payment" form with a
-- partial amount. It cannot be built on this schema. That is a product gap to
-- decide on, not something to paper over with a payments table invented here
-- -- planning §16 is explicit about not creating duplicate supplier workflows.
--
-- DUE DATES COME FROM THE SUPPLIER'S TERMS
--
-- suppliers.payment_terms is 'cash', '7_days' or '15_days'. Due date is the
-- delivery date plus 0, 7 or 15 days. A delivery from a supplier with no terms
-- recorded is treated as due on receipt, which is the assumption that errs
-- towards telling the owner something is owed rather than hiding it.
--
-- Affected schemas : accounting (mapped_account gains PAYABLE), public (2 functions)
-- Rollback         : drop function public.post_purchases_to_journal(date,date);
--                    drop function public.my_payables();
-- Risk             : low-medium. Posts real entries, idempotent by B2's
--                    partial unique index, skips a closed period.

-- -----------------------------------------------------------------------------
-- The account map gains PAYABLE
--
-- C1 introduced accounting.mapped_account() with the seven purposes the sales
-- integration needed. Accounts Payable was not one of them, because nothing
-- posted to it yet.
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
                   when 'PAYABLE'    then '2010'
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

create or replace function public.post_purchases_to_journal(p_from date, p_to date)
returns table (received integer, settled integer, skipped integer)
language plpgsql
security definer
set search_path = public, accounting, core, pg_temp
as $$
declare
  v_org      uuid := auth_store_id();
  v_row      record;
  v_entry    uuid;
  v_no       bigint;
  v_received integer := 0;
  v_settled  integer := 0;
  v_skipped  integer := 0;
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
  -- Pass 1 · goods received
  -- ---------------------------------------------------------------------------
  for v_row in
    select r.id, r.received_on, r.dr_number,
           coalesce(s.name, r.supplier, 'Supplier') as supplier_name,
           (select coalesce(sum(l.quantity * l.cost_each), 0)
              from receiving_lines l where l.receiving_entry_id = r.id) as value
      from receiving_entries r
      left join suppliers s on s.id = r.supplier_id
     where r.store_id = v_org
       and r.received_on between p_from and p_to
       and not exists (
         select 1 from accounting.journal_entries e
          where e.organization_id = v_org and e.source_type = 'PURCHASE'
            and e.source_id = r.id and e.status = 'POSTED'
       )
     order by r.received_on
  loop
    -- A delivery with no priced lines is not a mistake -- a stock correction
    -- can look like one -- but it has no accounting effect, so it produces no
    -- entry rather than a pair of zero-value lines saying nothing.
    if v_row.value <= 0 then
      continue;
    end if;
    if not accounting.posting_allowed(v_org, v_row.received_on) then
      v_skipped := v_skipped + 1;
      continue;
    end if;

    insert into accounting.journal_entries
      (organization_id, entry_date, description, reference, source_type, source_id, created_by)
    values (v_org, v_row.received_on,
            'Delivery from ' || v_row.supplier_name, v_row.dr_number,
            'PURCHASE', v_row.id, auth.uid())
    returning id into v_entry;

    insert into accounting.journal_lines
      (organization_id, entry_id, line_no, account_id, description, debit, credit)
    values
      (v_org, v_entry, 1, accounting.mapped_account(v_org, 'INVENTORY'),
       'Stock received', v_row.value, 0),
      (v_org, v_entry, 2, accounting.mapped_account(v_org, 'PAYABLE'),
       'Owed to ' || v_row.supplier_name, 0, v_row.value);

    update accounting.entry_counters set next_no = next_no + 1
     where organization_id = v_org
    returning next_no - 1 into v_no;
    if v_no is null then
      insert into accounting.entry_counters (organization_id, next_no) values (v_org, 2);
      v_no := 1;
    end if;

    update accounting.journal_entries
       set status = 'POSTED', entry_no = 'JE-' || lpad(v_no::text, 6, '0'),
           posted_by = auth.uid(), posted_at = now(), updated_at = now()
     where id = v_entry;

    v_received := v_received + 1;
  end loop;

  -- ---------------------------------------------------------------------------
  -- Pass 2 · deliveries marked paid
  --
  -- Only for a delivery whose receipt has already been posted: settling a
  -- payable that was never raised would credit cash against nothing.
  -- ---------------------------------------------------------------------------
  for v_row in
    select r.id, coalesce(r.paid_at, r.received_on::timestamptz) as paid_at,
           coalesce(s.name, r.supplier, 'Supplier') as supplier_name,
           (select coalesce(sum(l.quantity * l.cost_each), 0)
              from receiving_lines l where l.receiving_entry_id = r.id) as value
      from receiving_entries r
      left join suppliers s on s.id = r.supplier_id
     where r.store_id = v_org
       and r.paid
       and exists (
         select 1 from accounting.journal_entries e
          where e.organization_id = v_org and e.source_type = 'PURCHASE'
            and e.source_id = r.id and e.status = 'POSTED'
       )
       and not exists (
         select 1 from accounting.journal_entries e
          where e.organization_id = v_org and e.source_type = 'SUPPLIER_PAYMENT'
            and e.source_id = r.id and e.status = 'POSTED'
       )
     order by r.paid_at
  loop
    if v_row.value <= 0 then
      continue;
    end if;
    if not accounting.posting_allowed(v_org, (v_row.paid_at at time zone 'Asia/Manila')::date) then
      v_skipped := v_skipped + 1;
      continue;
    end if;

    insert into accounting.journal_entries
      (organization_id, entry_date, description, source_type, source_id, created_by)
    values (v_org, (v_row.paid_at at time zone 'Asia/Manila')::date,
            'Paid ' || v_row.supplier_name, 'SUPPLIER_PAYMENT', v_row.id, auth.uid())
    returning id into v_entry;

    insert into accounting.journal_lines
      (organization_id, entry_id, line_no, account_id, description, debit, credit)
    values (v_org, v_entry, 1, accounting.mapped_account(v_org, 'PAYABLE'),
            'Payable settled', v_row.value, 0);
    insert into accounting.journal_lines
      (organization_id, entry_id, line_no, account_id, description, debit, credit)
    values (v_org, v_entry, 2, accounting.mapped_account(v_org, 'CASH'),
            'Paid to supplier', 0, v_row.value);

    update accounting.entry_counters set next_no = next_no + 1
     where organization_id = v_org
    returning next_no - 1 into v_no;

    update accounting.journal_entries
       set status = 'POSTED', entry_no = 'JE-' || lpad(v_no::text, 6, '0'),
           posted_by = auth.uid(), posted_at = now(), updated_at = now()
     where id = v_entry;

    v_settled := v_settled + 1;
  end loop;

  return query select v_received, v_settled, v_skipped;
end;
$$;

comment on function public.post_purchases_to_journal is
  'Post deliveries as DR Inventory / CR Accounts Payable, and deliveries marked '
  'paid as DR Accounts Payable / CR Cash. A settlement is only posted once its '
  'receipt has been, so cash is never credited against a payable that was '
  'never raised.';

-- -----------------------------------------------------------------------------
-- What is owed, and when it fell due
-- -----------------------------------------------------------------------------

create or replace function public.my_payables()
returns table (
  supplier_id   uuid,
  supplier_name text,
  payment_terms text,
  outstanding   numeric,
  not_yet_due   numeric,
  d1_30         numeric,
  d31_60        numeric,
  d61_90        numeric,
  d90_plus      numeric,
  oldest_due    date,
  deliveries    integer
)
language plpgsql
security invoker
set search_path = public, accounting, core, pg_temp
as $$
declare
  v_org uuid := auth_store_id();
begin
  if not (auth_role() = 'admin' or has_permission('accounting.view')) then
    raise exception 'UNAUTHORIZED_ACTION' using errcode = 'P0001',
      hint = 'accounting.view required';
  end if;

  return query
  with unpaid as (
    select r.id, r.supplier_id, coalesce(s.name, r.supplier, 'Supplier') as name,
           s.payment_terms,
           r.received_on
             + case s.payment_terms
                 when '7_days'  then 7
                 when '15_days' then 15
                 -- 'cash', or a supplier with no terms recorded: due on
                 -- receipt. The assumption that errs towards telling the owner
                 -- something is owed rather than hiding it.
                 else 0
               end as due_on,
           (select coalesce(sum(l.quantity * l.cost_each), 0)
              from receiving_lines l where l.receiving_entry_id = r.id) as value
      from receiving_entries r
      left join suppliers s on s.id = r.supplier_id
     where r.store_id = v_org
       and not r.paid
  )
  select u.supplier_id, u.name, u.payment_terms,
         sum(u.value),
         coalesce(sum(u.value) filter (where u.due_on >= current_date), 0),
         coalesce(sum(u.value) filter (where current_date - u.due_on between 1 and 30), 0),
         coalesce(sum(u.value) filter (where current_date - u.due_on between 31 and 60), 0),
         coalesce(sum(u.value) filter (where current_date - u.due_on between 61 and 90), 0),
         coalesce(sum(u.value) filter (where current_date - u.due_on > 90), 0),
         min(u.due_on) filter (where u.due_on < current_date),
         count(*)::integer
    from unpaid u
   where u.value > 0
   group by u.supplier_id, u.name, u.payment_terms
   order by sum(u.value) desc;
end;
$$;

comment on function public.my_payables is
  'Unpaid deliveries by supplier, aged from the due date their payment terms '
  'imply. Every delivery is owed in full or settled in full -- the POS records '
  'settlement as a boolean, so there are no partial payments to represent.';

revoke all on function public.post_purchases_to_journal(date, date) from public, anon;
revoke all on function public.my_payables()                         from public, anon;
grant execute on function public.post_purchases_to_journal(date, date) to authenticated;
grant execute on function public.my_payables()                         to authenticated;
