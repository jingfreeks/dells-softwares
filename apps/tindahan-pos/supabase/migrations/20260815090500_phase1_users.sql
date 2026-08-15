-- =============================================================================
-- Phase 1 · Migration 006 · core.users  (identity mirror)
-- -----------------------------------------------------------------------------
-- Supabase owns auth.users. Application tables must never foreign-key into the
-- auth schema, so core.users is a thin mirror kept in step by a trigger
-- (see phase 2 migration 010). Identity only — it grants nothing.
--
-- Affected modules : all
-- Rollback         : drop table core.users cascade
-- Risk             : none
-- =============================================================================

create table core.users (
  -- Same uuid as auth.users.id. Deliberately not a foreign key: the mirror must
  -- survive an auth-provider migration.
  id           uuid primary key,
  email        extensions.citext not null,
  full_name    text,
  phone        text,
  status       core.user_status not null default 'ACTIVE',
  last_sign_in_at timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),

  constraint users_email_shape check (position('@' in email) > 1)
);

comment on table core.users is
  'Platform identity. Says who someone is, never what they may do. '
  'Business membership lives in core.staff.';

create unique index users_email_key on core.users (email);

create trigger trg_users_updated_at
  before update on core.users
  for each row execute function core.set_updated_at();

grant select on core.users to app_pos, app_inv, app_acc, app_admin, authenticated;
