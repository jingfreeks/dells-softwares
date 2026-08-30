-- =============================================================================
-- Demo Store: per-product sold counts, for a "Best sellers" section
-- -----------------------------------------------------------------------------
-- The mobile Demo Store mockup (mobile-26-demo-store-banner 2.html) shows a
-- ranked "Best sellers" list with sold counts. demo_sales only has
-- occurred_at/total/item_count -- no line-item breakdown -- so there's
-- nothing to rank by. Rather than a full demo_sale_items table (real line
-- items aren't needed anywhere else for demo purposes), this adds one
-- denormalized column to the existing demo_products table.
-- =============================================================================
alter table public.demo_products add column sold_count integer not null default 0;

update public.demo_products set sold_count = v.sold_count
from (values
  ('Coca-Cola 1.5L', 42),
  ('Nescafe 3-in-1', 31),
  ('Kopiko Brown Coffee 3-in-1', 24),
  ('C2 Green Tea 500ml', 18),
  ('Lucky Me Pancit Canton', 15),
  ('Piattos Cheese 40g', 12),
  ('Argentina Corned Beef 150g', 9),
  ('Safeguard Soap 90g', 7)
) as v(name, sold_count)
where public.demo_products.name = v.name;
