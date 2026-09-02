-- =============================================================================
-- Return the audit detail the table already stores
-- -----------------------------------------------------------------------------
-- core.platform_audit_logs has carried old_data, new_data, ip_address and
-- user_agent since it was created. platform_audit() never selected them, so
-- the Platform Console could show an action and its reason but not what
-- actually changed or where the request came from -- and the console said as
-- much, listing them as unavailable.
--
-- They were never unavailable. They were unprojected. Confirmed on staging:
-- ip_address and user_agent are populated on 4 of 6 rows, new_data on 4.
-- old_data is empty in that sample only because the actions that write it
-- (platform_set_module and the other entitlement RPCs, which pass a before
-- value) have not been exercised there.
--
-- Scope is unchanged: ENGINEER, same as before, which SUPERUSER satisfies.
-- That gate matters more now, not less -- an IP address and a user agent are
-- personal data under the DPA, and this widens what an ENGINEER can read
-- about a colleague's session. It does not widen *who* can read it.
--
-- Affected modules : platform console
-- Rollback         : drop function public.platform_audit(int); then restore
--                    the seven-column definition and its grant from
--                    20260815097000.
-- Risk             : low -- additive columns on a read-only function. No
--                    caller is broken by extra columns; PostgREST clients
--                    name the fields they use.
-- =============================================================================

-- Dropped rather than replaced: `create or replace` cannot change a
-- function's return type, and this adds four columns to the returned table.
drop function if exists public.platform_audit(int);

create function public.platform_audit(p_limit integer default 100)
returns table(
  id bigint,
  actor_email text,
  action text,
  entity_type text,
  entity_id uuid,
  reason text,
  created_at timestamptz,
  old_data jsonb,
  new_data jsonb,
  ip_address text,
  user_agent text
)
language sql
stable
security definer
set search_path to 'public', 'core', 'pg_temp'
as $function$
  select l.id, u.email::text, l.action, l.entity_type, l.entity_id, l.reason, l.created_at,
         l.old_data, l.new_data,
         -- inet renders as text for the client; there is no reason to make
         -- every consumer know the Postgres type.
         host(l.ip_address), l.user_agent
  from core.platform_audit_logs l
  left join core.users u on u.id = l.actor_user_id
  where core.is_platform_admin('ENGINEER')
  order by l.id desc
  limit greatest(1, least(coalesce(p_limit, 100), 500));
$function$;

-- Re-issued: the drop above took the grant with it (20260815097000 line 273).
grant execute on function public.platform_audit(int) to authenticated;
