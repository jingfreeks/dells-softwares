-- =============================================================================
-- Return a tenant's staff to the platform console
-- -----------------------------------------------------------------------------
-- The organization detail screen has an omitted Users tab, and the Overview
-- names the reason: no RPC returns a tenant's staff. platform_organizations()
-- gives a count and nothing more. This returns the list.
--
-- Two roles are reported, because this app has two and they are not the same
-- thing. `staff.role` is the coarse enum ('admin' / 'cashier') that
-- auth_role() reads. `roles.code` is the RBAC assignment -- OWNER, SUPERVISOR
-- or CASHIER -- and it is what actually decides permissions: a SUPERVISOR
-- holds 15 and a CASHIER holds none, while both are `cashier` to the enum.
-- Showing only one would let a support conversation reach the wrong
-- conclusion about what somebody can do.
--
-- Deliberately NOT returned: pin_hash, and the PIN failure counters. The
-- hash is a credential. The counters would tell an operator whether a
-- cashier has been fumbling their PIN, which is surveillance of a shop's own
-- staff by the platform, and nothing in the console needs it. Whether an
-- account is locked *right now* is returned, because that is the thing
-- support is called about.
--
-- Scope is `is_platform_admin()` -- any active administrator, matching
-- platform_organizations() and the other tenant reads. This exposes names,
-- e-mail addresses and phone numbers belonging to a tenant's employees, so
-- it is worth being explicit: that is personal data held on behalf of the
-- shop, and the gate is the only thing standing between it and anyone else.
--
-- Affected modules : platform console
-- Rollback         : drop function public.platform_organization_staff(uuid);
-- Risk             : low -- a new read-only function.
-- =============================================================================

create or replace function public.platform_organization_staff(p_org uuid)
returns table(
  staff_id uuid,
  name text,
  email text,
  auth_role text,
  rbac_role text,
  active boolean,
  pin_locked boolean,
  created_at timestamptz
)
language sql
stable
security definer
set search_path to 'public', 'core', 'pg_temp'
as $function$
  select s.id,
         s.name,
         s.email,
         s.role::text,
         r.code::text,
         s.active,
         coalesce(s.pin_locked_until > now(), false),
         s.created_at
  from public.staff s
  left join public.staff_roles sr on sr.staff_id = s.id
  left join public.roles r on r.id = sr.role_id
  where core.is_platform_admin()
    and s.store_id = p_org
  order by s.active desc, r.code::text, s.name;
$function$;

-- anon and service_role are named explicitly: `revoke ... from public` does
-- not remove Supabase's default grants to them, which is what 20260902120000
-- and 20260902130000 had to correct.
revoke all on function public.platform_organization_staff(uuid) from anon;
revoke all on function public.platform_organization_staff(uuid) from service_role;
revoke all on function public.platform_organization_staff(uuid) from public;
grant execute on function public.platform_organization_staff(uuid) to authenticated;
