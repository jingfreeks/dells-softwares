-- =============================================================================
-- Audit store settings changes
-- -----------------------------------------------------------------------------
-- Found by mobile QA round 2 (SEC-M-007). `audit_log` already records
-- sale_created, sale_voided and staff_logged_out, and carries a
-- previous_value column for exactly this purpose -- but nothing was ever
-- written when a store's own settings changed.
--
-- That gap matters most for `fee_config`: it holds the e-load, cash-in and
-- cash-out brackets the register prices every service sale from. A
-- Supervisor can edit it (SEC-M-006), so what customers are charged could
-- change with no record of who changed it or what it was before.
--
-- SECURITY DEFINER because audit_log has no INSERT policy -- reads are
-- admin-only and writes come from definer-rights functions, the same way
-- void_sale() already writes its row.
--
-- Affected modules : settings, POS pricing
-- Rollback         : drop trigger trg_log_store_settings_change on stores;
--                    drop function log_store_settings_change();
-- Risk             : low -- additive, no existing behaviour changes
-- =============================================================================

create or replace function log_store_settings_change()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  -- id and created_at are identity, not settings. Everything else on the
  -- row is operator-editable and worth a record.
  v_audited text[] := array[
    'name', 'address', 'photo_url', 'fee_config', 'contact_number', 'city',
    'tin', 'business_permit_no', 'bir_registered', 'vat_status',
    'invoice_type', 'vat_rate', 'cashier_can_edit_prices'
  ];
  v_old  jsonb := to_jsonb(old);
  v_new  jsonb := to_jsonb(new);
  v_prev jsonb := '{}'::jsonb;
  v_next jsonb := '{}'::jsonb;
  v_col  text;
begin
  foreach v_col in array v_audited loop
    if v_old -> v_col is distinct from v_new -> v_col then
      v_prev := v_prev || jsonb_build_object(v_col, v_old -> v_col);
      v_next := v_next || jsonb_build_object(v_col, v_new -> v_col);
    end if;
  end loop;

  -- Only the changed keys are stored, not the whole row: a settings form
  -- saved with one field edited should read as one field edited.
  -- A save that changed nothing is not an event worth a row.
  if v_prev = '{}'::jsonb then
    return new;
  end if;

  insert into audit_log (
    store_id, actor_id, action, entity_type, entity_id, previous_value, new_value
  ) values (
    new.id, auth.uid(), 'store_settings_updated', 'store', new.id, v_prev, v_next
  );

  return new;
end;
$$;

revoke all on function log_store_settings_change() from public;

drop trigger if exists trg_log_store_settings_change on stores;
create trigger trg_log_store_settings_change
  after update on stores
  for each row
  execute function log_store_settings_change();
