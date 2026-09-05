-- Accounting, chunk C2: customer payments, and what the utang is actually worth
--
-- A credit sale already debits Accounts Receivable (C1). This is the other
-- half: the payment that clears it.
--
--   customer payment   DR Cash on Hand   CR Accounts Receivable
--
-- Cash, because credit_payments has no payment method column -- the POS
-- records utang settlement as money handed over. If that ever gains a method,
-- this is the one place that changes.
--
-- AGING IS AN INFERENCE, AND SAYS SO
--
-- The design's Receivables screen shows aging buckets. The POS cannot supply
-- them: credit_payments has an amount and a customer and no reference to the
-- sale it settles, and customers.balance is a single running number. Nothing
-- records WHICH charge a payment paid off.
--
-- So my_receivables() reconstructs it, oldest-first, which is what a sari-sari
-- store does in practice and what every ledger assumes absent an instruction.
-- Two things keep that honest:
--
--   * customers.balance stays the authority for the TOTAL. The reconstruction
--     only decides how that total is distributed across ages.
--   * when the reconstruction disagrees with the balance -- a manual
--     adjustment, an opening balance, a correction -- the difference is
--     returned as `unaged` rather than being folded into a bucket. A number
--     that cannot be aged is more useful said out loud than averaged away.
--
-- FIVE BUCKETS, WHICH IS NOT WHAT THE POS SHOWS
--
-- The accounting design ages into Current, 1-30, 31-60, 61-90 and 90+. The
-- POS's own Reports page uses three: 0-15, 16-30, over 30. Both are defensible
-- and they will not agree on screen. This follows the accounting design
-- because that is what the AR Aging report (E3) is specified as; whether the
-- POS should move to match is a product decision, not a technical one.
--
-- Affected schemas : public (2 functions)
-- Rollback         : drop function public.post_customer_payments_to_journal(date,date);
--                    drop function public.my_receivables();
-- Risk             : low-medium. Posts real entries, idempotent by B2's
--                    partial unique index, refuses a closed period.

create or replace function public.post_customer_payments_to_journal(p_from date, p_to date)
returns table (posted integer, skipped integer)
language plpgsql
security definer
set search_path = public, accounting, core, pg_temp
as $$
declare
  v_org     uuid := auth_store_id();
  v_payment record;
  v_entry   uuid;
  v_no      bigint;
  v_on      date;
  v_posted  integer := 0;
  v_skipped integer := 0;
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

  for v_payment in
    select p.id, p.amount, p.created_at, c.name as customer_name
      from credit_payments p
      join customers c on c.id = p.customer_id
     where p.store_id = v_org
       and (p.created_at at time zone 'Asia/Manila')::date between p_from and p_to
       and not exists (
         select 1 from accounting.journal_entries e
          where e.organization_id = v_org
            and e.source_type = 'CUSTOMER_PAYMENT'
            and e.source_id = p.id
            and e.status = 'POSTED'
       )
     order by p.created_at
  loop
    v_on := (v_payment.created_at at time zone 'Asia/Manila')::date;

    if not accounting.posting_allowed(v_org, v_on) then
      v_skipped := v_skipped + 1;
      continue;
    end if;

    insert into accounting.journal_entries
      (organization_id, entry_date, description, source_type, source_id, created_by)
    values (v_org, v_on, 'Utang payment — ' || v_payment.customer_name,
            'CUSTOMER_PAYMENT', v_payment.id, auth.uid())
    returning id into v_entry;

    insert into accounting.journal_lines
      (organization_id, entry_id, line_no, account_id, description, debit, credit)
    values
      (v_org, v_entry, 1, accounting.mapped_account(v_org, 'CASH'),
       'Payment received', v_payment.amount, 0),
      (v_org, v_entry, 2, accounting.mapped_account(v_org, 'RECEIVABLE'),
       'Utang cleared', 0, v_payment.amount);

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

    v_posted := v_posted + 1;
  end loop;

  return query select v_posted, v_skipped;
end;
$$;

