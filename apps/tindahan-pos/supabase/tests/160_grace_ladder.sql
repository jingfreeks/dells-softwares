-- =============================================================================
-- pgTAP · The §08 grace and downgrade ladder
--
-- The property under test is not "suspension blocks writes". It is
-- "suspension blocks writes AND takes nothing else away". §08 keeps reading
-- and exporting available in every state, because re-upgrading has to be
-- frictionless and because the records are the tenant's own. A suspension
-- that hid data would be a worse bug than one that never fired.
--
-- The other property, equally load-bearing: an organization with no
-- subscription row keeps working. core.grant_default_subscription()
-- swallows its own failures by design, so that state is reachable, and it
-- must read as "not yet billed", never as "suspended".
--
-- Run: psql -f supabase/tests/160_grace_ladder.sql
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
  ('da000000-0000-4000-8000-000000000001', 'grace.owner@test.local',
   '{"store_name":"Grace Test Store","owner_name":"Grace Owner"}'),
  ('db000000-0000-4000-8000-000000000002', 'grace.admin@test.local',
   '{"full_name":"Grace Admin"}');

create or replace function pg_temp.org() returns uuid language sql as $$
  select id from core.organizations where name = 'Grace Test Store'
$$;

do $$
begin
  perform core.bootstrap_platform_admin('grace.admin@test.local', 'SUPERUSER');
  update core.platform_admins set mfa_verified_at = now()
   where user_id = 'db000000-0000-4000-8000-000000000002';
end $$;

-- Created while healthy, so there is something to still be able to read later.
insert into warehouses (store_id, name, is_default)
  select pg_temp.org(), 'Back Room', false;

grant select, insert, update, delete on all tables in schema public to authenticated;

create or replace function pg_temp.set_sub(p_status text)
returns void language sql as $$
  update core.organization_subscriptions
     set status = p_status
   where organization_id = pg_temp.org() and status <> 'CANCELLED';
$$;

-- -----------------------------------------------------------------------------
-- The ladder itself, state by state
-- -----------------------------------------------------------------------------

select ok(core.org_writes_allowed(pg_temp.org()),
  'a backfilled tenant starts ACTIVE and may write');

select pg_temp.set_sub('TRIALING');
select ok(core.org_writes_allowed(pg_temp.org()),
  'TRIALING may write');

select pg_temp.set_sub('PAST_DUE');
select ok(core.org_writes_allowed(pg_temp.org()),
  'PAST_DUE may STILL write -- §08 gives grace a banner, not a lock');

select pg_temp.set_sub('SUSPENDED');
select ok(not core.org_writes_allowed(pg_temp.org()),
  'SUSPENDED may not write');

select pg_temp.set_sub('ACTIVE');
select ok(core.org_writes_allowed(pg_temp.org()),
  'and reinstating restores it');

-- The organization's own status outranks billing. This is what finally makes
-- core.is_org_member()'s "suspended = read-only, still visible" true.
update core.organizations set status = 'SUSPENDED' where id = pg_temp.org();
select ok(not core.org_writes_allowed(pg_temp.org()),
  'a SUSPENDED organization may not write even on an ACTIVE subscription');
update core.organizations set status = 'ACTIVE' where id = pg_temp.org();

select ok(not core.org_writes_allowed('00000000-0000-4000-8000-0000000000ff'),
  'an organization that does not exist gets no benefit of the doubt');

-- -----------------------------------------------------------------------------
-- Fail OPEN for a tenant that was never provisioned.
--
-- Reachable in production: grant_default_subscription() catches its own
-- exceptions so that a signup cannot fail because entitlement provisioning
-- did. A missing row means "not yet billed", never "suspended".
-- -----------------------------------------------------------------------------
do $$
declare v_sub uuid;
begin
  select id into v_sub from core.organization_subscriptions
   where organization_id = pg_temp.org();
  delete from core.organization_subscriptions where id = v_sub;
end $$;

select ok(core.org_writes_allowed(pg_temp.org()),
  'an organization with NO subscription row keeps writing -- fails open, deliberately');

-- Whereas one whose subscription was cancelled is in the retention window.
insert into core.organization_subscriptions (organization_id, plan_id, status, cancelled_at)
select pg_temp.org(), id, 'CANCELLED', now() from core.subscription_plans where code = 'BASIC';
select ok(not core.org_writes_allowed(pg_temp.org()),
  'a CANCELLED subscription is read-only -- retention, not deletion');

delete from core.organization_subscriptions where organization_id = pg_temp.org();
insert into core.organization_subscriptions (organization_id, plan_id, status)
select pg_temp.org(), id, 'ACTIVE' from core.subscription_plans where code = 'BASIC';

-- -----------------------------------------------------------------------------
-- What it actually does to a tenant: RLS, not just a boolean
-- -----------------------------------------------------------------------------
set local role authenticated;
select pg_temp.act_as('da000000-0000-4000-8000-000000000001');

select ok(public.current_store_writes_allowed(),
  'the session helper agrees the store may write');
select lives_ok($$
  insert into warehouses (store_id, name, is_default)
  select id, 'Allowed While Active', false from stores
$$, 'and a healthy tenant can create a warehouse');

