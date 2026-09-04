-- The two alert thresholds become real store settings
--
-- Settings -> Alerts renders "Drawer off by more than [20]" and "Utang older
-- than [30] days". Both have always lived in alertsMock.ts -- localStorage,
-- per device, never sent anywhere. Unlike the six controls #503 marked, these
-- two were never even flagged: they look like ordinary working settings and
-- always have.
--
-- WHY THIS IS A BUG AND NOT JUST A GAP
--
-- The utang threshold is already being read by two different parts of the
-- product that now disagree.
--
--   * The Customers page ages debt with isOverdueDebt(oldestDays, threshold),
--     passing whatever the owner typed into Alerts on THAT device.
--   * review_summary() (20260904120000) takes p_overdue_days, and the Review
--     page passes the hardcoded default of 30, because the server has no copy
--     of the store's setting to read.
--
-- So an owner who sets 14 sees Customers say one thing and Review say another,
-- about the same customers, on the same day. Two screens of one product
-- contradicting each other is worse than a missing feature: it teaches the
-- owner not to trust either number.
--
-- The drawer threshold has a different failure: nothing reads it at all, and
-- the Review design's "Cashier shifts are balanced" item cannot be built
-- without it. "Balanced" is a comparison against a threshold, and there was no
-- threshold on the server to compare to.
--
-- WHY COLUMNS AND NOT A PARAMETER
--
-- p_overdue_days stays on review_summary() -- a caller may legitimately ask
-- "who is 60 days late" without changing the store's setting. What changes is
-- the DEFAULT: it now comes from the store rather than from a constant, so a
-- caller who does not specify gets the owner's own answer instead of 30.
--
-- These are reporting preferences, not security controls, which is why they
-- are ordinary columns under the existing store-settings policy rather than
-- anything gated. The same reasoning 20260903190000 used for void_requires_pin
-- applies in reverse: that one WAS a control, so it needed enforcement inside
-- an RPC. These only shape what a report counts.
--
-- Defaults match what alertsMock.ts has been defaulting to, so no store's
-- numbers move on the day this ships.
--
-- Affected modules : Settings (Alerts), Review, Customers
-- Rollback         : alter table stores drop column utang_overdue_days,
--                    drop column drawer_variance_threshold;
--                    re-apply 20260904120000's review_summary().
-- Risk             : low -- two additive columns with defaults, and a function
--                    whose signature is unchanged.

alter table stores
  add column utang_overdue_days integer not null default 30
    check (utang_overdue_days between 1 and 365),
  -- Peso amount, not a percentage: the Alerts field reads "Drawer off by more
  -- than ₱20" and the drawer variance it is compared against is money.
  add column drawer_variance_threshold numeric(10, 2) not null default 20
    check (drawer_variance_threshold >= 0);

comment on column stores.utang_overdue_days is
  'Days after which unpaid utang counts as overdue. Read by the Customers '
  'ageing view and by review_summary() when no explicit period is asked for. '
  'A reporting preference, not a credit control -- checkout_sale() enforces '
  'the credit LIMIT, which is a different thing.';

comment on column stores.drawer_variance_threshold is
  'Peso variance beyond which a closed shift is worth flagging. Read by the '
  'Review attention list; a shift within this is reported as balanced.';

