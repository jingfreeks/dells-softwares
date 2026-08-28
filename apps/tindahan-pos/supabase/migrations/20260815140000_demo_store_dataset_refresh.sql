-- =============================================================================
-- Demo Store: richer sample content
-- -----------------------------------------------------------------------------
-- The original seed (20260815139000) was a deliberately small placeholder --
-- 8 products, 5 sales, 3 customers -- enough to prove the isolation and the
-- Demo Store screen worked, not enough to look like a real day's worth of a
-- sari-sari store. This replaces it with a fuller set: more categories, a
-- low-stock mix worth restocking, a week of sales at varying volume, and a
-- spread of utang balances (including a paid-up customer, kept deliberately
-- for the "not everyone owes you" honesty the same choice made downstream in
-- DemoStore.tsx, which already filters zero-balance customers out of the
-- utang list).
--
-- Same tables, same RLS, same read-only/no-write-grant posture as before --
-- this migration only changes which rows are in them.
-- =============================================================================
truncate table public.demo_products, public.demo_sales, public.demo_customers;

insert into public.demo_products (name, category, price, stock, low_stock_threshold, sort_order) values
  ('Coca-Cola 1.5L', 'Beverages', 89.00, 22, 10, 1),
  ('Nescafe 3-in-1', 'Beverages', 8.00, 4, 20, 2),
  ('Kopiko Brown Coffee 3-in-1', 'Beverages', 8.00, 3, 20, 3),
  ('C2 Green Tea 500ml', 'Beverages', 25.00, 16, 8, 4),
  ('Lucky Me Pancit Canton', 'Instant Noodles', 15.00, 6, 15, 5),
  ('Nissin Cup Noodles', 'Instant Noodles', 18.00, 2, 12, 6),
  ('Argentina Corned Beef 150g', 'Canned Goods', 42.00, 18, 8, 7),
  ('555 Sardines in Tomato Sauce', 'Canned Goods', 22.00, 5, 10, 8),
  ('Piattos Cheese 40g', 'Snacks', 26.00, 30, 12, 9),
  ('Boy Bawang Cornick', 'Snacks', 15.00, 9, 15, 10),
  ('Chippy BBQ 110g', 'Snacks', 32.00, 14, 10, 11),
  ('Safeguard Soap 90g', 'Personal Care', 22.00, 40, 10, 12),
  ('Head & Shoulders Sachet', 'Personal Care', 8.00, 1, 25, 13),
  ('Datu Puti Vinegar 1L', 'Condiments', 35.00, 12, 6, 14),
  ('Silver Swan Soy Sauce 1L', 'Condiments', 38.00, 11, 6, 15),
  ('Marlboro Red (stick)', 'Tobacco', 10.00, 2, 25, 16),
  ('Winston Blue (stick)', 'Tobacco', 9.00, 3, 25, 17),
  ('Jasmine Rice 1kg', 'Rice and Grains', 58.00, 20, 15, 18),
  ('Purefoods Corned Tuna', 'Canned Goods', 28.00, 7, 10, 19),
  ('Skyflakes Crackers', 'Snacks', 8.00, 0, 15, 20);

insert into public.demo_sales (occurred_at, total, item_count) values
  (now() - interval '2 hours', 265.00, 4),
  (now() - interval '4 hours', 89.00, 1),
  (now() - interval '6 hours', 156.00, 3),
  (now() - interval '9 hours', 312.00, 5),
  (now() - interval '1 day 1 hour', 340.00, 6),
  (now() - interval '1 day 5 hours', 42.00, 1),
  (now() - interval '1 day 8 hours', 178.00, 4),
  (now() - interval '2 days 2 hours', 96.00, 2),
  (now() - interval '2 days 6 hours', 254.00, 5),
  (now() - interval '3 days 3 hours', 61.00, 2),
  (now() - interval '4 days 1 hour', 405.00, 7),
  (now() - interval '5 days 4 hours', 88.00, 2),
  (now() - interval '6 days 2 hours', 220.00, 4);

insert into public.demo_customers (name, balance) values
  ('Mang Jose', 320.00),
  ('Aling Puring', 150.00),
  ('Kuya Ramil', 0.00),
  ('Tita Baby', 540.00),
  ('Ate Grace', 75.50);
