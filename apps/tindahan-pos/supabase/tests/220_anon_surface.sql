-- =============================================================================
-- pgTAP · What an unauthenticated visitor can reach
--
-- Two opposite mistakes are possible here and both have been made in this
-- repository already:
--
--   granting `anon` too little -- 20260815101000 gave it nothing, which broke
--   the pre-login feature-flag read in any fresh environment, because
--   FeatureFlagsProvider is mounted OUTSIDE AuthProvider and runs before
--   anyone signs in;
--
--   granting `anon` too much -- the reason that migration was cautious in the
--   first place, since anything anon can read is readable by the whole
--   internet with a key that ships in the bundle.
--
-- So this file pins BOTH edges: the one table that must be readable, and the
-- rule that it is the only one.
--
-- Run: psql -f supabase/tests/220_anon_surface.sql
-- =============================================================================
begin;
set local search_path = public, core, extensions;
select * from no_plan();

-- -----------------------------------------------------------------------------
-- The one table the app genuinely needs before login
-- -----------------------------------------------------------------------------

select ok(has_table_privilege('anon', 'public.feature_flags', 'SELECT'),
  'anon can read feature_flags -- FeatureFlagsProvider runs before sign-in');

select isnt_empty($$
  select 1 from pg_policies
   where schemaname = 'public' and tablename = 'feature_flags' and cmd = 'SELECT'
$$, 'and a select policy exists for it to pass through');

-- Readable, not writable: a flag flipped by an anonymous visitor would change
-- behaviour for every tenant at once.
select ok(not has_table_privilege('anon', 'public.feature_flags', 'INSERT'),
  'but anon cannot insert flags');
select ok(not has_table_privilege('anon', 'public.feature_flags', 'UPDATE'),
  'nor update them');
select ok(not has_table_privilege('anon', 'public.feature_flags', 'DELETE'),
  'nor delete them');

-- -----------------------------------------------------------------------------
-- And nothing else. This is the assertion that matters most: the anon key
-- ships inside the JavaScript bundle, so every table anon can read is
-- effectively public.
-- -----------------------------------------------------------------------------

-- Resolved by OID rather than by name: pg_tables lists some rows whose
-- qualified name does not resolve (auth's `instances` among them), and
-- has_table_privilege on a text name then raises rather than returning false.
select is(
  (select coalesce(string_agg(c.relname, ', ' order by c.relname), '(none)')
   from pg_class c
   join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relkind in ('r', 'p')
     and c.relname <> 'feature_flags'
     and has_table_privilege('anon', c.oid, 'SELECT')),
  '(none)',
  'anon can read NO other table in public');

select is(
  (select coalesce(string_agg(c.relname, ', ' order by c.relname), '(none)')
   from pg_class c
   join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relkind in ('r', 'p')
     and (has_table_privilege('anon', c.oid, 'INSERT')
       or has_table_privilege('anon', c.oid, 'UPDATE')
       or has_table_privilege('anon', c.oid, 'DELETE'))),
  '(none)',
  'and can write to none of them');

-- core is not exposed to PostgREST at all, but a grant here would be a step
-- towards making that irrelevant.
select is(
  (select count(*)::int from pg_class c
   join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'core' and c.relkind in ('r', 'p')
     and has_table_privilege('anon', c.oid, 'SELECT')),
  0, 'and reaches nothing in core');

-- -----------------------------------------------------------------------------
-- The roles that DO need access still have it -- so a future "tighten anon"
-- change cannot quietly take the applications down with it.
-- -----------------------------------------------------------------------------

select ok(has_table_privilege('authenticated', 'public.staff', 'SELECT'),
  'authenticated can still read its own staff row');
select ok(has_table_privilege('service_role', 'public.staff', 'INSERT'),
  'and service_role can still write, for the Edge Functions');

select * from finish();
rollback;
