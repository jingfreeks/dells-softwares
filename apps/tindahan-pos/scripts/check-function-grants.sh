#!/usr/bin/env bash
# Report client-callable SECURITY DEFINER functions reachable by PUBLIC or anon,
# or carrying a service_role grant they do not need.
#
# Why this is a script and not a pgTAP test: the overgrant comes from Supabase's
# project-level DEFAULT ACL, which grants EXECUTE to anon and service_role as
# named grantees whenever a function is created. CI's throwaway local stack has
# no such default, so the condition cannot exist there to be asserted against.
# It is only observable on a hosted project. Run this after every deploy that
# creates or recreates a function -- a clean `db push` is not evidence, because
# a DROP discards the ACL and the recreate silently picks the default back up.
#
# Usage:  ./scripts/check-function-grants.sh     (runs against the linked project)
#
# Trigger functions are excluded: Postgres refuses a direct call to one, so
# EXECUTE on a trigger function is not reachable from a client.

set -euo pipefail

echo "Reading pg_proc.proacl from the linked project..."
echo

supabase db query --linked "
  with candidate as (
    select p.proname,
           coalesce(array_to_string(p.proacl, ' | '), '(default privileges)') as acl
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public'
       and p.prosecdef
       and p.prorettype <> 'trigger'::regtype
       -- service_role-only BY DESIGN: the Edge Functions call these with the
       -- service-role key. Excluded from the service_role check, but still
       -- checked for PUBLIC and anon below.
       and p.proname not in (
         '_consume_pairing_code',
         '_validate_pairing_code',
         'file_account_deletion_request',
         'finalize_account_deletion',
         'get_deletion_request_for_approval'
       )
  )
  select proname, acl
    from candidate
   where acl like '%anon=X%'
      or acl ~ '(^|\| )=X'        -- the PUBLIC grant renders with an empty grantee
      or acl like '%service_role=X%'
   order by proname;
"

echo
echo "Every function listed above is overgranted and needs a migration issuing:"
echo "    revoke all on function public.<name>(<args>) from public, anon, service_role;"
echo "    grant execute on function public.<name>(<args>) to authenticated;"
echo
echo "No rows means clean. Expected ACL for a client-callable RPC:"
echo "    postgres=X/postgres | authenticated=X/postgres"
