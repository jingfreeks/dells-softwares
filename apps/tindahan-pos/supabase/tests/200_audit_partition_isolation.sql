-- =============================================================================
-- pgTAP · Audit partitions are not a way around tenant isolation
--
-- core.audit_logs is FORCE RLS with a policy scoping rows to the reader's own
-- organizations. Its partitions had RLS disabled and were granted directly to
-- `authenticated`, so naming one bypassed the policy completely:
--
--     select count(*) from core.audit_logs          ->  their own rows
--     select count(*) from core.audit_logs_2026_08  ->  EVERY tenant's rows
--
-- 130_tenant_isolation asserts the property for every ordinary table. This
-- file asserts it for the partitions, which is where the property was
-- actually false.
--
-- Run: psql -f supabase/tests/200_audit_partition_isolation.sql
-- =============================================================================
begin;
set local search_path = public, core, extensions;
select * from no_plan();

create or replace function pg_temp.act_as(p_user uuid)
returns void language sql as $$
  select set_config('request.jwt.claims',
                    json_build_object('sub', p_user, 'role', 'authenticated')::text, true);
$$;

-- Two tenants. Creating them writes audit rows through the normal triggers,
-- which is what makes this test use real data rather than fixtures.
insert into auth.users (id, email, raw_user_meta_data) values
  ('ba000000-0000-4000-8000-000000000001', 'ap.one@test.local',
   '{"store_name":"Audit Part One","owner_name":"One"}'),
  ('bb000000-0000-4000-8000-000000000002', 'ap.two@test.local',
   '{"store_name":"Audit Part Two","owner_name":"Two"}');

create or replace function pg_temp.org_one() returns uuid language sql as $$
  select id from stores where name = 'Audit Part One'
$$;

-- Both tenants must actually have audit history, or the assertions below
-- would pass by there being nothing to leak.
select cmp_ok((select count(*) from core.audit_logs), '>', 0::bigint,
  'the fixture produced audit rows');
select cmp_ok((select count(distinct organization_id) from core.audit_logs), '>=', 2::bigint,
  'belonging to at least two different tenants');

-- The name of a live partition, resolved rather than hardcoded so this keeps
-- working next month.
do $$
declare v_part text;
begin
  select c.relname into v_part
  from pg_class c
  join pg_inherits i on i.inhrelid = c.oid
  where i.inhparent = 'core.audit_logs'::regclass
    and c.relname <> 'audit_logs_overflow'
  order by c.relname
  limit 1;
  execute format(
    'create or replace function pg_temp.part() returns text language sql immutable as $f$ select %L $f$',
    v_part);
end $$;

-- -----------------------------------------------------------------------------
-- Every partition has RLS on, and none is granted to a tenant role
-- -----------------------------------------------------------------------------

select is(
  (select count(*)::int from pg_class c
   join pg_inherits i on i.inhrelid = c.oid
   where i.inhparent = 'core.audit_logs'::regclass and not c.relrowsecurity),
  0, 'no partition of core.audit_logs has RLS disabled');

select is(
  (select count(*)::int from pg_class c
   join pg_inherits i on i.inhrelid = c.oid
   where i.inhparent = 'core.audit_logs'::regclass
     and has_table_privilege('authenticated', c.oid, 'SELECT')),
  0, 'and none of them is directly readable by `authenticated`');

-- -----------------------------------------------------------------------------
-- The leak itself, as a tenant
-- -----------------------------------------------------------------------------
set local role authenticated;
select pg_temp.act_as('ba000000-0000-4000-8000-000000000001');

-- Through the parent: their own rows, and only their own.
select cmp_ok((select count(*) from core.audit_logs), '>', 0::bigint,
  'a tenant sees their own audit history through the parent');
select is(
  (select count(*)::int from core.audit_logs where organization_id <> pg_temp.org_one()),
  0, 'and none of anyone else''s');

-- Directly at a partition. The property is "a tenant cannot reach another
-- tenant's rows this way" -- which holds whether the attempt is refused by
-- the missing grant (what this fix does) or filtered to nothing by the
-- partition's own RLS (the second layer). Asserting one specific failure
-- mode would break the moment the other one carried the weight, so the
-- helper treats a refusal as "saw nothing" and counts what actually leaked.
create or replace function pg_temp.foreign_rows_visible_via_partition()
returns int language plpgsql as $$
declare n int;
begin
  execute format(
    'select count(*)::int from core.%I where organization_id <> %L',
    pg_temp.part(), pg_temp.org_one()
  ) into n;
  return n;
exception
  when insufficient_privilege then return 0;   -- refused outright: nothing seen
end;
$$;

select is(pg_temp.foreign_rows_visible_via_partition(), 0,
  'and naming a partition directly exposes NONE of them -- the leak itself');

select * from finish();
rollback;
