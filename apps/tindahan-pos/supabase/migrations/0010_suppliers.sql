-- Tindahan POS — supplier records, linked into receiving.
--
-- Each supplier gets a scan_code — an opaque token the app renders as a
-- QR code (print it once, e.g. on an index card) and can scan back
-- during receiving to select that supplier instantly, the same way
-- barcode scanning already works for products. Global uniqueness (not
-- just per-store) keeps the lookup-by-code query a single simple index
-- hit before the caller's store is even known.
--
-- receiving_entries keeps its existing free-text `supplier` column
-- (still the source of truth for old rows, and a manual-entry fallback
-- for a supplier that hasn't been added as a record yet) and gains a
-- nullable supplier_id alongside it. ON DELETE SET NULL: removing a
-- supplier record must never delete or corrupt the historical receiving
-- entries that reference it — the free-text name lives on regardless.

create table suppliers (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references stores (id) on delete cascade,
  name text not null,
  phone text,
  address text,
  scan_code text not null unique default replace(gen_random_uuid()::text, '-', ''),
  created_at timestamptz not null default now()
);

create index suppliers_store_id_idx on suppliers (store_id);

alter table suppliers enable row level security;

-- Same shape as categories: any staff can read, only admins write —
-- matches receiving itself already being an admin-only action.
create policy "staff can view store suppliers"
  on suppliers for select
  using (store_id = auth_store_id());

create policy "admin can insert suppliers"
  on suppliers for insert
  with check (store_id = auth_store_id() and auth_role() = 'admin');

create policy "admin can update suppliers"
  on suppliers for update
  using (store_id = auth_store_id() and auth_role() = 'admin');

create policy "admin can delete suppliers"
  on suppliers for delete
  using (store_id = auth_store_id() and auth_role() = 'admin');

alter table receiving_entries
  add column supplier_id uuid references suppliers (id) on delete set null;

create index receiving_entries_supplier_id_idx on receiving_entries (supplier_id) where supplier_id is not null;
