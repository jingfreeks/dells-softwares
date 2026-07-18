-- Tindahan POS — v1.1 category management (Epic B1 / story B1 category
-- dropdown, plus explicit add/edit/delete category management).
--
-- Categories become a real per-store table instead of free text on
-- products, so they can be listed, renamed, and deleted independently.
-- products.category_id is a foreign key with the default (restrictive)
-- ON DELETE behavior, so the database itself refuses to delete a
-- category that's still assigned to any product — no application-level
-- "is this in use" check can go stale or be bypassed.
--
-- The old products.category text column is left in place (unused by the
-- app going forward) rather than dropped, so this migration carries no
-- data-loss risk; it can be dropped later in a follow-up once the new
-- column has been live for a while.

create table categories (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references stores (id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  unique (store_id, name)
);

create index categories_store_id_idx on categories (store_id);

alter table categories enable row level security;

create policy "staff can view store categories"
  on categories for select
  using (store_id = auth_store_id());

create policy "admin can insert categories"
  on categories for insert
  with check (store_id = auth_store_id() and auth_role() = 'admin');

create policy "admin can update categories"
  on categories for update
  using (store_id = auth_store_id() and auth_role() = 'admin');

-- No client-side delete policy for now — see "Blocking delete" note below;
-- delete goes through the same admin-only path as insert/update once a
-- category has zero products, but the app currently offers delete via a
-- direct table call, which needs a delete policy too:
create policy "admin can delete categories"
  on categories for delete
  using (store_id = auth_store_id() and auth_role() = 'admin');

-- Backfill: one category row per distinct (store_id, category text)
-- pair already in use by existing products.
insert into categories (store_id, name)
select distinct store_id, category from products
where category is not null and trim(category) <> ''
on conflict (store_id, name) do nothing;

-- Every store gets an "Uncategorized" fallback so a product can always
-- be assigned somewhere, even a store with zero products today.
insert into categories (store_id, name)
select id, 'Uncategorized' from stores
on conflict (store_id, name) do nothing;

alter table products add column category_id uuid references categories (id);

update products p
set category_id = c.id
from categories c
where c.store_id = p.store_id
  and c.name = coalesce(nullif(trim(p.category), ''), 'Uncategorized');

alter table products alter column category_id set not null;

create index products_category_id_idx on products (category_id);
