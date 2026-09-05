-- review_summary() -- the server side of the Review feature
--
-- 20260904110000 made 'pos.review' sellable. A sellable capability the server
-- does not withhold is the bug the whole entitlement layer exists to prevent,
-- and 290_every_feature_is_decided.sql fails the build for exactly that. So the
-- entitlement and its enforcement ship together: this is the only way to read
-- Review data, and it refuses anyone who does not hold the feature.
--
-- WHY THE FIGURES ARE COMPUTED HERE AND NOT IN THE CLIENT
--
-- Not performance -- authority. A client that fetches the rows and aggregates
-- them has already been handed the rows. Starter must be refused before any
-- Review data is returned, so the aggregate is what crosses the boundary and
-- the underlying rows never do.
--
-- WHAT IS DELIBERATELY MISSING
--
-- The design shows an EXPENSES metric. There is no expenses table in this
-- schema, and nothing else stands in for one -- the ACCOUNTING module that
-- would own it is not built. Rather than invent a figure, this function does
-- not return expenses at all, and the client must not display the card. The
-- brief is explicit: if the application cannot calculate a metric reliably, do
-- not fabricate it.
--
-- WHAT IS APPROXIMATE, AND SAYS SO
--
-- estimated_profit uses products.cost, which is the CURRENT cost and is
-- nullable -- sale_items never captured a cost snapshot, so the margin on a
-- sale made before a cost change is recomputed at today's cost. The function
-- therefore returns profit_basis_share alongside it: the fraction of sold
-- value whose product has a cost at all. A client showing the peso figure
-- without that share is overstating what is known. Same for inventory_value.
--
-- OVERDUE UTANG
--
-- p_overdue_days is a REPORTING preference, not a security control, which is
-- why it is a parameter. The threshold lives in the client's Alerts settings
-- (localStorage today -- see feesLimitsMock.ts and issue #470), so the server
-- has no copy to read. Defaulting to 30 matches isOverdueDebt()'s default.
--
-- The ageing rule is the one src/lib/customers/customers.ts already
-- implements, reproduced rather than reinvented: credit sales walked
-- newest-first, accumulating until they cover the current balance; the last
-- one reached is the oldest debt still owed. Using the earliest credit sale
-- instead is the bug that file documents -- a customer who first bought on
-- credit two years ago and owes for yesterday read as two years overdue.
--
-- Affected modules : Review (new), reporting
-- Rollback         : drop function review_summary(date, date, integer);
-- Risk             : low -- read-only, and unreachable without the feature.

create or replace function review_summary(
  p_from          date,
  p_to            date,
  p_overdue_days  integer default 30
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
  v_result     jsonb;
begin
  select store_id into v_store_id from staff where id = auth.uid();
  if v_store_id is null then
    raise exception 'VALIDATION_FAILED: no such store';
  end if;

  -- The gate. Before any Review data is read, not after it is filtered.
  if not current_store_has_feature('pos.review') then
    raise exception 'FEATURE_NOT_AVAILABLE';
  end if;

  -- Reading is still a reporting act; a cashier does not review the books.
  if not (auth_role() = 'admin' or has_permission('pos.report.view')) then
    raise exception 'UNAUTHORIZED_ACTION';
  end if;

  if p_from is null or p_to is null or p_to < p_from then
    raise exception 'VALIDATION_FAILED: invalid period';
  end if;

  -- Business dates are Manila dates -- take_reading() derives its business date
  -- the same way, and a Review whose period disagreed with the Z covering it
  -- would be indefensible.
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
  -- Slow moving: stocked, and sold nothing in the period. Deliberately not a
  -- judgement about the product -- the design's own wording is "needs review".
  slow_agg as (
    select count(*)::int as slow_moving_count
      from products p
     where p.store_id = v_store_id
       and p.stock > 0
       and not exists (select 1 from period_items pi where pi.product_id = p.id)
  ),
  -- The FIFO ageing rule from src/lib/customers/customers.ts, server-side.
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
    select cs.customer_id,
           min(cs.occurred_at) as oldest_at
      from credit_sales cs
      join customers c on c.id = cs.customer_id
     where c.balance > 0
       -- Walk newest-first until the running total covers what is still owed;
       -- everything up to and including that sale is unpaid.
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
          and extract(day from (clock_timestamp() - oo.oldest_at)) > p_overdue_days
      ), 0)::numeric(14,2)                                                    as utang_overdue,
      count(*) filter (
        where c.balance > 0
          and oo.oldest_at is not null
          and extract(day from (clock_timestamp() - oo.oldest_at)) > p_overdue_days
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
    'sales_total',           sa.sales_total,
    'transaction_count',     sa.transaction_count,
    'estimated_profit',      pa.estimated_profit,
    -- What share of sold value we actually know a cost for. The client must
    -- surface this rather than presenting the peso figure as complete.
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

-- The revoke discipline, named grantees and all: Supabase's default ACL grants
-- EXECUTE to anon and service_role, and "revoke from public" does not touch a
-- named grantee. See 20260902190000 for what skipping this costs.
revoke all on function review_summary(date, date, integer) from public, anon, service_role;
grant execute on function review_summary(date, date, integer) to authenticated;
