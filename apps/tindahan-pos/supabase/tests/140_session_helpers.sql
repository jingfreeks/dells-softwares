-- =============================================================================
-- pgTAP · core.current_user_id(), the session primitive
--
-- Every other guard in this suite assumes this function answers rather than
-- throws. It is called by is_org_member, auth_org_ids, auth_staff_id,
-- is_platform_admin, write_audit and every platform_* function, and it is
-- evaluated inside RLS predicates -- so if it raises, the query raises. It
-- does not fail closed, it fails loudly and in the middle of someone's sale.
--
-- The case that matters is the empty string. `current_setting(..., true)`
-- returns NULL only until a setting has been assigned once; after a
-- transaction-local set_config reverts at commit it returns ''. PostgREST
-- assigns request.jwt.claims exactly that way, per request, on pooled
-- connections -- so '' is the normal resting state of a live connection
-- between requests, not an exotic one.
--
-- Run: psql -f supabase/tests/140_session_helpers.sql
-- =============================================================================
begin;
set local search_path = public, core, extensions;
select * from no_plan();

-- Never assigned on this connection.
select is(core.current_user_id(), null,
  'unset claims resolve to NULL, not an error');

-- Assigned and reverted -- what a pooled connection looks like between
-- requests. This is the regression: before the fix, ''::jsonb raised
-- "invalid input syntax for type json" here.
select set_config('request.jwt.claims', '', true) as ignore \gset
select is(core.current_user_id(), null,
  'an EMPTY claims setting resolves to NULL rather than raising');

select lives_ok($$ select core.current_user_id() $$,
  'and calling it on an empty setting does not throw');

-- Downstream helpers must survive the same state, since they are what RLS
-- actually evaluates.
select lives_ok($$ select core.is_org_member('00000000-0000-4000-8000-000000000000') $$,
  'is_org_member survives an empty claims setting');
select lives_ok($$ select core.is_platform_admin() $$,
  'is_platform_admin survives an empty claims setting');
select is((select count(*)::int from core.auth_org_ids()), 0,
  'auth_org_ids returns no organizations for an empty claims setting');

-- A real claim still resolves -- the fix must not have broken the happy path.
select set_config('request.jwt.claims',
                  '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}',
                  true) as ignore \gset
select is(core.current_user_id(), '11111111-1111-4111-8111-111111111111'::uuid,
  'a real claim still resolves to its subject');

-- Malformed claims are a different problem and should still be loud: this
-- guard is about absence, not about accepting rubbish.
select set_config('request.jwt.claims', 'not json', true) as ignore \gset
select throws_ok($$ select core.current_user_id() $$, '22P02', null,
  'genuinely malformed claims still raise -- absence is excused, garbage is not');

select * from finish();
rollback;
