-- The accumulated grand total advances by GROSS -- BIR RMO 24-2023 Annex D-2
--
-- XZ-READINGS-DESIGN.md §10 recorded the basis as an open question and the
-- technical documentation carried it as STILL FOR BIR VALIDATION item 1:
-- "whether the accumulation should be net of voids and refunds rather than
-- gross as implemented -- guessing wrong changes every figure that follows".
--
-- It is answered, and not by us. BIR publishes a sample End-of-Day reading as
-- Annex D-2 to RMO 24-2023. Its figures reconcile in one direction only:
--
--     Present Accumulated Sales   1,206.00
--     Previous Accumulated Sales      0.00
--     Sales for the Day           1,206.00   <- Present less Previous
--     ...
--     Gross Amount                1,206.00   <- equal to Sales for the Day
--     Less Discount                  51.83
--     Less Return                     0.00
--     Less Void                     214.00
--     Less VAT Adjustment             6.02
--     Net Amount                  1,148.14   = Gross - Discount - VAT Adj
--     ...
--     Payments Received             934.14   = Net Amount - Void - Return
--
-- Gross less discount and VAT adjustment gives the printed Net Amount; the
-- void is not taken out until the payments line. So the accumulation is gross
-- of voids, returns AND discounts. It is an odometer, not a sales figure: it
-- only ever climbs, which is precisely what makes a decrease meaningful as a
-- reset signal.
--
-- WHAT THIS CHANGES
--
-- grand_total was accumulating v_net -- sum(total) over completed sales, which
-- is after discount and excludes anything voided before the Z. It now
-- accumulates v_accum: sum(total + discount_amount) over every sale that
-- arrived in the period, completed or later voided.
--
-- Nothing else on the reading moves. gross_sales, net_sales, the VAT breakdown
-- and the separately disclosed voided_total / refund_total are unchanged --
-- they are the reading's disclosure blocks and already mirror the annex's
-- BREAKDOWN OF SALES and SALES ADJUSTMENT sections.
--
-- THE DISCONTINUITY, STATED RATHER THAN HIDDEN
--
-- register_readings is append-only, so readings already taken keep the
-- baseline they were computed with. The accumulated figure therefore carries a
-- short tail on the old basis -- readings taken between 2026-09-03, when
-- take_reading shipped, and this deploy. The tail is understated by whatever
-- discounts and same-period voids fell inside it, never overstated, so the
-- series still never decreases and the reset check still holds.
--
-- Every reading from here on is correct from its first day: "Sales for the
-- Day" is this reading's grand_total less the previous one's, which is exactly
-- v_accum for the period. Only the absolute figure carries the tail. Doing
-- this now, one day after readings began and with no backfilled history behind
-- them, is as small as this correction will ever be.
--
-- CREATE OR REPLACE with the identical signature, so the ACL survives. The
-- reset handling from 20260903160000 is carried forward unchanged.
--
-- Affected modules : POS, reporting
-- Rollback         : re-apply 20260903160000's definition.
-- Risk             : medium -- changes a compliance figure. Cannot corrupt
--                    history: existing rows are immutable and this only
--                    affects how the next reading is computed.

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
  v_accum         numeric(14,2);
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
  v_reset         register_resets%rowtype;
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

  -- A reset restarts the accumulation. It is recorded as its own event by
  -- platform_reset_register_counter() (20260903150000) rather than by editing
  -- earlier readings, which are append-only and were true when taken.
  select * into v_reset
    from register_resets
   where store_id = v_store_id
     and coalesce(device_id, '00000000-0000-0000-0000-000000000000'::uuid)
       = coalesce(v_device_id, '00000000-0000-0000-0000-000000000000'::uuid)
   order by reset_counter desc
   limit 1;

  if found then
    -- Carried by every reading after the reset, not just the first one: it is
    -- how an examiner tells which accumulation a figure belongs to.
    v_reset_counter := v_reset.reset_counter;

    -- The baseline is zeroed only when the reset came after the last Z. The
    -- PERIOD is deliberately left alone: sales made between that Z and the
    -- reset are still counted by this reading. Starting the period at the reset
    -- would leave them in no reading at all.
    if v_reset.created_at > v_period_start then
      v_baseline := 0;
    end if;
  end if;

  -- THE ACCUMULATOR BASIS -- gross, per RMO 24-2023 Annex D-2.
  --
  -- BIR's own sample Z-Reading settles what this document previously left open.
  -- On it, "Sales for the Day" equals "Gross Amount" exactly, and Sales for the
  -- Day is defined as Present Accumulated Sales minus Previous Accumulated
  -- Sales. So the accumulation advances by GROSS: before discounts, and before
  -- voids and returns, which appear further down the same reading as their own
  -- disclosed SALES ADJUSTMENT lines rather than being netted out of it.
  --
  -- The population is therefore every sale that ARRIVED in this period,
  -- whatever became of it afterwards. That matters for a reason beyond
  -- matching the annex: filtering on status = 'completed', as this function
  -- did until now, made the accumulation depend on WHEN a sale was voided.
  -- A sale voided before its period's Z never entered the total at all, while
  -- the same sale voided one minute after that Z stayed in it forever. Two
  -- shops with identical transactions could hold different grand totals
  -- because a void landed on the other side of a boundary. An accumulator
  -- whose value depends on that is not the fixed anchor an examiner reads it
  -- as, so both cases now behave the same way: counted once, on arrival,
  -- and never removed.
  -- gross_sales and total_discounts come from this same population, so that
  -- the annex's defining identity holds on our reading too:
  -- Sales for the Day (this grand_total less the previous) == Gross Amount.
  -- Were gross_sales left on the completed-only population, a sale voided
  -- inside its own period would make the two disagree on the same slip.
  select
    coalesce(sum(s.total + coalesce(s.discount_amount, 0)), 0),
    coalesce(sum(coalesce(s.discount_amount, 0)), 0)
    into v_accum, v_discounts
    from sales s
   where s.store_id = v_store_id
     and s.status in ('completed', 'voided')
     and s.created_at > v_period_start;

  v_gross := v_accum;

  -- Everything below stays on the COMPLETED population. VAT is the clearest
  -- reason why: no VAT is due on a sale that was voided, so it must not appear
  -- in the breakdown an examiner reads as the liability. transaction_count is
  -- the same argument -- a voided sale is not a transaction that stands.
  select
    coalesce(sum(s.total), 0),
    coalesce(sum(coalesce(s.vatable_sales, 0)), 0),
    coalesce(sum(coalesce(s.vat_amount, 0)), 0),
    coalesce(sum(coalesce(s.vat_exempt_sales, 0)), 0),
    coalesce(sum(coalesce(s.zero_rated_sales, 0)), 0),
    count(*),
    count(*) filter (where s.occurred_at <= v_period_start),
    coalesce(sum(s.total) filter (where s.occurred_at <= v_period_start), 0)
  into
    v_net, v_vatable, v_vat, v_exempt, v_zero,
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
    v_now, v_baseline + v_accum, v_gross, v_net, v_discounts,
    v_vatable, v_vat, v_exempt, v_zero, v_txn_count,
    v_void_count, v_void_total, v_refund_count, v_refund_total,
    v_first_receipt, v_last_receipt, v_payments,
    v_late_count, v_late_total, v_device_id, v_staff_id
  )
  returning * into v_row;

  return v_row;
end;
$function$;

revoke all on function take_reading(text, date) from public, anon, service_role;
grant execute on function take_reading(text, date) to authenticated;
