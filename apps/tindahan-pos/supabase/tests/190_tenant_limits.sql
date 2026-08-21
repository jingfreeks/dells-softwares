-- =============================================================================
-- pgTAP · my_store_limits() -- a tenant seeing its own ceilings
--
-- Two properties. First, the number a tenant is shown must be the number the
-- trigger will enforce, or the warning is worse than none. Second, it must be
-- impossible to aim at another tenant -- the function takes no argument, so
-- this is checked by confirming two stores get different answers from the
-- identical call.
--
-- Run: psql -f supabase/tests/190_tenant_limits.sql
-- =============================================================================
begin;
set local search_path = public, core, extensions;
select * from no_plan();

create or replace function pg_temp.act_as(p_user uuid)
returns void language sql as $$
  select set_config('request.jwt.claims',
                    json_build_object('sub', p_user, 'role', 'authenticated')::text, true);
$$;

insert into auth.users (id, email, raw_user_meta_data) values
  ('ca000000-0000-4000-8000-000000000001', 'tl.one@test.local',
   '{"store_name":"Tenant Limits One","owner_name":"One"}'),
  ('cb000000-0000-4000-8000-000000000002', 'tl.two@test.local',
   '{"store_name":"Tenant Limits Two","owner_name":"Two"}');

create or replace function pg_temp.org_one() returns uuid language sql as $$
  select id from stores where name = 'Tenant Limits One'
$$;

-- Store one goes to its warehouse ceiling; store two stays put.
insert into warehouses (store_id, name, is_default)
select pg_temp.org_one(), 'W'||g, false from generate_series(1,2) g;

set local role authenticated;
select pg_temp.act_as('ca000000-0000-4000-8000-000000000001');

select isnt_empty($$ select 1 from public.my_store_limits() $$,
  'a tenant can see their own limits');

select is((select cap from public.my_store_limits() where limit_key = 'warehouses'), 3,
  'the BASIC warehouse ceiling');
select is((select current_usage from public.my_store_limits() where limit_key = 'warehouses'), 3,
  'and their live usage -- they are at it');

-- The property that makes the warning trustworthy.
reset role;
select throws_ok($$ insert into warehouses (store_id, name, is_default)
                    select pg_temp.org_one(), 'One too many', false $$,
  'P0001', 'LIMIT_EXCEEDED: warehouses (max 3)',
  'and the trigger refuses at exactly the number they were shown');

-- -----------------------------------------------------------------------------
-- The same call, a different tenant, a different answer
-- -----------------------------------------------------------------------------
set local role authenticated;
select pg_temp.act_as('cb000000-0000-4000-8000-000000000002');

select is((select current_usage from public.my_store_limits() where limit_key = 'warehouses'), 1,
  'the second store sees ITS usage, not the first store''s');
select is((select cap from public.my_store_limits() where limit_key = 'warehouses'), 3,
  'with its own ceiling');

-- No argument exists to aim elsewhere, so the worst a tenant can do is ask
-- about themselves. Signing out entirely must yield nothing rather than
-- everything.
reset role;
set local role authenticated;
select set_config('request.jwt.claims', '', true) as ignore \gset
select is((select count(*)::int from public.my_store_limits()), 0,
  'no session, no rows -- it fails closed rather than open');

reset role;
select * from finish();
rollback;
