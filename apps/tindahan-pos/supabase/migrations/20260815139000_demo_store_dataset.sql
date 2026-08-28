-- =============================================================================
-- Demo Store: a single, shared, seeded, read-only sample dataset
-- -----------------------------------------------------------------------------
-- Screen 43 of the approved Demo/Trial design ("Explore Demo Store") shows a
-- sample sari-sari store -- products, recent sales, a customer with utang --
-- without ever touching a real tenant's data. Per the integration brief,
-- isolation must be enforced by RLS, not UI hiding, so this data lives in
-- its own tables and is never store_id-scoped, with no client write grant
-- at all: there is no code path, buggy or not, that can join this to a real
-- store's rows. Every signed-in staff member sees the exact same rows.
--
-- Lives in `public` (like public.demo_requests), not a separate schema --
-- this project's core.* tables are deliberately NOT PostgREST-exposed (see
-- start_trial()/my_store_billing_state() being public.* wrappers around
-- core.* writes), so a new schema here would need the same exposure setup
-- with no guarantee it's configured. `public` with a demo_ prefix is
-- reachable the same way every other table in this app already is.
-- =============================================================================
create table public.demo_products (
  id                  uuid primary key default gen_random_uuid(),
  name                text not null,
  category            text not null,
  price               numeric(12, 2) not null,
  stock               integer not null,
  low_stock_threshold integer not null default 5,
  sort_order          integer not null default 0
);

create table public.demo_sales (
  id           uuid primary key default gen_random_uuid(),
  occurred_at  timestamptz not null,
  total        numeric(12, 2) not null,
  item_count   integer not null
);

create table public.demo_customers (
  id      uuid primary key default gen_random_uuid(),
  name    text not null,
  balance numeric(12, 2) not null default 0
);

alter table public.demo_products enable row level security;
alter table public.demo_sales enable row level security;
alter table public.demo_customers enable row level security;

-- Read-only to any signed-in staff member; no insert/update/delete grant to
-- anyone. Sample data, same for every visitor -- never store_id-keyed.
create policy demo_products_select on public.demo_products for select to authenticated using (true);
create policy demo_sales_select on public.demo_sales for select to authenticated using (true);
create policy demo_customers_select on public.demo_customers for select to authenticated using (true);

insert into public.demo_products (name, category, price, stock, low_stock_threshold, sort_order) values
  ('Coca-Cola 1.5L', 'Beverages', 89.00, 24, 10, 1),
  ('Lucky Me Pancit Canton', 'Instant Noodles', 15.00, 6, 15, 2),
  ('Argentina Corned Beef 150g', 'Canned Goods', 42.00, 18, 8, 3),
  ('Piattos Cheese 40g', 'Snacks', 26.00, 30, 12, 4),
  ('Kopiko Brown Coffee 3-in-1', 'Beverages', 8.00, 3, 20, 5),
  ('Safeguard Soap 90g', 'Personal Care', 22.00, 40, 10, 6),
  ('Datu Puti Vinegar 1L', 'Condiments', 35.00, 14, 6, 7),
  ('Marlboro Red (stick)', 'Tobacco', 10.00, 2, 25, 8);

insert into public.demo_sales (occurred_at, total, item_count) values
  (now() - interval '1 hour', 265.00, 4),
  (now() - interval '3 hours', 89.00, 1),
  (now() - interval '5 hours', 156.00, 3),
  (now() - interval '1 day 2 hours', 340.00, 6),
  (now() - interval '1 day 6 hours', 42.00, 1);

insert into public.demo_customers (name, balance) values
  ('Mang Jose', 320.00),
  ('Aling Puring', 150.00),
  ('Kuya Ramil', 0.00);
