-- =============================================================================
-- Fix · core.current_user_id() throws when the JWT claim setting is empty
-- -----------------------------------------------------------------------------
-- The original guards the wrong side of the cast:
--
--     nullif(current_setting('request.jwt.claims', true)::jsonb ->> 'sub', '')
--                            ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ cast happens
--                                                              BEFORE nullif
--
-- `current_setting(..., true)` returns NULL only while a setting has never
-- been assigned on that connection. Once it has been -- and then reverted,
-- which is what a transaction-local `set_config` does at commit -- it comes
-- back as an EMPTY STRING, not NULL. `''::jsonb` then raises:
--
--     invalid input syntax for type json
--     DETAIL: The input string ended unexpectedly.
--
-- That matters because PostgREST sets request.jwt.claims transaction-locally
-- on every request over a POOLED connection, so a connection sits in exactly
-- that state between requests. Anything evaluating on it outside a request
-- transaction -- a scheduled job, a SQL editor session, a trigger firing
-- during maintenance -- hits the error.
--
-- The blast radius is wide because this is the session primitive: is_org_member,
-- auth_org_ids, auth_staff_id, is_platform_admin, write_audit and every
-- platform_* function call it, and it is evaluated inside RLS predicates. When
-- it throws, the query throws -- it does not merely fail closed.
--
-- Encountered twice while building this integration: an
-- `update core.organization_modules` appeared to succeed but was silently
-- rolled back through the audit trigger, and a store-sync trigger logged
-- `core.sync_store_to_org failed ... invalid input syntax for type json`.
-- Both times the entitlement change simply did not happen.
--
-- The fix is to normalise the empty string to NULL BEFORE casting, which is
-- what core.record_platform_admin_mfa() already does. Behaviour is otherwise
-- identical: a real claim still resolves, an absent one still yields NULL.
--
-- Affected schemas : core (one function redefined)
-- Rollback         : restore the body from 20260815091000
-- Risk             : low -- strictly widens the set of inputs handled without
--                    changing the answer for any input that already worked
-- =============================================================================

create or replace function core.current_user_id()
returns uuid
language sql
stable
as $$
  select nullif(
           nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub',
           ''
         )::uuid;
$$;

comment on function core.current_user_id is
  'auth.uid() equivalent that also works inside pgTAP tests where the claims '
  'setting is assigned directly. Treats an empty claims setting as absent: a '
  'transaction-local set_config reverts to '''' rather than NULL, and casting '
  'that to jsonb would raise instead of failing closed.';
