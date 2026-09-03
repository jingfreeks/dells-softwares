-- take_reading() -- step 2 of XZ-READINGS-DESIGN.md
--
-- Step 1 (20260902180000) added register_readings and its append-only trigger,
-- and deliberately left the table unwritable by anything. This is the writer.
--
-- Server-side because a closing artefact computed by the client is not an
-- artefact: the figures must come from the same rows an examiner would query,
-- not from whatever the browser had in memory.
--
-- WHAT A PERIOD CONTAINS (design §6)
--
-- The period runs from the previous Z for this register to now, bounded by
-- ARRIVAL (created_at), not by when the sale happened. That is what makes a
-- reading immutable: it freezes what was known at the moment it was taken, so
-- nothing that syncs later can change it.
--
-- A sale that arrives in this period but OCCURRED before the period opened is
-- a late entry. It is counted in the totals -- the money is real and the shop
-- is owed the record -- and also counted separately in late_entry_count /
-- late_entry_total so the discrepancy stays visible instead of being absorbed.
-- Design §6 rejected both alternatives: recomputing the closed Z destroys
-- immutability, and refusing the sale discards a transaction that really
-- happened.
--
-- THE REGISTER SCOPE, AND A LIMITATION THAT IS DELIBERATE
--
-- The Z-counter is per (store, register), and device_id records which register
-- took the reading. The period figures, however, are scoped to the STORE and
-- not filtered by device_id.
--
-- That is not an oversight. sales.device_id is null on every one of the 94
-- sales on staging -- a sale records the cashier, not the terminal. Filtering
-- the period by device_id would mean a paired register's Z reads zero while
-- the browser's Z reads everything, which is exactly the "grand total that is
-- quietly wrong" design §9 refused to build.
--
-- The consequence, stated plainly because it is a real constraint: if two
-- registers at one store both take Z readings, they will both count the whole
-- store and the totals will double. Until sales carry a terminal, the store's
-- own register -- the null device -- is the one expected to take readings.
-- When sales do carry device_id, the period filter here gains one condition
-- and the counter scope already supports it.
--
-- GRAND TOTAL (design §7)
--
--   grand_total = (last Z's grand_total for this register) + this period's net
--
-- so an X mid-shift shows what the accumulation would be if the register
-- closed now, and only a Z moves the baseline. Gross of voids and refunds:
-- both are recorded as their own totals and never subtract, so the
-- accumulation cannot decrease. A decreasing grand total is what a reset check
-- looks for, and design §10 answer 3 settled this.
--
-- There is no upper bound on the period. "Everything since the last Z" is the
-- definition; a second bound at now() would add nothing, because the statement
-- already reads one snapshot, and it would make the boundary depend on clock
-- skew between the row's default and the reading's own now().
--
-- Affected modules : POS, reporting
-- Rollback         : drop function take_reading(text, date);
-- Risk             : medium -- new writes, and the counter must never repeat.

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
  v_now           timestamptz := now();
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

  select coalesce(jsonb_object_agg(t.payment_type, t.amount), '{}'::jsonb)
    into v_payments
    from (
      select s.payment_type, sum(s.total) as amount
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

-- The revoke discipline, named grantees and all: Supabase's default ACL grants
-- EXECUTE to anon and service_role, and "revoke from public" does not touch a
-- named grantee. See 20260902190000 for what skipping this costs.
revoke all on function take_reading(text, date) from public, anon, service_role;
grant execute on function take_reading(text, date) to authenticated;
