-- Record transactions per payment type in a reading, not just money.
--
-- 20260903120000 wrote payment_breakdown as {"cash": 3400.00, ...}. The printed
-- Z-reading shows a transaction COUNT per payment type alongside the total, so
-- a reading that stores only money is strictly less informative than the
-- recomputed view it is meant to replace -- and the whole point of step 4 is
-- that the card reads the record instead of recomputing.
--
-- New shape: {"cash": {"count": 12, "total": 3400.00}, ...}
--
-- Safe to change the shape rather than migrate existing rows: no reading has
-- ever been taken. take_reading() is not deployed to any project yet, and
-- register_readings is empty everywhere. If that stops being true before this
-- ships, the reader must handle both shapes instead.
--
-- CREATE OR REPLACE with the identical signature, so the ACL survives -- see
-- 20260902190000 for what a drop costs.
--
-- Affected modules : POS, reporting
-- Rollback         : re-apply 20260903120000's definition.
-- Risk             : low -- nothing has written a reading.

create or replace function take_reading(
  p_kind          text,
  p_business_date date default null
)
returns register_readings
language plpgsql
security definer
set search_path = public, extensions
as $function$
declare
  v_store_id      uuid;
  v_staff_id      uuid := auth.uid();
  v_device_id     uuid;
  v_business_date date;
  v_period_start  timestamptz;
  v_baseline      numeric(14,2);
  -- clock_timestamp(), not now(). now() is fixed for the whole transaction, so
  -- two readings taken in one transaction would share a closed_at -- and since
  -- closed_at is the next period's opening boundary, the second period would
  -- start where the first did and count the same sales again. The moment a
  -- reading was actually taken is also the more honest value to record.
  v_now           timestamptz := clock_timestamp();
  v_row           register_readings;
  v_gross         numeric(14,2);
  v_net           numeric(14,2);
  v_discounts     numeric(14,2);
  v_vatable       numeric(14,2);
  v_vat           numeric(14,2);
  v_exempt        numeric(14,2);
  v_zero          numeric(14,2);
  v_txn_count     integer;
  v_void_count    integer;
  v_void_total    numeric(14,2);
  v_refund_count  integer;
  v_refund_total  numeric(14,2);
  v_late_count    integer;
  v_late_total    numeric(14,2);
  v_first_receipt text;
  v_last_receipt  text;
  v_payments      jsonb;
  v_z_counter     integer;
  v_reset_counter integer;
