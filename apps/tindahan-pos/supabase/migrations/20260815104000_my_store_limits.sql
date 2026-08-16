-- =============================================================================
-- Tenant contract · let a store see its own ceilings
-- -----------------------------------------------------------------------------
-- Enforcement (20260815102000) and the operator's view (20260815103000) both
-- exist. The tenant has neither. Today a shop owner at three of three
-- warehouses gets no hint of it, types a name, submits, and receives:
--
--     LIMIT_EXCEEDED: warehouses (max 3)
--
-- That is the raw exception text reaching a user's screen. It happens to
-- contain the number, which is the only reason it is not worse.
--
-- The platform already computes exactly what would have prevented that
-- confusion -- core.limit_usage() and core.limit_for() -- but both live in
-- `core`, which is not exposed to PostgREST, so a browser cannot ask. Hence
-- a narrow public wrapper, scoped to the caller's OWN store.
--
-- Deliberately not platform_organization_limits() with a different guard:
-- that one takes an organization id and answers for any tenant an
-- administrator names. This one takes no argument at all. A tenant cannot
-- express "tell me about someone else" even by accident, which is a cheaper
-- guarantee than a check that has to be right.
--
-- Affected schemas : public (one new function)
-- Rollback         : drop it
-- Risk             : none -- read-only, own store only, and every value it
--                    returns is already visible to that tenant by counting
-- =============================================================================

create or replace function public.my_store_limits()
returns table (
  module_code   text,
  limit_key     text,
  cap           int,
  current_usage int
)
language sql
stable
security definer
set search_path = public, core, pg_temp
as $$
  select
    om.module_code,
    kv.key,
    nullif(kv.value #>> '{}', '')::int,
    core.limit_usage(auth_store_id(), kv.key)
  from core.organization_modules om
  cross join lateral jsonb_each(om.limits) as kv(key, value)
  where om.organization_id = auth_store_id()
  order by om.module_code, kv.key;
$$;

comment on function public.my_store_limits is
  'The calling staff member''s own store''s ceilings and current usage. Takes '
  'no argument on purpose -- it can only ever answer for auth_store_id(). '
  'Usage comes from core.limit_usage(), the same function the enforcement '
  'triggers call, so what a tenant is shown is what they will hit.';

revoke all on function public.my_store_limits() from public;
grant execute on function public.my_store_limits() to authenticated;
