-- =============================================================================
-- Account deletion requests -- route the "I'm the only admin" block through
-- a platform-admin review queue instead of forcing a promotion first
-- -----------------------------------------------------------------------------
-- supabase/functions/delete-account/index.ts blocks a sole admin outright:
-- "Promote another staff member to admin before deleting your account."
-- There was no other path. This adds one: filing a request a platform admin
-- reviews, mirroring the review-then-follow-up shape already established by
-- request_plan_upgrade() (a tenant asks, a human with real judgment decides)
-- rather than the app deciding by itself.
--
-- Deletion still isn't automatic even after approval, because
-- core.organizations is "never delete: suspend or cancel instead" -- see its
-- own comment in 20260815090300_phase1_organizations.sql. Approving a
-- request cancels the organization (org_status 'CANCELLED', the same state
-- a subscription cancellation reaches) and removes the requesting admin's
-- auth.users row. Denying leaves everything untouched with a note back to
-- why.
--
-- The actual auth.users deletion needs the Admin API (service_role), so it
-- cannot happen inside a Postgres function -- same constraint delete-account
-- itself already documents. That's why this migration's write path splits
-- into three functions instead of one: an authenticated tenant files the
-- request (delete-account calls this instead of just refusing), an
-- authenticated platform admin denies directly, and approval is two
-- service_role-only functions bracketing the Admin API call, called from a
-- new approve-deletion-request Edge Function.
--
-- Affected schemas : core (one new table, one new enum), public (five new
--                    functions)
-- Rollback         : drop the five functions, core.account_deletion_requests,
--                    core.account_deletion_request_status
-- Risk             : low -- nothing existing calls any of this yet.
-- =============================================================================

do $$
begin
  if not exists (select 1 from pg_type where typname = 'account_deletion_request_status') then
    create type core.account_deletion_request_status as enum ('PENDING', 'APPROVED', 'DENIED');
  end if;
end;
$$;

create table core.account_deletion_requests (
  id                 uuid primary key default gen_random_uuid(),
  organization_id    uuid not null references core.organizations (id) on delete restrict,
  requested_user_id  uuid not null,
  requested_email    extensions.citext not null,
  reason             text,
  status             core.account_deletion_request_status not null default 'PENDING',
  requested_at       timestamptz not null default now(),
  resolved_at        timestamptz,
  resolved_by        uuid,
  resolution_note    text,

  constraint account_deletion_requests_resolution_shape check (
    (status = 'PENDING' and resolved_at is null and resolved_by is null)
    or (status <> 'PENDING' and resolved_at is not null and resolved_by is not null)
  )
);

comment on table core.account_deletion_requests is
  'A sole admin asking to delete their account and close the store, filed '
  'when delete-account finds no other admin to hand the store to. Reviewed '
  'by a platform admin -- see public.platform_deletion_requests() and the '
  'approve-deletion-request Edge Function.';

-- One live request per person at a time -- refiling while already pending
-- just updates the reason (see file_account_deletion_request below) rather
-- than piling up duplicates.
create unique index account_deletion_requests_one_pending_per_user
  on core.account_deletion_requests (requested_user_id)
  where status = 'PENDING';

create index account_deletion_requests_org_idx on core.account_deletion_requests (organization_id);

