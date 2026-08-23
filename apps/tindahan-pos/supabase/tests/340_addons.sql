-- =============================================================================
-- pgTAP · ADDON source -- request_addon() and durability across plan changes
--
-- An "add-on" already worked mechanically via MANUAL before this migration
-- -- this pins the one thing that's actually new: a distinct ADDON source
-- that both materialize functions protect exactly the same way, and the
-- self-serve request path that has no self-activation power at all.
--
-- Run: psql -f supabase/tests/340_addons.sql
-- =============================================================================
begin;
set local search_path = public, core, extensions;
select * from no_plan();

create or replace function pg_temp.act_as(p_user uuid, p_aal text default 'aal2')
returns void language sql as $$
  select set_config('request.jwt.claims',
                    json_build_object('sub', p_user, 'role', 'authenticated', 'aal', p_aal)::text,
                    true);
$$;

insert into auth.users (id, email, raw_user_meta_data) values
  ('aa300000-0000-4000-8000-000000000001', 'addon.tenant@test.local',
   '{"store_name":"Addon Check Store","owner_name":"Owner"}'),
  ('aa300000-0000-4000-8000-000000000002', 'addon.admin@test.local',
   '{"full_name":"Addon Admin"}');

select core.bootstrap_platform_admin('addon.admin@test.local', 'SUPERUSER') into pg_temp.discard;
update core.platform_admins set mfa_verified_at = now()
 where user_id = 'aa300000-0000-4000-8000-000000000002';

create or replace function pg_temp.org() returns uuid language sql as $$
  select id from core.organizations where name = 'Addon Check Store'
$$;

-- -----------------------------------------------------------------------------
-- request_addon() -- the self-serve half, no activation power at all
-- -----------------------------------------------------------------------------
set local role authenticated;
select pg_temp.act_as('aa300000-0000-4000-8000-000000000001');

select throws_ok(
  $$ select public.request_addon('POS') $$,
  'INVALID_ADDON_REQUEST',
  'only ACCOUNTING is a real add-on request today -- an unrelated module code is rejected'
);
select throws_ok(
  $$ select public.request_addon('NOT_A_REAL_MODULE') $$,
  'INVALID_ADDON_REQUEST',
  'and an unknown code the same way'
);
select lives_ok(
  $$ select public.request_addon('ACCOUNTING') $$,
  'a signed-in tenant can request the ACCOUNTING add-on'
);
select ok(
  (select notes from core.organization_subscriptions where organization_id = pg_temp.org())
    like '%Requested add-on: ACCOUNTING%',
  'and the request lands as a note, same shape as request_plan_upgrade()'
);
select ok(
  not core.module_enabled(pg_temp.org(), 'ACCOUNTING'),
  'requesting it does not activate anything -- console-granted only'
);

reset role;
select ok(
  not has_function_privilege('anon', 'public.request_addon(text)', 'EXECUTE'),
  'anon cannot call request_addon()'
);
select ok(
  not has_function_privilege('service_role', 'public.request_addon(text)', 'EXECUTE'),
  'nor service_role'
);

-- -----------------------------------------------------------------------------
-- platform_set_module(..., p_source => 'ADDON') -- the fulfillment half
-- -----------------------------------------------------------------------------
set local role authenticated;
select pg_temp.act_as('aa300000-0000-4000-8000-000000000002');

select throws_ok(
  $$ select public.platform_set_module(pg_temp.org(), 'ACCOUNTING', true, 'fulfilling addon request', 'NOT_A_SOURCE') $$,
  'VALIDATION_FAILED: unknown source NOT_A_SOURCE',
  'an unrecognized source is rejected rather than silently accepted'
);
select lives_ok(
  $$ select public.platform_set_module(pg_temp.org(), 'ACCOUNTING', true, 'fulfilling addon request', 'ADDON') $$,
  'an admin can grant the module tagged as a paid add-on'
);
select is(
  (select source from core.organization_modules
    where organization_id = pg_temp.org() and module_code = 'ACCOUNTING'),
  'ADDON',
  'and the row is actually tagged ADDON, not MANUAL -- distinguishable from a comp'
);
select ok(
  core.module_enabled(pg_temp.org(), 'ACCOUNTING'),
  'and the module is genuinely enabled now'
);

-- Default source is still MANUAL when the operator doesn't pass one --
-- every existing 4-arg call site keeps behaving exactly as before.
select lives_ok(
  $$ select public.platform_set_module(pg_temp.org(), 'INVENTORY', true, 'ordinary comp') $$,
  'the original 4-arg call shape still works unchanged'
);
select is(
  (select source from core.organization_modules
    where organization_id = pg_temp.org() and module_code = 'INVENTORY'),
  'MANUAL',
  'and defaults to MANUAL exactly as it always has'
);

-- -----------------------------------------------------------------------------
-- Durability: an ADDON-sourced grant survives a plan change, the same way
-- a MANUAL one already did.
-- -----------------------------------------------------------------------------
do $$ begin perform core.materialize_subscription_modules(pg_temp.org()); end $$;
select ok(
  core.module_enabled(pg_temp.org(), 'ACCOUNTING'),
  'ACCOUNTING survives a re-materialize against the store''s current plan -- the exact operation a plan change triggers'
);
select is(
  (select source from core.organization_modules
    where organization_id = pg_temp.org() and module_code = 'ACCOUNTING'),
  'ADDON',
  'and stays tagged ADDON -- re-materializing never overwrites it back to SUBSCRIPTION'
);

select * from finish();
rollback;
