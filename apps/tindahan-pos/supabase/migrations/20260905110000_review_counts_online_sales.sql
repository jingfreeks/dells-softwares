-- Review was counting only offline sales
--
-- review_summary() (20260904120000) bounded its period on sales.occurred_at:
--
--     and s.occurred_at >= v_from and s.occurred_at < v_to
--
-- occurred_at is NOT when a sale happened. checkout_sale() writes it straight
-- from p_occurred_at, and the client sends that ONLY when replaying a sale
-- that was queued offline. Every ordinary online sale has occurred_at NULL,
-- and NULL fails both comparisons -- so the period matched offline replays and
-- nothing else.
--
-- The app has always known this. saleService.ts maps the column as
--
--     timestamp: row.occurred_at ?? row.created_at   // "set only for a sale
--                                                    //  that was queued
--                                                    //  offline and synced"
--
-- and take_reading() bounds its period on created_at for the same reason,
-- using occurred_at only to detect a LATE entry, where NULL correctly means
-- "not late". I read neither before writing the filter.
--
-- WHAT IT MEANT IN PRACTICE
--
-- A store that never went offline saw a Review of zero: no sales, no profit,
-- no best sellers, every stocked product "slow moving" because nothing had
-- sold in the period. A store that had gone offline saw figures built from
-- that subset alone, which is worse -- wrong numbers that look plausible.
--
-- Overdue utang was hit by the same NULL. The FIFO walk ordered by
-- occurred_at and took min(occurred_at) as the oldest unpaid debt; for online
-- credit sales that is NULL, min() skips nulls, and a customer with only
-- online credit sales had no age at all, so they were never overdue.
--
-- THE FIX
--
-- coalesce(occurred_at, created_at) everywhere the question is "when did this
-- sale happen", which is the same expression saleService.ts already uses. Not
-- a new convention -- the existing one, applied where I failed to apply it.
--
-- AND THE INDEX IT NEEDS
--
-- There was never an index for this predicate: sales carries
-- (store_id, created_at desc) from 0001_init and nothing on occurred_at. So
-- every Review was a sequential scan of the store's sales. The expression
-- index below matches the corrected predicate exactly.
--
-- Affected modules : Review
-- Rollback         : re-apply 20260905100000's review_summary();
--                    drop index sales_store_happened_idx;
-- Risk             : low -- read-only, and it can only widen what was counted.
--                    Every figure it changes was wrong before.

-- Concurrent build would be better on a large table, but a migration runs in a
-- transaction and CREATE INDEX CONCURRENTLY cannot. sales is small per store
-- and this is a new index rather than a rebuild, so the lock is brief.
create index if not exists sales_store_happened_idx
  on sales (store_id, (coalesce(occurred_at, created_at)));

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
