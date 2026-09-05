-- review_history() -- the months there is something to review
--
-- Derived, not stored. Tindahan_POS_Review_Product_Decisions.md §3 is explicit:
--
--     For the current Review release, Review History is DERIVED.
--     Do not create a `reviews` table.
--     Do not invent persistence or a "reviewed" state.
--
-- So there is no reviews table here, no reviewed_by, no reviewed_at, no
-- review_status and no review_notes. The mockup's "Reviewed" chip is dropped
-- rather than backed by a column nothing ever sets -- a status that is always
-- the same value is not a status, it is decoration that implies someone
-- checked.
--
-- MONTHS WITH ACTIVITY, NOT EVERY MONTH SINCE THE FIRST SALE
--
-- The decision says history is generated "from the underlying store
-- activity/data for each applicable month". A month the shop sold nothing in
-- has nothing to review, and listing it invites the owner to open an empty
-- report and wonder what they are missing. Only months with at least one
-- completed sale come back.
--
-- A SEPARATE FUNCTION, NOT A KEY ON review_summary()
--
-- review_summary() is period-scoped; this is the whole life of the store.
-- Folding it in would make every dashboard load compute a list only the
-- history view reads, and would muddle "what happened in September" with
-- "which months exist".
--
-- Same gate, deliberately: the Growth entitlement and pos.report.view, checked
-- before any row is read. A Starter user calling this directly is refused
-- exactly as they are refused review_summary() -- §20 of the integration
-- prompt asks that a direct call not bypass the plan, and a second entry point
-- is a second chance to get that wrong.
--
-- Months are bucketed on the Manila calendar, and arrival is
-- coalesce(occurred_at, created_at), both matching review_summary(). A history
-- row that disagreed with the report it opens would be worse than no history.
--
-- Affected modules : Review
-- Rollback         : drop function review_history(integer);
-- Risk             : low -- read-only, new function, nothing else reads it.

create or replace function review_history(p_limit integer default 24)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, core, extensions
as $function$
declare
  v_store_id uuid;
  v_result   jsonb;
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

  if p_limit is null or p_limit < 1 or p_limit > 120 then
    raise exception 'VALIDATION_FAILED: invalid limit';
  end if;

  select coalesce(jsonb_agg(m order by m.month desc), '[]'::jsonb)
    into v_result
    from (
      select
        to_char(date_trunc('month', (coalesce(s.occurred_at, s.created_at) at time zone 'Asia/Manila')), 'YYYY-MM')
          as month,
        -- The bounds the row opens with, so the client does not recompute a
        -- month's length and risk disagreeing with what was counted.
        date_trunc('month', (coalesce(s.occurred_at, s.created_at) at time zone 'Asia/Manila'))::date
          as period_from,
        (date_trunc('month', (coalesce(s.occurred_at, s.created_at) at time zone 'Asia/Manila'))
          + interval '1 month' - interval '1 day')::date
          as period_to,
        sum(s.total)::numeric(14,2) as sales_total,
        count(*)::int               as transaction_count
        from sales s
       where s.store_id = v_store_id
         and s.status = 'completed'
       group by 1, 2, 3
       order by month desc
       limit p_limit
    ) m;

  return v_result;
end;
$function$;

revoke all on function review_history(integer) from public, anon, service_role;
grant execute on function review_history(integer) to authenticated;
