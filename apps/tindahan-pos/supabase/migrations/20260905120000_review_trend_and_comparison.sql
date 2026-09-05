-- Review gains a sales trend and a previous-period comparison
--
-- Task B of the Review plan, closing design gaps 3.1 and 3.3 in one aggregate
-- rather than two round trips. Nothing in the UI changes here; this is the
-- data the dashboard's trend chart and its "vs last month" deltas need, so the
-- PR that draws them stays purely presentational.
--
-- DAILY SERIES
--
-- One row per day in the period, including days that sold nothing.
-- generate_series with a LEFT JOIN, not a GROUP BY over the sales that exist:
-- a chart drawn from rows that exist renders a quiet Tuesday as no Tuesday at
-- all, so a bad week looks like a short one. Zero is a reading.
--
-- COMPARISON WINDOW
--
-- The design's cards read "vs last month", which is only true when the period
-- IS a month. A whole calendar month compares against the previous calendar
-- month; anything else compares against the same-length window immediately
-- before it. Both bounds come back in the payload so the UI labels what it
-- actually compared rather than asserting "last month" over an arbitrary
-- 30-day window.
--
-- Only sales_total and transaction_count are compared. A delta is meaningful
-- for a flow and not for a level: "inventory value vs last month" would invite
-- a comparison against stock that has since been sold, and outstanding utang
-- is a balance, not a period figure.
--
-- CREATE OR REPLACE with the identical signature, so the ACL survives. The
-- coalesce(occurred_at, created_at) correction from 20260905110000 is carried
-- forward -- including into the new comparison window, which would otherwise
-- reintroduce exactly the bug that migration fixed.
--
-- Affected modules : Review
-- Rollback         : re-apply 20260905110000's review_summary().
-- Risk             : low -- read-only, additive keys. The period scan is now
--                    doubled, which the expression index from 20260905110000
--                    serves for both windows.

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
  v_prev_from  date;
  v_prev_to    date;
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

  -- THE COMPARISON WINDOW
  --
  -- The design's metric cards read "vs last month", which is only true when
  -- the selected period IS a month. Rather than assume it, this detects a
  -- whole calendar month and compares against the previous calendar month;
  -- anything else compares against the same-length window immediately before.
  --
  -- Both bounds are returned in the payload so the UI can label what it
  -- actually compared -- "vs Aug 1-31" -- instead of printing "vs last month"
  -- over an arbitrary 30-day window that ended mid-August.
  if p_from = date_trunc('month', p_from)::date
     and p_to = (date_trunc('month', p_from) + interval '1 month' - interval '1 day')::date then
    v_prev_from := (date_trunc('month', p_from) - interval '1 month')::date;
    v_prev_to   := (date_trunc('month', p_from) - interval '1 day')::date;
  else
    v_prev_to   := p_from - 1;
    v_prev_from := v_prev_to - (p_to - p_from);
  end if;

  v_from := (p_from::timestamp at time zone 'Asia/Manila');
  v_to   := ((p_to + 1)::timestamp at time zone 'Asia/Manila');

  with period_sales as (
    select s.id, s.total, s.discount_amount, s.payment_type, s.customer_id,
           coalesce(s.occurred_at, s.created_at) as happened_at
      from sales s
     where s.store_id = v_store_id
       and s.status = 'completed'
       -- coalesce, NOT occurred_at alone. See the header: occurred_at is set
       -- only for offline replays, so filtering on it bare counted nothing an
       -- ordinary online sale did.
       and coalesce(s.occurred_at, s.created_at) >= v_from
       and coalesce(s.occurred_at, s.created_at) <  v_to
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
    select s.customer_id, s.total,
           coalesce(s.occurred_at, s.created_at) as happened_at,
           sum(s.total) over (partition by s.customer_id
                              order by coalesce(s.occurred_at, s.created_at) desc
                              rows between unbounded preceding and current row) as running
      from sales s
     where s.store_id = v_store_id
       and s.status = 'completed'
       and s.payment_type = 'credit'
       and s.customer_id is not null
  ),
  oldest_owed as (
    select cs.customer_id, min(cs.happened_at) as oldest_at
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
  -- One row per day in the period, including days that sold nothing.
  --
  -- generate_series and a LEFT JOIN rather than grouping the sales: a chart
  -- built from rows that exist draws a quiet Tuesday as no Tuesday at all,
  -- which makes a bad week look like a short one. Zero is a reading.
  --
  -- Bucketed on the Manila calendar day, the same boundary the period itself
  -- uses, so a 9pm sale is not filed under tomorrow.
  daily as (
    select coalesce(jsonb_agg(jsonb_build_object('date', d.day, 'sales', d.total)
                              order by d.day), '[]'::jsonb) as rows
      from (
        select g.day::date as day,
               coalesce(sum(ps.total), 0)::numeric(14,2) as total
          from generate_series(p_from, p_to, interval '1 day') g(day)
          left join period_sales ps
            on (ps.happened_at at time zone 'Asia/Manila')::date = g.day::date
         group by g.day
      ) d
  ),
  -- The same two headline figures over the comparison window. Deliberately
  -- not the whole aggregate: a delta is only meaningful for a flow, and
  -- comparing stock levels or outstanding utang against a past window would
  -- invite a "vs last month" on a figure that has no such thing.
  previous as (
    select
      coalesce(sum(s.total), 0)::numeric(14,2) as sales_total,
      count(*)::int                            as transaction_count
      from sales s
     where s.store_id = v_store_id
       and s.status = 'completed'
       and coalesce(s.occurred_at, s.created_at) >= (v_prev_from::timestamp at time zone 'Asia/Manila')
       and coalesce(s.occurred_at, s.created_at) <  ((v_prev_to + 1)::timestamp at time zone 'Asia/Manila')
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
    'best_sellers',          bs.rows,
    'daily_sales',           dy.rows,
    -- Raw figures, not a percentage. The client has to handle "nothing to
    -- compare against" anyway -- a store's first month has no previous -- and
    -- a delta computed here would still leave that case to it.
    'previous',              jsonb_build_object(
                               'from',              v_prev_from,
                               'to',                v_prev_to,
                               'sales_total',       pv.sales_total,
                               'transaction_count', pv.transaction_count
                             )
  )
  into v_result
  from sales_agg sa, profit_agg pa, stock_agg st, slow_agg sl, utang_agg ua,
       best_sellers bs, daily dy, previous pv;

  return v_result;
end;
$function$;

revoke all on function review_summary(date, date, integer) from public, anon, service_role;
grant execute on function review_summary(date, date, integer) to authenticated;