reset role;
select pg_temp.set_sub('SUSPENDED');
set local role authenticated;
select pg_temp.act_as('da000000-0000-4000-8000-000000000001');

select ok(not public.current_store_writes_allowed(),
  'suspending the subscription reaches the session helper');

select throws_ok($$
  insert into warehouses (store_id, name, is_default)
  select id, 'Should Be Blocked', false from stores
$$, '42501', null, 'creating a warehouse is refused while suspended');

select throws_ok($$
  insert into purchase_orders (store_id, warehouse_id, status, created_by)
  select s.id, w.id, 'draft', auth.uid()
  from stores s join warehouses w on w.store_id = s.id and w.is_default limit 1
$$, '42501', null, 'creating a purchase order is refused while suspended');

-- THE POINT OF §08. Everything below this line must still work.
select isnt_empty($$ select 1 from warehouses $$,
  'READS still work while suspended');
select isnt_empty($$ select 1 from warehouses where name = 'Back Room' $$,
  'including records created before the suspension');
select isnt_empty($$ select 1 from categories $$,
  'and other tables entirely -- an export must still be possible');
select ok(public.current_store_has_module('INVENTORY'),
  'the module is still ENTITLED -- suspension is a billing state, not a downgrade');

-- Known limitation, asserted so it cannot change silently: POS is not gated.
select lives_ok($$
  insert into suppliers (store_id, name) select id, 'Not Gated' from stores
$$, 'suppliers are NOT blocked -- ungated surfaces stay ungated (see PLATFORM.md)');

reset role;
select pg_temp.set_sub('ACTIVE');
set local role authenticated;
select pg_temp.act_as('da000000-0000-4000-8000-000000000001');
select lives_ok($$
  insert into warehouses (store_id, name, is_default)
  select id, 'Allowed Again', false from stores
$$, 'reinstating the subscription restores write access');

-- -----------------------------------------------------------------------------
-- The banner contract
-- -----------------------------------------------------------------------------
select is((select subscription_status from public.my_store_billing_state()), 'ACTIVE',
  'my_store_billing_state reports the live status');
select is((select grace_ends_at from public.my_store_billing_state()), null,
  'with no grace deadline while ACTIVE');

reset role;
select pg_temp.set_sub('PAST_DUE');
set local role authenticated;
select pg_temp.act_as('da000000-0000-4000-8000-000000000001');

select ok((select writes_allowed from public.my_store_billing_state()),
  'PAST_DUE still reports writes_allowed -- the banner warns, it does not lock');
select isnt((select grace_ends_at from public.my_store_billing_state()), null,
  'and carries a grace deadline for the banner to name');

-- -----------------------------------------------------------------------------
-- Only a platform admin can move a tenant down the ladder
-- -----------------------------------------------------------------------------
select throws_ok($$
  select public.platform_set_subscription_status(pg_temp.org(), 'ACTIVE', 'self-serve')
$$, 'P0001', 'UNAUTHORIZED_ACTION',
   'a tenant cannot reinstate themselves');

select pg_temp.act_as('db000000-0000-4000-8000-000000000002');

select throws_ok($$
  select public.platform_set_subscription_status(pg_temp.org(), 'SUSPENDED')
$$, 'P0001', 'VALIDATION_FAILED: a reason is required to set status SUSPENDED',
   'suspending without a reason is refused -- someone will have to explain it later');

select throws_ok($$
  select public.platform_set_subscription_status(pg_temp.org(), 'NONSENSE', 'x')
$$, 'P0001', 'VALIDATION_FAILED: unknown status NONSENSE',
   'an unknown status is refused');

select lives_ok($$
  select public.platform_set_subscription_status(pg_temp.org(), 'SUSPENDED', 'non-payment, ticket #91')
$$, 'an administrator can suspend with a reason');
select ok(not core.org_writes_allowed(pg_temp.org()),
  'and it takes effect immediately');

-- -----------------------------------------------------------------------------
-- The regression this migration also fixes: changing a plan must not
-- silently reinstate a suspended tenant.
-- -----------------------------------------------------------------------------
select lives_ok($$ select public.platform_set_plan(pg_temp.org(), 'PRO', 'upsell attempt') $$,
  'a suspended tenant can still have their plan changed');
select ok(not core.org_writes_allowed(pg_temp.org()),
  'and they are STILL suspended -- a plan change is not a reinstatement');
select ok(core.module_enabled(pg_temp.org(), 'ACCOUNTING'),
  'while the new plan materialized normally -- entitlement and billing are separate');

select lives_ok($$
  select public.platform_set_subscription_status(pg_temp.org(), 'ACTIVE', 'paid')
$$, 'reinstating is the explicit, separate action');
select ok(core.org_writes_allowed(pg_temp.org()),
  'which does restore writes');

reset role;

select isnt_empty($$
  select 1 from core.platform_audit_logs
   where action = 'PLATFORM_SET_SUBSCRIPTION_STATUS'
$$, 'every status change is audited');
select isnt_empty($$
  select 1 from core.platform_audit_logs
   where action = 'PLATFORM_SET_SUBSCRIPTION_STATUS'
     and reason = 'non-payment, ticket #91'
$$, 'and the reason is what is recorded, not merely required');

select * from finish();
rollback;
