-- 0039_store_bir_config.sql
--
-- BIR Compliance §48 "BIR Information Must Be Configurable": TIN, business
-- permit number, and "BIR registered" status were still stored only in
-- localStorage (src/pages/Settings/storeDetailsMock.ts), never on the
-- `stores` table itself — explicitly marked with a
-- "TODO: move to real stores columns once they exist" in that file.
-- There was also no VAT-status or invoice-type concept anywhere: the
-- printed document heading was a hardcoded "Official Receipt" constant,
-- and there was no way to distinguish a VAT-registered taxpayer from a
-- non-VAT one at all (see §35 "VAT and Non-VAT Support", §33 "Invoice
-- Instead of Static 'OR'").
--
-- This migration adds those as real, admin-editable columns on `stores`.
-- No RLS changes are needed: the existing "admin can update own store"
-- UPDATE policy (0001_init.sql) has no per-column restriction, and prior
-- column additions (address/photo_url in 0014_onboarding.sql, fee_config
-- in 0021_store_fee_config.sql) both relied on that same fact.
--
-- Note: this only makes the taxpayer's registered VAT status and chosen
-- invoice-type label real and configurable. Actually computing/breaking
-- down VAT amounts on a sale (VAT-inclusive pricing, VAT-exempt line
-- items, a VAT breakdown block on the receipt) is a distinct, larger
-- phase and intentionally not part of this migration.

alter table stores
  add column contact_number text,
  add column city text,
  add column tin text,
  add column business_permit_no text,
  add column bir_registered boolean not null default false,
  add column vat_status text not null default 'non_vat'
    check (vat_status in ('vat_registered', 'non_vat', 'vat_exempt', 'zero_rated')),
  add column invoice_type text not null default 'Sales Invoice'
    check (invoice_type in ('Sales Invoice', 'Service Invoice', 'Cash Invoice', 'Charge Invoice', 'Credit Invoice'));
