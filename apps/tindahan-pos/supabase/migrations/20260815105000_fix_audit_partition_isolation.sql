-- =============================================================================
-- Security · a tenant can read every other tenant's audit log
-- -----------------------------------------------------------------------------
-- core.audit_logs is partitioned monthly. The PARENT has RLS enabled AND
-- forced, with a policy scoping rows to the reader's own organizations. Its
-- PARTITIONS have RLS disabled -- and 20260815090700 grants `authenticated`
-- SELECT on each one by name, both in ensure_audit_partition() and for the
-- overflow partition.
--
-- In PostgreSQL, a partition queried DIRECTLY is subject to its own RLS, not
-- its parent's. Policies on the parent apply to access through the parent.
-- So naming a partition skips the policy entirely.
--
-- Reproduced on a clean database with two tenants, as a plain staff member of
-- the first, holding nothing but an ordinary `authenticated` session:
--
--     select count(*) from core.audit_logs             ->  6   (their own)
--     select count(*) from core.audit_logs_2026_08     -> 12   (everyone's)
--
-- The audit log carries actor ids, entity ids, and before/after JSON of every
-- change any tenant has made. This is the precise failure that
-- 130_tenant_isolation exists to prevent, reached by using a table name
-- instead of a view.
--
-- HOW IT SURVIVED REVIEW. scripts/check-rls-coverage.mjs skips any table
-- created with `partition of`, carrying the comment "A partition inherits its
-- parent's policies." That belief is wrong, and because it was written as a
-- deliberate exemption rather than an oversight, the guard reported full
-- coverage while excluding exactly the tables that needed checking. The guard
-- is corrected in the same change.
--
-- HOW BAD, HONESTLY. `core` is not in PostgREST's exposed schemas, so a
-- browser cannot reach any of this today -- it gets PGRST106, which is what
-- kept this theoretical rather than live. Exploiting it needs a direct
-- database session as `authenticated`, or for `core` to be exposed later.
-- The second is a plausible future step, and this is a latent hole that
-- would open silently the moment someone took it.
--
-- THE FIX, in two independent layers:
--
--   1. Revoke the direct grants. Reads and writes go through the parent,
--      which is where the policies are. Routed inserts are checked against
--      the parent, so the audit trigger is unaffected.
--   2. Enable RLS on every partition anyway. If a grant is ever
--      reintroduced -- by a future migration, or by hand -- the partition
--      still yields nothing on direct access rather than everything.
--
-- Not FORCEd, deliberately: the platform's own audit readers are SECURITY
-- DEFINER functions owned by postgres, and forcing RLS on the owner would
-- break them for no gain, since they already filter by organization.
--
-- Affected schemas : core (5 partitions, 1 function)
-- Rollback         : re-grant select, insert on the partitions and disable
--                    RLS on them -- which restores the leak, so don't
-- Risk             : low. Nothing legitimate addresses a partition by name;
--                    everything goes through core.audit_logs.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Existing partitions, including the default overflow.
-- -----------------------------------------------------------------------------

do $$
declare
  v_part record;
begin
  for v_part in
    select c.oid::regclass as rel
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    join pg_inherits i on i.inhrelid = c.oid
    where n.nspname = 'core'
      and i.inhparent = 'core.audit_logs'::regclass
  loop
    execute format(
      'revoke select, insert on %s from app_pos, app_inv, app_acc, app_admin, authenticated',
      v_part.rel);
    execute format('alter table %s enable row level security', v_part.rel);
  end loop;
end $$;

-- The overflow partition again, spelled out rather than left to the loop
-- above. It is the one partition created statically by a migration, so this
-- is the statement scripts/check-rls-coverage.mjs can actually see -- and a
-- static guard that cannot see a dynamic `do` block is a guard that reports
-- success it has not verified. Redundant at runtime, load-bearing in CI.
alter table core.audit_logs_overflow enable row level security;

-- -----------------------------------------------------------------------------
-- 2. Every partition created from now on.
--
-- The grant that used to be here is gone rather than narrowed: a partition
-- needs no privileges of its own for inserts routed through the parent, which
-- is the only way anything in this codebase writes an audit row.
-- -----------------------------------------------------------------------------

create or replace function core.ensure_audit_partition(p_month date)
returns text
language plpgsql
as $$
declare
  v_start date := date_trunc('month', p_month)::date;
  v_end   date := (date_trunc('month', p_month) + interval '1 month')::date;
  v_name  text := format('audit_logs_%s', to_char(v_start, 'YYYY_MM'));
begin
  if not exists (
    select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'core' and c.relname = v_name
  ) then
    execute format(
      'create table core.%I partition of core.audit_logs for values from (%L) to (%L)',
      v_name, v_start, v_end);

    -- No grant. Access is through core.audit_logs, where the policies live.
    -- RLS here is the second layer: if a grant is ever reintroduced, a direct
    -- read still returns nothing instead of every tenant's history.
    execute format('alter table core.%I enable row level security', v_name);
  end if;
  return v_name;
end;
$$;

comment on function core.ensure_audit_partition is
  'Idempotent. Call from a scheduled job for the current and next month. '
  'Grants nothing on the partition itself and enables RLS on it: a partition '
  'queried directly is subject to its OWN policies, not its parent''s, so a '
  'granted partition without RLS exposes every tenant''s audit rows.';
