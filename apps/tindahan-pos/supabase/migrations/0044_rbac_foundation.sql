-- 0044_rbac_foundation.sql
--
-- Real RBAC layer, additive on top of the existing staff.role enum.
--
-- 0043 deliberately punted on this ("A full per-cashier granular permission
-- system would mean rewriting most of those checkpoints -- a large change
-- to the app's core security model, deliberately out of scope"). The Staff
-- page's RoleSelector/rolePermissionChips() already show an illustrative
-- "owner / supervisor / cashier" picker with a TODO to back it with a real
-- schema once one exists. This migration is that schema.
--
-- Design: staff.role stays exactly as it is ('admin' | 'cashier') and every
-- existing admin-only RLS policy this migration doesn't touch keeps working
-- unchanged. On top of that, a staff row can hold zero or more granular
-- permissions via staff_roles -> role_permissions -> permissions. An admin
-- implicitly has every permission (see has_permission() below) -- OWNER is
-- not a separate privilege source, it mirrors staff.role = 'admin'.
--
-- 0045 wires has_permission() into the two checkpoints that currently have
-- no enforcement at all (transfer_stock, void_sale's hardcoded admin check)
-- and extends the existing admin-only write policies for a specific list of
-- tables so a non-admin holding the matching permission can use them too.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table permissions (
  code text primary key,
  module_code text not null,
  description text not null
);

create table roles (
  id uuid primary key default gen_random_uuid(),
  store_id uuid references stores (id) on delete cascade,
  code text not null,
  name text not null,
  is_system boolean not null default false,
  created_at timestamptz not null default now()
);

-- store_id is null for the 3 seeded system roles (OWNER/SUPERVISOR/CASHIER),
-- shared across every store. Per-store custom roles (store_id not null) are
-- schema-ready but there is no UI to create one yet -- out of scope here.
create unique index roles_system_code_key on roles (code) where store_id is null;
create unique index roles_store_code_key on roles (store_id, code) where store_id is not null;

create table role_permissions (
  role_id uuid not null references roles (id) on delete cascade,
  permission_code text not null references permissions (code) on delete cascade,
  primary key (role_id, permission_code)
);

create table staff_roles (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid not null references staff (id) on delete cascade,
  role_id uuid not null references roles (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (staff_id, role_id)
);

create index staff_roles_staff_id_idx on staff_roles (staff_id);

alter table permissions enable row level security;
alter table roles enable row level security;
alter table role_permissions enable row level security;
alter table staff_roles enable row level security;

-- permissions / system roles / their grants are platform reference data:
-- readable by any signed-in staff member (needed to render e.g. the role
-- picker's permission preview), writable by nobody through the client.
create policy "any staff can view permissions"
  on permissions for select
  using (auth.uid() is not null);

create policy "any staff can view system roles"
  on roles for select
  using (store_id is null or store_id = auth_store_id());

create policy "any staff can view role permissions"
  on role_permissions for select
  using (
    exists (
      select 1 from roles
      where roles.id = role_permissions.role_id
        and (roles.store_id is null or roles.store_id = auth_store_id())
    )
  );

-- staff_roles: any staff of the store can see who holds what (mirrors the
-- existing "admin views roster" shape, but read is store-wide since this
-- also drives UI like the permission preview on the Staff page). Writes
-- only ever happen inside assign_staff_role() / the backfill below.
create policy "staff can view store staff_roles"
  on staff_roles for select
  using (
    exists (
      select 1 from staff
      where staff.id = staff_roles.staff_id
        and staff.store_id = auth_store_id()
    )
  );

-- ---------------------------------------------------------------------------
-- Seed: permissions, system roles, grants
-- ---------------------------------------------------------------------------

insert into permissions (code, module_code, description) values
  ('staff.manage', 'core', 'Create/edit/deactivate staff, reset PINs, assign roles'),
  ('pos.sale.void', 'pos', 'Void a completed sale'),
  ('pos.report.view', 'pos', 'View sales reports and audit log'),
  ('inventory.product.manage', 'inventory', 'Create/edit/delete products and unit conversions'),
  ('inventory.supplier.manage', 'inventory', 'Manage suppliers'),
  ('inventory.warehouse.manage', 'inventory', 'Manage warehouses'),
  ('inventory.transfer.manage', 'inventory', 'Transfer stock between warehouses'),
  ('inventory.purchase_order.manage', 'inventory', 'Create/edit/delete purchase orders'),
  ('inventory.stock.adjust', 'inventory', 'Set beginning stock balances'),
  ('inventory.stock.receive', 'inventory', 'Record stock receiving'),
  ('inventory.stock.count', 'inventory', 'Run physical inventory counts');

insert into roles (code, name, is_system) values
  ('OWNER', 'Owner', true),
  ('SUPERVISOR', 'Supervisor', true),
  ('CASHIER', 'Cashier', true);

-- OWNER: every permission. Kept in sync with has_permission()'s admin
-- bridge below purely so role_permissions stays a truthful, queryable
-- record of what OWNER grants (e.g. for the Staff page's preview UI) --
-- has_permission() does not actually need this row to return true for an
-- admin staff member.
insert into role_permissions (role_id, permission_code)
  select r.id, p.code from roles r cross join permissions p where r.code = 'OWNER';

-- SUPERVISOR: everything except staff.manage -- staff management (PIN
-- resets, account deletion) stays on the existing admin-only hard wall.
insert into role_permissions (role_id, permission_code)
  select r.id, p.code from roles r cross join permissions p
  where r.code = 'SUPERVISOR' and p.code <> 'staff.manage';

-- CASHIER: none. Matches today's default-locked-out behavior exactly.

-- ---------------------------------------------------------------------------
-- has_permission / list_my_permissions
-- ---------------------------------------------------------------------------

create or replace function has_permission(p_code text, p_staff_id uuid default auth.uid())
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select
    exists (select 1 from staff where id = p_staff_id and role = 'admin')
    or exists (
      select 1
      from staff_roles sr
      join role_permissions rp on rp.role_id = sr.role_id
      where sr.staff_id = p_staff_id and rp.permission_code = p_code
    )
$$;

create or replace function list_my_permissions()
returns setof text
language sql
security definer
stable
set search_path = public
as $$
  select p.code
  from permissions p
  where has_permission(p.code, auth.uid())
$$;

revoke all on function has_permission(text, uuid) from public;
grant execute on function has_permission(text, uuid) to authenticated;
revoke all on function list_my_permissions() from public;
grant execute on function list_my_permissions() to authenticated;

-- ---------------------------------------------------------------------------
-- Backfill existing staff
-- ---------------------------------------------------------------------------

insert into staff_roles (staff_id, role_id)
  select s.id, r.id
  from staff s
  join roles r on r.code = (case when s.role = 'admin' then 'OWNER' else 'CASHIER' end)
  where r.store_id is null
  on conflict (staff_id, role_id) do nothing;

-- ---------------------------------------------------------------------------
-- assign_staff_role: the only way staff_roles changes going forward
-- ---------------------------------------------------------------------------

create or replace function assign_staff_role(p_staff_id uuid, p_role_code text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_store_id uuid;
  v_target staff%rowtype;
  v_role roles%rowtype;
begin
  v_store_id := auth_store_id();
  if v_store_id is null then
    raise exception 'Not a registered staff member of any store';
  end if;

  if not has_permission('staff.manage') then
    raise exception 'UNAUTHORIZED_ACTION';
  end if;

  if p_role_code not in ('SUPERVISOR', 'CASHIER') then
    raise exception 'INVALID_ROLE';
  end if;

  select * into v_target from staff where id = p_staff_id and store_id = v_store_id;
  if not found then
    raise exception 'Staff not found in this store';
  end if;

  -- Owner status comes from staff.role = 'admin', not from staff_roles --
  -- this RPC only ever moves a cashier-tier staff member between the two
  -- assignable roles.
  if v_target.role <> 'cashier' then
    raise exception 'CANNOT_REASSIGN_ADMIN';
  end if;

  select * into v_role from roles where code = p_role_code and store_id is null;

  delete from staff_roles
    where staff_id = p_staff_id
      and role_id in (select id from roles where code in ('SUPERVISOR', 'CASHIER') and store_id is null);

  insert into staff_roles (staff_id, role_id) values (p_staff_id, v_role.id);
end;
$$;

revoke all on function assign_staff_role(uuid, text) from public;
grant execute on function assign_staff_role(uuid, text) to authenticated;
