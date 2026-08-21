-- =============================================================================
-- Enforce the numeric plan limits (Architecture v1 §08)
-- -----------------------------------------------------------------------------
-- `organization_modules.limits` has been seeded but inert since the
-- entitlement migration, which deferred this deliberately:
--
--   "adding them here could instantly break a tenant who is ALREADY over a
--    limit we just invented. Enforcement needs an 'is anyone already over?'
--    audit first, then its own migration."
--
-- This is that migration. The audit is `supabase/snippets/limit-audit.sql`
-- and RUNNING IT BEFORE APPLYING THIS TO REAL DATA IS THE POINT -- see the
-- rollout note at the bottom.
--
-- WHY TRIGGERS AND NOT POLICIES. §08 specifies constraint triggers "so a
-- limit cannot be exceeded by any code path", and here that is load-bearing
-- rather than decorative: devices are inserted by the pair-device Edge
-- Function through the service_role client, which bypasses RLS entirely. A
-- policy would enforce the device limit against nobody. A trigger holds for
-- service_role, for the SQL editor, and for a future job equally.
--
-- WHAT "ALREADY OVER" MEANS HERE. Enforcement is INSERT-only and compares
-- the current count against the cap. A tenant already over keeps everything
-- they have -- nothing is deleted, hidden, or made read-only -- they simply
-- cannot add more until their limit rises. That is the mildest failure mode
-- available, and it is why the audit is advisory rather than blocking. It is
-- still a surprise for whoever hits it, which is exactly what the audit is
-- for.
--
-- COUNTING RULES, which matter more than they look:
--
--   devices     only those still paired (unpaired_at is null). Pairing always
--               inserts a NEW row and unpairing only stamps unpaired_at, so
--               counting history would penalise a store for having replaced
--               a terminal -- it would hit a cap of 3 on its fourth ever
--               device while holding one. This mirrors §08's own example,
--               which counts `status <> 'REVOKED'`.
--   branches    excludes CLOSED, for the same reason.
--   products    every row; there is no archive flag to respect.
--   warehouses  every row, including the default one the store is created
--               with -- so a cap of 3 means three, not four.
--
-- ABSENT MEANS UNLIMITED. A missing key, a missing module row, or an
-- organization with no entitlement at all is not capped. ENTERPRISE ships
-- `{}` precisely so it means "no ceilings", and an unprovisioned tenant must
-- not inherit a limit of zero. Fails open, consistent with
-- core.org_writes_allowed().
--
-- Affected schemas : core (2 functions, 1 trigger), public (3 triggers)
-- Rollback         : drop the four triggers, then the two functions
-- Risk             : none for a tenant under their limits; for one already
--                    over, new rows of that kind are refused while existing
--                    data is untouched. Verify with the audit first.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- The cap, or null for "no ceiling".
-- -----------------------------------------------------------------------------

create or replace function core.limit_for(p_org uuid, p_module text, p_key text)
returns int
language sql
stable
security definer
set search_path = core, pg_temp
as $$
  select nullif(om.limits ->> p_key, '')::int
  from core.organization_modules om
  where om.organization_id = p_org
    and om.module_code = upper(p_module);
$$;

comment on function core.limit_for is
  'The numeric ceiling for one limit key, or NULL meaning unlimited. NULL is '
  'also the answer for an organization with no entitlement row, deliberately: '
  'a provisioning gap must not read as a limit of zero.';

-- -----------------------------------------------------------------------------
-- The check itself, in one place so every trigger fails identically.
-- -----------------------------------------------------------------------------

create or replace function core.enforce_limit(
  p_org     uuid,
  p_module  text,
  p_key     text,
  p_current int
)
returns void
language plpgsql
stable
security definer
set search_path = core, pg_temp
as $$
declare
  v_cap int := core.limit_for(p_org, p_module, p_key);
begin
  if v_cap is not null and p_current >= v_cap then
    raise exception 'LIMIT_EXCEEDED: % (max %)', p_key, v_cap
      using errcode = 'P0001';
  end if;
