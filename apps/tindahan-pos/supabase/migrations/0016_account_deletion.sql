-- Lets a staff account be fully deleted (privacy/right-to-erasure) without
-- destroying the store's own financial and business records.
--
-- Deleting a staff member's auth.users row cascades to their `staff` row
-- (staff.id references auth.users on delete cascade, from 0001_init.sql).
-- But sales.cashier_id, credit_payments.created_by, and
-- receiving_entries.created_by all currently reference staff with no
-- ON DELETE clause (implicit RESTRICT) — deleting a staff member who ever
-- rang up a sale, recorded a payment, or received stock would fail outright
-- today. This migration relaxes those three columns to nullable with
-- ON DELETE SET NULL, mirroring the existing sale_items.product_id /
-- receiving_lines.product_id pattern: the historical record survives, it
-- just loses the specific attribution, same as the app's existing
-- "Unknown" cashier-name fallback already handles.
--
-- Purely a constraint relaxation — no existing non-null values change, so
-- this is safe to apply independently of app code. Rollback, if ever
-- needed (only possible if no rows have actually gone null yet):
--
--   alter table sales alter column cashier_id set not null;
--   alter table sales drop constraint sales_cashier_id_fkey;
--   alter table sales add constraint sales_cashier_id_fkey
--     foreign key (cashier_id) references staff (id);
--
--   alter table credit_payments alter column created_by set not null;
--   alter table credit_payments drop constraint credit_payments_created_by_fkey;
--   alter table credit_payments add constraint credit_payments_created_by_fkey
--     foreign key (created_by) references staff (id);
--
--   alter table receiving_entries alter column created_by set not null;
--   alter table receiving_entries drop constraint receiving_entries_created_by_fkey;
--   alter table receiving_entries add constraint receiving_entries_created_by_fkey
--     foreign key (created_by) references staff (id);

alter table sales alter column cashier_id drop not null;
alter table sales drop constraint sales_cashier_id_fkey;
alter table sales add constraint sales_cashier_id_fkey
  foreign key (cashier_id) references staff (id) on delete set null;

alter table credit_payments alter column created_by drop not null;
alter table credit_payments drop constraint credit_payments_created_by_fkey;
alter table credit_payments add constraint credit_payments_created_by_fkey
  foreign key (created_by) references staff (id) on delete set null;

alter table receiving_entries alter column created_by drop not null;
alter table receiving_entries drop constraint receiving_entries_created_by_fkey;
alter table receiving_entries add constraint receiving_entries_created_by_fkey
  foreign key (created_by) references staff (id) on delete set null;