comment on function public.post_customer_payments_to_journal is
  'Post utang payments as DR Cash / CR Accounts Receivable. Idempotent by the '
  'source index, skips a closed period rather than forcing it.';

-- -----------------------------------------------------------------------------
-- What the utang is worth, and how old it is
-- -----------------------------------------------------------------------------

create or replace function public.my_receivables()
returns table (
  customer_id     uuid,
  customer_name   text,
  outstanding     numeric,
  current_amt     numeric,
  d1_30           numeric,
  d31_60          numeric,
  d61_90          numeric,
  d90_plus        numeric,
  unaged          numeric,
  oldest_unpaid   date,
  last_payment_at timestamptz
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
  with charges as (
    -- Every credit sale, oldest first, with a running total. Voided sales are
    -- excluded: the POS reverses the balance on a void, so counting them would
    -- age money the customer does not owe.
    select s.customer_id,
           (coalesce(s.occurred_at, s.created_at) at time zone 'Asia/Manila')::date as charged_on,
           s.total,
           sum(s.total) over (
             partition by s.customer_id
             order by coalesce(s.occurred_at, s.created_at), s.id
             rows between unbounded preceding and current row
           ) as cumulative
      from sales s
     where s.store_id = v_org
       and s.payment_type = 'credit'
       and s.status = 'completed'
       and s.customer_id is not null
  ),
  paid as (
    select p.customer_id, coalesce(sum(p.amount), 0) as total_paid
      from credit_payments p
     where p.store_id = v_org
     group by p.customer_id
  ),
  -- Oldest-first allocation: a charge is settled once the payments cover
  -- everything up to and including it.
  open_charges as (
    select c.customer_id, c.charged_on,
           least(c.total, greatest(c.cumulative - coalesce(pd.total_paid, 0), 0)) as still_owed
      from charges c
      left join paid pd on pd.customer_id = c.customer_id
  ),
  aged as (
    select o.customer_id,
           sum(o.still_owed) as aged_total,
           min(o.charged_on) filter (where o.still_owed > 0) as oldest,
           sum(o.still_owed) filter (where current_date - o.charged_on <= 0)                                as b_current,
           sum(o.still_owed) filter (where current_date - o.charged_on between 1 and 30)                    as b1,
           sum(o.still_owed) filter (where current_date - o.charged_on between 31 and 60)                   as b2,
           sum(o.still_owed) filter (where current_date - o.charged_on between 61 and 90)                   as b3,
           sum(o.still_owed) filter (where current_date - o.charged_on > 90)                                as b4
      from open_charges o
     group by o.customer_id
  ),
  last_paid as (
    select p.customer_id, max(p.created_at) as at
      from credit_payments p where p.store_id = v_org group by p.customer_id
  )
  select cu.id, cu.name, cu.balance,
         coalesce(a.b_current, 0), coalesce(a.b1, 0), coalesce(a.b2, 0),
         coalesce(a.b3, 0), coalesce(a.b4, 0),
         -- customers.balance is the authority. Anything it holds that the
         -- reconstruction cannot place -- an opening balance, a manual
         -- correction -- is reported rather than folded into a bucket.
         round(cu.balance - coalesce(a.aged_total, 0), 2),
         a.oldest,
         lp.at
    from customers cu
    left join aged a on a.customer_id = cu.id
    left join last_paid lp on lp.customer_id = cu.id
   where cu.store_id = v_org
     and cu.balance > 0
   order by cu.balance desc;
end;
$$;

comment on function public.my_receivables is
  'Per-customer utang with an aging distribution. The total is '
  'customers.balance; the ages are reconstructed oldest-first, because the POS '
  'does not record which charge a payment settles. Whatever the reconstruction '
  'cannot place is returned as `unaged` rather than hidden in a bucket.';

revoke all on function public.post_customer_payments_to_journal(date, date) from public, anon;
revoke all on function public.my_receivables()                              from public, anon;
grant execute on function public.post_customer_payments_to_journal(date, date) to authenticated;
grant execute on function public.my_receivables()                              to authenticated;
