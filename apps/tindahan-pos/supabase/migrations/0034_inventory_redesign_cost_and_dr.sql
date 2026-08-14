-- Inventory redesign (Add Product / Categories / Receive Stock):
--   * products.cost — an optional, at-creation-time cost estimate entered on
--     the Add Product form, purely to drive a live margin preview while
--     typing. This is NOT the source of truth for margin reporting anywhere
--     else in the app — productAverageCost()/productMarginPercent() (src/
--     pages/Inventory/lib.ts) keep computing margin from actual
--     receiving_lines.cost_each history, since that reflects what was
--     really paid. Nullable: a cashier who doesn't track cost just won't
--     see a margin preview, per the guideline "leave cost blank if you
--     don't track it."
--   * receiving_entries.dr_number — optional delivery-receipt/reference
--     number captured when receiving stock. Free text (DR formats vary by
--     supplier), nullable since not every delivery comes with a slip.
--
-- Both are additive nullable columns on tables that already have RLS
-- enabled (0001_init.sql, 0004_v11_receiving_and_services.sql); the
-- existing store-scoped select/insert/update policies already cover these
-- columns, so no new policies are needed here (same shape as
-- 0013_profile_and_product_images.sql's `products.image_url` add).

alter table products add column cost numeric(10, 2) check (cost is null or cost >= 0);

alter table receiving_entries add column dr_number text;
