-- 0004 gave receiving_entries select/insert policies but never an update
-- one, since nothing needed to update a receiving entry after it was
-- saved. 0035's markSupplierPaid() (paid/paid_at) is the first thing
-- that does — without this, RLS silently drops the update to 0 rows
-- affected (no error, no effect), same shape as the existing
-- admin-insert policy.

create policy "admin can update store receiving entries"
  on receiving_entries for update
  using (store_id = auth_store_id() and auth_role() = 'admin')
  with check (store_id = auth_store_id() and auth_role() = 'admin');
