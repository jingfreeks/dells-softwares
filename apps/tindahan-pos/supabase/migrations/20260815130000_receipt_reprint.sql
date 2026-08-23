-- 20260815130000_receipt_reprint.sql
--
-- BIR Compliance Audit, Phase 2a: reprint capability. Until now, Receipt/
-- ReceiptModal only ever rendered from the live checkout session's own
-- in-memory state, right after a sale completed -- there was no way to
-- look up a past sale and reprint its receipt, and therefore nothing to
-- distinguish a reprint from an original once one existed.
--
-- The reprint itself is a pure client-side read (the sale's already
-- fetched, e.g. by the Reports page) -- this migration only adds the
-- audit trail for it, same SECURITY DEFINER pattern void_sale()/
-- checkout_sale() already use for audit_log, since that table has no
-- client-facing INSERT policy for any role.

create function log_receipt_reprint(p_sale_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_store_id uuid;
begin
  v_store_id := auth_store_id();
  if v_store_id is null then
    raise exception 'Not a registered staff member of any store';
  end if;

  if not exists (select 1 from sales where id = p_sale_id and store_id = v_store_id) then
    raise exception 'Sale not found in this store';
  end if;

  insert into audit_log (store_id, actor_id, action, entity_type, entity_id)
    values (v_store_id, auth.uid(), 'receipt_reprinted', 'sale', p_sale_id);
end;
$$;

revoke all on function log_receipt_reprint(uuid) from public, anon, service_role;
grant execute on function log_receipt_reprint(uuid) to authenticated;