-- core is not exposed to PostgREST at all (see 20260815097000's own note),
-- so RLS here is defense in depth, not the actual gate -- the real gate is
-- that every function below re-checks core.is_platform_admin() or restricts
-- EXECUTE to service_role itself.
alter table core.account_deletion_requests enable row level security;
alter table core.account_deletion_requests force  row level security;

-- -----------------------------------------------------------------------------
-- 1. File a request -- called by delete-account (service_role) in place of
--    the old flat refusal, once it has already confirmed the caller is a
--    sole admin. service_role-only: this is never something a browser
--    calls directly, so there is no need to re-derive the sole-admin check
--    here and risk it drifting out of sync with delete-account's own.
-- -----------------------------------------------------------------------------

create or replace function public.file_account_deletion_request(
  p_organization_id uuid,
  p_user_id         uuid,
  p_email           text,
  p_reason          text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, core, pg_temp
as $$
declare
  v_id uuid;
begin
  insert into core.account_deletion_requests (organization_id, requested_user_id, requested_email, reason)
  values (p_organization_id, p_user_id, p_email::extensions.citext, p_reason)
  on conflict (requested_user_id) where status = 'PENDING'
    do update set reason = coalesce(excluded.reason, core.account_deletion_requests.reason)
  returning id into v_id;

  perform core.write_platform_audit(
    'ACCOUNT_DELETION_REQUESTED', 'AccountDeletionRequest', v_id,
    null,
    jsonb_build_object('organization_id', p_organization_id, 'user_id', p_user_id, 'email', p_email),
    p_reason
  );

  return v_id;
end;
$$;

comment on function public.file_account_deletion_request is
  'Called by the delete-account Edge Function (service_role) when a sole '
  'admin cannot delete outright. Refiling while already PENDING just '
  'updates the reason instead of creating a duplicate row.';

-- -----------------------------------------------------------------------------
-- 2. List requests -- the Super Admin console's queue view.
-- -----------------------------------------------------------------------------

create or replace function public.platform_deletion_requests()
returns table (
  id                 uuid,
  organization_id    uuid,
  organization_name  text,
  requested_user_id  uuid,
  requested_email    text,
  reason             text,
  status             text,
  requested_at       timestamptz,
  resolved_at        timestamptz,
  resolved_by_email  text,
  resolution_note    text
)
language sql
stable
security definer
set search_path = public, core, pg_temp
as $$
  select
    r.id, r.organization_id, o.name, r.requested_user_id, r.requested_email::text,
    r.reason, r.status::text, r.requested_at, r.resolved_at, ru.email::text, r.resolution_note
  from core.account_deletion_requests r
  join core.organizations o on o.id = r.organization_id
  left join core.users ru on ru.id = r.resolved_by
  where core.is_platform_admin('ENGINEER')
  order by (r.status = 'PENDING') desc, r.requested_at desc;
$$;

comment on function public.platform_deletion_requests is
  'ENGINEER scope, matching platform_audit() -- account deletion is a '
  'security/ops action, not a billing one. Zero rows for a non-admin.';

-- -----------------------------------------------------------------------------
-- 3. Deny -- pure bookkeeping, no Admin API call needed, so this runs with
--    the platform admin's own session like every other platform_* write.
-- -----------------------------------------------------------------------------

create or replace function public.platform_deny_deletion_request(p_request_id uuid, p_note text default null)
returns void
language plpgsql
security definer
set search_path = public, core, pg_temp
as $$
begin
  if not core.is_platform_admin('ENGINEER') then
    raise exception 'UNAUTHORIZED_ACTION' using errcode = 'P0001';
  end if;

  update core.account_deletion_requests
    set status = 'DENIED', resolved_at = now(), resolved_by = core.current_user_id(), resolution_note = p_note
  where id = p_request_id and status = 'PENDING';

  if not found then
    raise exception 'VALIDATION_FAILED: request not found or already resolved' using errcode = 'P0001';
  end if;

  perform core.write_platform_audit(
    'ACCOUNT_DELETION_DENIED', 'AccountDeletionRequest', p_request_id, null, null, p_note
  );
end;
$$;

-- -----------------------------------------------------------------------------
-- 4 & 5. Approval, split around the Admin API call the approve-deletion-
--    request Edge Function makes in between. Both service_role-only: the
--    Edge Function itself re-derives "is this caller really a platform
--    admin" via public.platform_me() using the CALLER's own token before
--    ever reaching these, the same way delete-account trusts the caller's
--    own token for the staff-row lookup rather than trusting the client.
-- -----------------------------------------------------------------------------

create or replace function public.get_deletion_request_for_approval(p_request_id uuid)
returns table (organization_id uuid, requested_user_id uuid, status text)
language sql
stable
security definer
set search_path = public, core, pg_temp
as $$
  select organization_id, requested_user_id, status::text
  from core.account_deletion_requests
  where id = p_request_id;
$$;

create or replace function public.finalize_account_deletion(
  p_request_id  uuid,
  p_resolved_by uuid,
  p_note        text default null
)
returns void
language plpgsql
security definer
set search_path = public, core, pg_temp
as $$
declare
  v_org uuid;
begin
  update core.account_deletion_requests
    set status = 'APPROVED', resolved_at = now(), resolved_by = p_resolved_by, resolution_note = p_note
  where id = p_request_id and status = 'PENDING'
  returning organization_id into v_org;

  if v_org is null then
    raise exception 'VALIDATION_FAILED: request not found or already resolved' using errcode = 'P0001';
  end if;

  update core.organizations set status = 'CANCELLED', updated_at = now() where id = v_org;

  perform core.write_platform_audit(
    'ACCOUNT_DELETION_APPROVED', 'AccountDeletionRequest', p_request_id,
    null, jsonb_build_object('organization_id', v_org), p_note
  );
end;
$$;

comment on function public.finalize_account_deletion is
  'Called by approve-deletion-request AFTER auth.admin.deleteUser succeeds '
  '-- marks the request APPROVED and cancels the organization. Never call '
  'this before the Admin API delete succeeds, or a request could read '
  'APPROVED while the account it names still exists.';

-- -----------------------------------------------------------------------------
-- Grants
-- -----------------------------------------------------------------------------

revoke all on function public.file_account_deletion_request(uuid, uuid, text, text) from public, authenticated, anon;
grant execute on function public.file_account_deletion_request(uuid, uuid, text, text) to service_role;

revoke all on function public.get_deletion_request_for_approval(uuid) from public, authenticated, anon;
grant execute on function public.get_deletion_request_for_approval(uuid) to service_role;

revoke all on function public.finalize_account_deletion(uuid, uuid, text) from public, authenticated, anon;
grant execute on function public.finalize_account_deletion(uuid, uuid, text) to service_role;

revoke all on function public.platform_deletion_requests() from public;
grant execute on function public.platform_deletion_requests() to authenticated;

revoke all on function public.platform_deny_deletion_request(uuid, text) from public;
grant execute on function public.platform_deny_deletion_request(uuid, text) to authenticated;