-- review_summary() re-declared so p_overdue_days defaults to the store's own
-- setting instead of a constant. CREATE OR REPLACE with the identical
-- signature, so the ACL survives -- see 20260902190000 for what a DROP costs.
--
-- p_overdue_days keeps its default in the signature because Postgres needs a
-- constant there; null now means "use the store's setting", which is what the
-- client sends when it has not been asked for something else.
create or replace function review_summary(
  p_from          date,
  p_to            date,
  p_overdue_days  integer default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, core, extensions
as $function$
declare
  v_store_id   uuid;
  v_from       timestamptz;
  v_to         timestamptz;
  v_overdue    integer;
  v_result     jsonb;
begin
  select store_id into v_store_id from staff where id = auth.uid();
  if v_store_id is null then
    raise exception 'VALIDATION_FAILED: no such store';
  end if;

  if not current_store_has_feature('pos.review') then
    raise exception 'FEATURE_NOT_AVAILABLE';
  end if;

  if not (auth_role() = 'admin' or has_permission('pos.report.view')) then
    raise exception 'UNAUTHORIZED_ACTION';
  end if;

  if p_from is null or p_to is null or p_to < p_from then
    raise exception 'VALIDATION_FAILED: invalid period';
  end if;

  -- The store's own answer unless the caller asked for a different one.
  select coalesce(p_overdue_days, s.utang_overdue_days)
    into v_overdue
    from stores s where s.id = v_store_id;

  v_from := (p_from::timestamp at time zone 'Asia/Manila');
  v_to   := ((p_to + 1)::timestamp at time zone 'Asia/Manila');

  with period_sales as (
    select s.id, s.total, s.discount_amount, s.payment_type, s.customer_id
      from sales s
     where s.store_id = v_store_id
       and s.status = 'completed'
       and s.occurred_at >= v_from
       and s.occurred_at <  v_to
  ),
  period_items as (
    select si.product_id, si.quantity, si.line_total, si.price
      from sale_items si
      join period_sales ps on ps.id = si.sale_id
     where si.item_type = 'product' and si.product_id is not null
  ),
  sales_agg as (
    select coalesce(sum(total), 0)::numeric(14,2) as sales_total,
           count(*)::int                          as transaction_count
      from period_sales
  ),
  profit_agg as (
    select
      coalesce(sum((pi.price - p.cost) * pi.quantity) filter (where p.cost is not null), 0)::numeric(14,2)
        as estimated_profit,
      coalesce(sum(pi.line_total), 0)::numeric(14,2) as sold_value,
      coalesce(sum(pi.line_total) filter (where p.cost is not null), 0)::numeric(14,2) as costed_value
      from period_items pi
      join products p on p.id = pi.product_id
  ),
  stock_agg as (
    select
      count(*) filter (where p.stock <= 0)                                          ::int as out_of_stock_count,
      count(*) filter (where p.stock > 0 and p.stock <= p.low_stock_threshold)      ::int as low_stock_count,
      count(*)                                                                      ::int as product_count,
      coalesce(sum(p.stock * p.cost) filter (where p.cost is not null), 0)::numeric(14,2) as inventory_value,
      count(*) filter (where p.cost is not null)                                    ::int as costed_product_count
      from products p
     where p.store_id = v_store_id
  ),
  slow_agg as (
    select count(*)::int as slow_moving_count
      from products p
     where p.store_id = v_store_id
       and p.stock > 0
       and not exists (select 1 from period_items pi where pi.product_id = p.id)
  ),
  credit_sales as (
    select s.customer_id, s.total, s.occurred_at,
           sum(s.total) over (partition by s.customer_id order by s.occurred_at desc
                              rows between unbounded preceding and current row) as running
      from sales s
     where s.store_id = v_store_id
       and s.status = 'completed'
       and s.payment_type = 'credit'
       and s.customer_id is not null
  ),
  oldest_owed as (
    select cs.customer_id, min(cs.occurred_at) as oldest_at
      from credit_sales cs
      join customers c on c.id = cs.customer_id
     where c.balance > 0
       and cs.running - cs.total < c.balance
     group by cs.customer_id
  ),
  utang_agg as (
    select
      coalesce(sum(c.balance) filter (where c.balance > 0), 0)::numeric(14,2) as utang_outstanding,
      count(*) filter (where c.balance > 0)::int                              as customers_with_balance,
      coalesce(sum(c.balance) filter (
        where c.balance > 0
          and oo.oldest_at is not null
          and extract(day from (clock_timestamp() - oo.oldest_at)) > v_overdue
      ), 0)::numeric(14,2)                                                    as utang_overdue,
      count(*) filter (
        where c.balance > 0
          and oo.oldest_at is not null
          and extract(day from (clock_timestamp() - oo.oldest_at)) > v_overdue
      )::int                                                                  as overdue_customer_count,
      coalesce(max(
        case when c.balance > 0 and oo.oldest_at is not null
             then extract(day from (clock_timestamp() - oo.oldest_at))::int end
      ), 0)::int                                                              as oldest_overdue_days
      from customers c
      left join oldest_owed oo on oo.customer_id = c.id
     where c.store_id = v_store_id
  ),
  best_sellers as (
    select coalesce(jsonb_agg(t order by t.revenue desc), '[]'::jsonb) as rows
      from (
        select p.id, p.name, sum(pi.line_total)::numeric(14,2) as revenue,
               sum(pi.quantity)::int as quantity
          from period_items pi
          join products p on p.id = pi.product_id
         group by p.id, p.name
         order by revenue desc
         limit 5
      ) t
  )
  select jsonb_build_object(
    'period',                jsonb_build_object('from', p_from, 'to', p_to),
    -- Returned so the client can label the figure with the threshold it was
    -- actually computed against, rather than assuming the default.
    'overdue_days',          v_overdue,
    'sales_total',           sa.sales_total,
    'transaction_count',     sa.transaction_count,
    'estimated_profit',      pa.estimated_profit,
    'profit_basis_share',    case when pa.sold_value > 0
                                  then round(pa.costed_value / pa.sold_value, 4)
                                  else 0 end,
    'inventory_value',       st.inventory_value,
    'inventory_basis_share', case when st.product_count > 0
                                  then round(st.costed_product_count::numeric / st.product_count, 4)
                                  else 0 end,
    'product_count',         st.product_count,
    'low_stock_count',       st.low_stock_count,
    'out_of_stock_count',    st.out_of_stock_count,
    'slow_moving_count',     sl.slow_moving_count,
    'utang_outstanding',     ua.utang_outstanding,
    'utang_overdue',         ua.utang_overdue,
    'customers_with_balance', ua.customers_with_balance,
    'overdue_customer_count', ua.overdue_customer_count,
    'oldest_overdue_days',   ua.oldest_overdue_days,
    'best_sellers',          bs.rows
  )
  into v_result
  from sales_agg sa, profit_agg pa, stock_agg st, slow_agg sl, utang_agg ua, best_sellers bs;

  return v_result;
end;
$function$;

revoke all on function review_summary(date, date, integer) from public, anon, service_role;
grant execute on function review_summary(date, date, integer) to authenticated;