end;
$$;

comment on function core.enforce_limit is
  'Raises LIMIT_EXCEEDED when adding one more would exceed the cap. Called '
  'with the count BEFORE the insert, so the comparison is >= rather than >.';

-- -----------------------------------------------------------------------------
-- devices -> POS.devices
--
-- The only one of these reachable solely through service_role, and therefore
-- the one that proves a policy would not have been enough.
-- -----------------------------------------------------------------------------

create or replace function public.enforce_device_limit()
returns trigger
language plpgsql
security definer
set search_path = public, core, pg_temp
as $$
begin
  perform core.enforce_limit(
    new.store_id, 'POS', 'devices',
    (select count(*)::int from public.devices
      where store_id = new.store_id and unpaired_at is null)
  );
  return new;
end;
$$;

create trigger trg_devices_limit
  before insert on public.devices
  for each row execute function public.enforce_device_limit();

-- -----------------------------------------------------------------------------
-- products -> POS.products
-- -----------------------------------------------------------------------------

create or replace function public.enforce_product_limit()
returns trigger
language plpgsql
security definer
set search_path = public, core, pg_temp
as $$
begin
  perform core.enforce_limit(
    new.store_id, 'POS', 'products',
    (select count(*)::int from public.products where store_id = new.store_id)
  );
  return new;
end;
$$;

create trigger trg_products_limit
  before insert on public.products
  for each row execute function public.enforce_product_limit();

-- -----------------------------------------------------------------------------
-- warehouses -> INVENTORY.warehouses
--
-- Counts the default warehouse every store is created with, so a cap of 3
-- allows two more. Stated because the alternative reading is just as
-- plausible and would silently hand everyone an extra one.
-- -----------------------------------------------------------------------------

create or replace function public.enforce_warehouse_limit()
returns trigger
language plpgsql
security definer
set search_path = public, core, pg_temp
as $$
begin
  perform core.enforce_limit(
    new.store_id, 'INVENTORY', 'warehouses',
    (select count(*)::int from public.warehouses where store_id = new.store_id)
  );
  return new;
end;
$$;

create trigger trg_warehouses_limit
  before insert on public.warehouses
  for each row execute function public.enforce_warehouse_limit();

-- -----------------------------------------------------------------------------
-- core.branches -> POS.branches
--
-- Nothing creates branches today: the tenancy backfill synthesized exactly
-- one per store and no application writes this table. Included anyway
-- because the limit is seeded and a multi-branch feature is a certainty --
-- and adding the ceiling before the feature is far cheaper than retrofitting
-- it onto tenants who have already spread out.
-- -----------------------------------------------------------------------------

create or replace function core.enforce_branch_limit()
returns trigger
language plpgsql
security definer
set search_path = core, pg_temp
as $$
begin
  perform core.enforce_limit(
    new.organization_id, 'POS', 'branches',
    (select count(*)::int from core.branches
      where organization_id = new.organization_id and status <> 'CLOSED')
  );
  return new;
end;
$$;

create trigger trg_branches_limit
  before insert on core.branches
  for each row execute function core.enforce_branch_limit();

revoke all on function core.limit_for(uuid, text, text)          from public;
revoke all on function core.enforce_limit(uuid, text, text, int) from public;
grant execute on function core.limit_for(uuid, text, text) to authenticated, app_pos, app_inv, app_acc, app_admin;

-- -----------------------------------------------------------------------------
-- ROLLOUT
--
--   1. Run supabase/snippets/limit-audit.sql against the target database.
--   2. If it returns rows, raise those tenants' limits or move their plan
--      BEFORE applying this. Do not break someone who was never told there
--      was a ceiling.
--   3. Apply. An empty audit means this is a no-op for every existing tenant.
--
-- A note on cost: each insert runs one count(*) scoped to the tenant, served
-- by the existing per-store indexes. Cheap at these cardinalities. If the
-- products count ever becomes hot, the fix is a maintained counter rather
-- than a weaker limit.
-- -----------------------------------------------------------------------------
