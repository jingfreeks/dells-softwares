-- 20260815134000_report_reconciliation.sql
--
-- BIR Compliance Audit, Phase 4b: end-of-day/Z-reading report + a
-- reconciliation check comparing a report's displayed total against an
-- independently-computed SUM(). The Z-reading itself needs no backend
-- change (a pure reporting-layer aggregation over data the app already
-- has) -- this is the one genuinely new backend surface: a from-scratch
-- server-side SUM(), independent of the client's own aggregation code
-- path, over the same date range the client already fetched via
-- fetchSalesInRange().

create or replace function report_reconciliation(p_start timestamptz, p_end timestamptz)
returns table (total numeric, transaction_count bigint)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_store_id uuid;
begin
  v_store_id := auth_store_id();
  if v_store_id is null then
    raise exception 'Not a registered staff member of any store';
  end if;
  if not (auth_role() = 'admin' or has_permission('pos.report.view')) then
    raise exception 'UNAUTHORIZED_ACTION';
  end if;

  return query
    select coalesce(sum(sales.total), 0), count(*)
    from sales
    where sales.store_id = v_store_id
      and sales.status = 'completed'
      and sales.created_at >= p_start
      and sales.created_at <= p_end;
end;
$$;

revoke all on function report_reconciliation(timestamptz, timestamptz) from public, anon, service_role;
grant execute on function report_reconciliation(timestamptz, timestamptz) to authenticated;
