-- Supplier Management redesign:
--   * suppliers gains contact_person, payment_terms, active, and
--     usual_delivery_days — enough real data to drive "next expected
--     delivery", a payment-terms chip, and deactivate-not-delete (no hard
--     delete: a supplier's receiving history must stay intact).
--   * supplier_categories is a join table (not an array column) so it
--     references real category rows the same way products.category_id
--     does — a renamed category doesn't orphan a supplier's association,
--     and a deleted category cleanly drops the association via cascade.
--   * receiving_entries gains a simple paid/paid_at flag — real,
--     queryable "do we owe this supplier" data without building a full
--     accounts-payable ledger (no partial payments, no payment history).
--     Defaults to true so historical rows aren't retroactively flagged as
--     owing; new term-based deliveries are explicitly set to false at
--     insert time by the app.
--
-- usual_delivery_days stores ISO-8601 weekday numbers (1=Monday..7=Sunday),
-- matching `((date.getDay() + 6) % 7) + 1` in the app.

alter table suppliers add column contact_person text;
alter table suppliers add column payment_terms text not null default 'cash'
  check (payment_terms in ('cash', '7_days', '15_days'));
alter table suppliers add column active boolean not null default true;
alter table suppliers add column usual_delivery_days smallint[] not null default '{}';

create table supplier_categories (
  supplier_id uuid not null references suppliers (id) on delete cascade,
  category_id uuid not null references categories (id) on delete cascade,
  primary key (supplier_id, category_id)
);

alter table supplier_categories enable row level security;

create policy "staff can view store supplier_categories"
  on supplier_categories for select
  using (exists (
    select 1 from suppliers s where s.id = supplier_id and s.store_id = auth_store_id()
  ));

create policy "admin can manage store supplier_categories"
  on supplier_categories for all
  using (exists (
    select 1 from suppliers s
    where s.id = supplier_id and s.store_id = auth_store_id() and auth_role() = 'admin'
  ))
  with check (exists (
    select 1 from suppliers s
    where s.id = supplier_id and s.store_id = auth_store_id() and auth_role() = 'admin'
  ));

alter table receiving_entries add column paid boolean not null default true;
alter table receiving_entries add column paid_at timestamptz;
