-- =============================================================================
-- Close the remaining gaps in account deletion: 13 more FKs to staff(id)
-- across 10 tables, never given the ON DELETE SET NULL treatment
-- 0016_account_deletion.sql gave sales.cashier_id, credit_payments.created_by,
-- and receiving_entries.created_by.
-- -----------------------------------------------------------------------------
-- Both delete-account and approve-deletion-request ultimately call
-- auth.admin.deleteUser(), which cascades to the staff row (staff.id
-- references auth.users on delete cascade) and then fails outright on the
-- first FK still set to the implicit RESTRICT/NO ACTION default -- Postgres
-- won't delete a staff row another table still points to.
--
-- 0016 covered the three tables that existed when account deletion first
-- shipped. Ten more tables with a staff(id) reference have landed since
-- (credit overrides, device pairing, inventory counts, purchase orders,
-- refunds, sale voiding, warehouse transfers, plus audit_log itself) and
-- none of them got the same fix -- so today, any admin who ever used any
-- of those features cannot have their account deleted at all. Confirmed
-- live on staging: approve-deletion-request's admin.deleteUser() call was
-- failing with `violates foreign key constraint "audit_log_actor_id_fkey"`
-- for a real pending deletion request, because that admin's own actions
-- were (correctly) audit-logged.
--
-- Same fix, same reasoning, for all thirteen: the historical record
-- survives, it just loses the specific attribution once that person is
-- gone -- identical to the existing "Unknown" cashier-name fallback this
-- app already shows for sales.cashier_id going null.
-- =============================================================================

-- audit_log's own immutability trigger (20260815133000, a BIR compliance
-- requirement) unconditionally rejects every UPDATE -- including the one
-- ON DELETE SET NULL itself performs. Confirmed live: adding the relaxed
-- FK alone still failed, now inside reject_audit_log_mutation() instead of
-- a raw FK violation. The trigger needs one narrow, explicit exception:
-- letting through an UPDATE that changes *only* actor_id from non-null to
-- null, and nothing else -- the audit content itself (what happened, when,
-- to what, why) stays exactly as immutable as before. Every other UPDATE,
-- and every DELETE, is still rejected unconditionally.
create or replace function reject_audit_log_mutation()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'UPDATE'
     and new.actor_id is null and old.actor_id is not null
     and new.id = old.id
     and new.store_id = old.store_id
     and new.action = old.action
     and new.entity_type = old.entity_type
     and new.entity_id = old.entity_id
     and new.previous_value is not distinct from old.previous_value
     and new.new_value is not distinct from old.new_value
     and new.reason is not distinct from old.reason
     and new.created_at = old.created_at
  then
    return new;
  end if;

  raise exception 'AUDIT_LOG_IMMUTABLE: audit rows cannot be % ', lower(tg_op)
    using errcode = 'P0001';
end;
$$;

alter table audit_log drop constraint audit_log_actor_id_fkey;
alter table audit_log add constraint audit_log_actor_id_fkey
  foreign key (actor_id) references staff (id) on delete set null;

alter table credit_override_tokens alter column approved_by drop not null;
alter table credit_override_tokens drop constraint credit_override_tokens_approved_by_fkey;
alter table credit_override_tokens add constraint credit_override_tokens_approved_by_fkey
  foreign key (approved_by) references staff (id) on delete set null;

alter table credit_override_tokens alter column cashier_id drop not null;
alter table credit_override_tokens drop constraint credit_override_tokens_cashier_id_fkey;
alter table credit_override_tokens add constraint credit_override_tokens_cashier_id_fkey
  foreign key (cashier_id) references staff (id) on delete set null;

alter table credit_overrides alter column approved_by drop not null;
alter table credit_overrides drop constraint credit_overrides_approved_by_fkey;
alter table credit_overrides add constraint credit_overrides_approved_by_fkey
  foreign key (approved_by) references staff (id) on delete set null;

alter table credit_overrides alter column cashier_id drop not null;
alter table credit_overrides drop constraint credit_overrides_cashier_id_fkey;
alter table credit_overrides add constraint credit_overrides_cashier_id_fkey
  foreign key (cashier_id) references staff (id) on delete set null;

alter table device_pairing_codes alter column created_by drop not null;
alter table device_pairing_codes drop constraint device_pairing_codes_created_by_fkey;
alter table device_pairing_codes add constraint device_pairing_codes_created_by_fkey
  foreign key (created_by) references staff (id) on delete set null;

alter table devices alter column paired_by drop not null;
alter table devices drop constraint devices_paired_by_fkey;
alter table devices add constraint devices_paired_by_fkey
  foreign key (paired_by) references staff (id) on delete set null;

alter table inventory_beginning_balances alter column created_by drop not null;
alter table inventory_beginning_balances drop constraint inventory_beginning_balances_created_by_fkey;
alter table inventory_beginning_balances add constraint inventory_beginning_balances_created_by_fkey
  foreign key (created_by) references staff (id) on delete set null;

alter table inventory_counts alter column created_by drop not null;
alter table inventory_counts drop constraint inventory_counts_created_by_fkey;
alter table inventory_counts add constraint inventory_counts_created_by_fkey
  foreign key (created_by) references staff (id) on delete set null;

alter table purchase_orders alter column created_by drop not null;
alter table purchase_orders drop constraint purchase_orders_created_by_fkey;
alter table purchase_orders add constraint purchase_orders_created_by_fkey
  foreign key (created_by) references staff (id) on delete set null;

alter table refunds drop constraint refunds_actor_id_fkey;
alter table refunds add constraint refunds_actor_id_fkey
  foreign key (actor_id) references staff (id) on delete set null;

alter table sales drop constraint sales_voided_by_fkey;
alter table sales add constraint sales_voided_by_fkey
  foreign key (voided_by) references staff (id) on delete set null;

alter table warehouse_transfers alter column created_by drop not null;
alter table warehouse_transfers drop constraint warehouse_transfers_created_by_fkey;
alter table warehouse_transfers add constraint warehouse_transfers_created_by_fkey
  foreign key (created_by) references staff (id) on delete set null;
