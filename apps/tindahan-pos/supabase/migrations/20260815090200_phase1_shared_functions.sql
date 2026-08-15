-- =============================================================================
-- Phase 1 · Migration 003 · Shared trigger functions
-- -----------------------------------------------------------------------------
-- Affected modules : all
-- Rollback         : drop the three functions
-- Risk             : none
-- =============================================================================

-- updated_at maintenance -------------------------------------------------------
create or replace function core.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

comment on function core.set_updated_at is
  'Attach as: create trigger trg_<table>_updated_at before update on <table> '
  'for each row execute function core.set_updated_at();';

-- diff helper used by the audit log's generated column --------------------------
-- Must be IMMUTABLE to be usable in a stored generated column.
create or replace function core.jsonb_diff_keys(p_old jsonb, p_new jsonb)
returns text[]
language sql
immutable
as $$
  select coalesce(
    array(
      select key
      from (
        select key from jsonb_object_keys(coalesce(p_old, '{}'::jsonb)) as k(key)
        union
        select key from jsonb_object_keys(coalesce(p_new, '{}'::jsonb)) as k(key)
      ) keys
      where coalesce(p_old, '{}'::jsonb) -> key is distinct from
            coalesce(p_new, '{}'::jsonb) -> key
      order by key
    ),
    '{}'::text[]
  );
$$;

-- Guard: an organization_id column may never be changed on an existing row. ----
-- Re-parenting a record into another tenant is never a legitimate operation.
create or replace function core.reject_tenant_reassignment()
returns trigger
language plpgsql
as $$
begin
  if new.organization_id is distinct from old.organization_id then
    raise exception 'TENANT_REASSIGNMENT_FORBIDDEN: % row % cannot move between organizations',
      tg_table_name, old.id
      using errcode = 'P0001';
  end if;
  return new;
end;
$$;