begin
  if p_kind not in ('X', 'Z') then
    raise exception 'INVALID_READING_KIND';
  end if;

  select store_id into v_store_id from staff where id = v_staff_id;
  if v_store_id is null then
    raise exception 'Not a registered staff member of any store';
  end if;

  -- Taking a reading is a closing act, not a report. Gated the same way
  -- reports are, so a cashier cannot close the register's books.
  if not (auth_role() = 'admin' or has_permission('pos.report.view')) then
    raise exception 'UNAUTHORIZED_ACTION';
  end if;

  -- The register. A paired device authenticates AS ITSELF -- checkout_sale
  -- resolves it the same way -- so this is null for a browser, which is the
  -- store's own machine.
  select id into v_device_id from devices where id = v_staff_id;

  v_business_date := coalesce(p_business_date, (v_now at time zone 'Asia/Manila')::date);

  -- Two tills closing at once must not take the same Z-counter. Serialised per
  -- (store, register) for the rest of the transaction; a plain max()+1 without
  -- this races, and the unique index would turn that race into a failed close
  -- rather than a correct one.
  perform pg_advisory_xact_lock(
    hashtext(v_store_id::text || ':' || coalesce(v_device_id::text, 'own'))
  );

  -- The period opens where the last Z closed. Readings are per register, so
  -- an X taken since that Z does not move this boundary.
  select r.closed_at, r.grand_total, r.reset_counter
    into v_period_start, v_baseline, v_reset_counter
    from register_readings r
   where r.store_id = v_store_id
     and r.kind = 'Z'
     and coalesce(r.device_id, '00000000-0000-0000-0000-000000000000'::uuid)
       = coalesce(v_device_id, '00000000-0000-0000-0000-000000000000'::uuid)
   order by r.z_counter desc
   limit 1;

  -- First reading this register has ever taken: the period is its whole life.
  -- Design §9 refused to backfill, so there is nothing before this.
  v_period_start  := coalesce(v_period_start, '-infinity'::timestamptz);
  v_baseline      := coalesce(v_baseline, 0);
  v_reset_counter := coalesce(v_reset_counter, 0);

  select
    coalesce(sum(s.total + coalesce(s.discount_amount, 0)), 0),
    coalesce(sum(s.total), 0),
    coalesce(sum(coalesce(s.discount_amount, 0)), 0),
    coalesce(sum(coalesce(s.vatable_sales, 0)), 0),
    coalesce(sum(coalesce(s.vat_amount, 0)), 0),
    coalesce(sum(coalesce(s.vat_exempt_sales, 0)), 0),
    coalesce(sum(coalesce(s.zero_rated_sales, 0)), 0),
    count(*),
    count(*) filter (where s.occurred_at <= v_period_start),
    coalesce(sum(s.total) filter (where s.occurred_at <= v_period_start), 0)
  into
    v_gross, v_net, v_discounts, v_vatable, v_vat, v_exempt, v_zero,
    v_txn_count, v_late_count, v_late_total
  from sales s
  where s.store_id = v_store_id
    and s.status = 'completed'
    and s.created_at > v_period_start;

  -- Voids counted by WHEN THEY WERE VOIDED, not when the sale was made: a void
  -- of last week's sale is this period's adjustment. The sale itself is
  -- excluded from the totals above by status, so it is not subtracted twice.
  select count(*), coalesce(sum(s.total), 0)
    into v_void_count, v_void_total
    from sales s
   where s.store_id = v_store_id
     and s.status = 'voided'
     and s.voided_at > v_period_start;

  select count(*), coalesce(sum(r.total_amount), 0)
    into v_refund_count, v_refund_total
    from refunds r
   where r.store_id = v_store_id
     and r.created_at > v_period_start;

  -- Ordered by arrival rather than by the number's text: the number carries a
  -- prefix, so a string sort is not a sequence.
  select
    (select s.receipt_number from sales s
      where s.store_id = v_store_id and s.status = 'completed'
        and s.created_at > v_period_start
        and s.receipt_number is not null
      order by s.created_at asc limit 1),
    (select s.receipt_number from sales s
      where s.store_id = v_store_id and s.status = 'completed'
        and s.created_at > v_period_start
        and s.receipt_number is not null
      order by s.created_at desc limit 1)
  into v_first_receipt, v_last_receipt;

  -- {"cash": {"count": 12, "total": 3400.00}, ...} rather than a bare total.
  -- The printed Z shows transactions per payment type, so a breakdown carrying
  -- only money would make the persisted reading strictly less informative than
  -- the recomputed view it replaces.
  select coalesce(
           jsonb_object_agg(t.payment_type,
             jsonb_build_object('count', t.txns, 'total', t.amount)),
           '{}'::jsonb)
    into v_payments
    from (
      select s.payment_type, count(*) as txns, sum(s.total) as amount
        from sales s
       where s.store_id = v_store_id
         and s.status = 'completed'
         and s.created_at > v_period_start
       group by s.payment_type
    ) t;

  if p_kind = 'Z' then
    select coalesce(max(r.z_counter), 0) + 1
      into v_z_counter
      from register_readings r
     where r.store_id = v_store_id
       and r.kind = 'Z'
       and coalesce(r.device_id, '00000000-0000-0000-0000-000000000000'::uuid)
         = coalesce(v_device_id, '00000000-0000-0000-0000-000000000000'::uuid);
  end if;

  insert into register_readings (
    store_id, kind, z_counter, reset_counter, business_date, opened_at,
    closed_at, grand_total, gross_sales, net_sales, total_discounts,
    vatable_sales, vat_amount, vat_exempt, zero_rated, transaction_count,
    voided_count, voided_total, refund_count, refund_total,
    beginning_receipt, ending_receipt, payment_breakdown,
    late_entry_count, late_entry_total, device_id, taken_by
  ) values (
    v_store_id, p_kind, v_z_counter, v_reset_counter, v_business_date,
    -- A first reading has no prior close to open from; the epoch sentinel is
    -- not a timestamp anyone should read, so record the store's first sale
    -- instead, falling back to now for a register that has sold nothing.
    case when v_period_start = '-infinity'::timestamptz
         then coalesce((select min(s.created_at) from sales s
                         where s.store_id = v_store_id), v_now)
         else v_period_start end,
    v_now, v_baseline + v_net, v_gross, v_net, v_discounts,
    v_vatable, v_vat, v_exempt, v_zero, v_txn_count,
    v_void_count, v_void_total, v_refund_count, v_refund_total,
    v_first_receipt, v_last_receipt, v_payments,
    v_late_count, v_late_total, v_device_id, v_staff_id
  )
  returning * into v_row;

  return v_row;
end;
$function$;

-- The named-grantee revoke again: CREATE OR REPLACE keeps the existing ACL, but
-- this is re-stated so a future drop-and-recreate of this file does not quietly
-- inherit the project default.
revoke all on function take_reading(text, date) from public, anon, service_role;
grant execute on function take_reading(text, date) to authenticated;
