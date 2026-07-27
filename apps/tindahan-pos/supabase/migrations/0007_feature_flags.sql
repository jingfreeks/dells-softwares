-- Feature flags — a kill switch for shipped features, so a critical issue
-- in one feature can be turned off instantly for every store without an
-- emergency deploy.
--
-- Deliberately global (not per-store): a bug in a feature is broken for
-- everyone, not just some stores, so there's no per-store override here.
--
-- Fail-open by design: a key with no row is treated as ENABLED (see the
-- app-side isEnabled() default). You only ever add a row to turn
-- something OFF — there's no need to pre-register every feature that
-- might one day want a flag.
--
-- Flags are read-only from the app (any signed-in staff, and anon too,
-- since a flag might need to gate something before login — e.g. a
-- maintenance-mode style flag on the login/register screens). There is
-- deliberately no insert/update/delete policy for anon/authenticated:
-- flags are only ever changed by whoever has database access (the
-- Supabase dashboard's table editor, or the service_role key), by
-- design — this is an operator/developer control, not something any
-- store admin should be able to touch.

create table feature_flags (
  key text primary key,
  enabled boolean not null default true,
  description text not null default '',
  updated_at timestamptz not null default now()
);

alter table feature_flags enable row level security;

create policy "anyone can read feature flags"
  on feature_flags for select
  using (true);

-- Keep updated_at honest for anyone editing rows via the dashboard.
create or replace function set_feature_flag_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger feature_flags_set_updated_at
  before update on feature_flags
  for each row execute function set_feature_flag_updated_at();

-- Broadcast changes to every connected client immediately, so a flag
-- flip takes effect for staff already mid-shift instead of only on
-- their next page load — the whole point of a kill switch.
alter publication supabase_realtime add table feature_flags;
