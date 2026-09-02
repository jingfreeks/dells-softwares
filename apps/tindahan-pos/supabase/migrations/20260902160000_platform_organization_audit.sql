-- =============================================================================
-- A tenant's own slice of the platform audit log
-- -----------------------------------------------------------------------------
-- The organization detail screen has an omitted Activity tab, and the Overview
-- has been saying platform_audit() cannot be narrowed to one tenant. That was
-- true of the function and misleading about the data.
--
-- Every audit-writing function was enumerated from the live database before
-- writing this -- 14 of them -- and they fall into three groups:
--
--   entity_id IS the organization id (7):
--     platform_set_module, platform_reset_module_to_plan, platform_set_limit,
--     platform_set_feature, platform_reset_feature_to_plan,
--     platform_set_plan, platform_set_subscription_status
--
--   entity_id is a deletion request, which carries organization_id (3):
--     file_account_deletion_request, platform_deny_deletion_request,
--     finalize_account_deletion
--
--   belongs to no organization at all (4):
--     bootstrap_platform_admin, grant_platform_admin, revoke_platform_admin,
--     record_platform_admin_mfa
--
-- So the tenant slice is complete, not partial. The last group is excluded
-- because those events are about the platform's own administrators and have
-- no tenant to belong to -- which is a fact worth stating on the tab rather
-- than a coverage gap to apologise for.
--
-- Scope is ENGINEER, matching platform_audit(). This is the same log read
-- through a filter; reading it per-tenant is not a lesser act than reading it
-- whole, and it returns the same IP addresses and user agents.
--
-- Affected modules : platform console
-- Rollback         : drop function public.platform_organization_audit(uuid, integer);
-- Risk             : low -- a new read-only function over an append-only table.
-- =============================================================================

create or replace function public.platform_organization_audit(
  p_org uuid,
  p_limit integer default 100
)
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
         l.old_data, l.new_data, host(l.ip_address), l.user_agent
  from core.platform_audit_logs l
  left join core.users u on u.id = l.actor_user_id
  -- The deletion-request rows point at the request, not the tenant; the
  -- request is what knows which organization it belongs to.
  left join core.account_deletion_requests r
         on r.id = l.entity_id
        and l.entity_type = 'AccountDeletionRequest'
  where core.is_platform_admin('ENGINEER')
    and (
      (l.entity_type in ('OrganizationModule', 'OrganizationFeature', 'OrganizationSubscription')
        and l.entity_id = p_org)
      or r.organization_id = p_org
    )
  order by l.id desc
  limit greatest(1, least(coalesce(p_limit, 100), 500));
$function$;

-- anon and service_role named explicitly; `revoke ... from public` does not
-- remove Supabase's default grants to them.
revoke all on function public.platform_organization_audit(uuid, integer) from anon;
revoke all on function public.platform_organization_audit(uuid, integer) from service_role;
revoke all on function public.platform_organization_audit(uuid, integer) from public;
grant execute on function public.platform_organization_audit(uuid, integer) to authenticated;
