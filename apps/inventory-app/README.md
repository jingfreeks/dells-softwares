# Inventory App

A standalone frontend for warehouse management, purchase orders, receiving,
unit conversion, beginning balance, and physical inventory counts — the
modules that sit alongside, but outside of, POS checkout.

This is a **separate app** from `apps/tindahan-pos`, but it connects to the
**same Supabase project/database**: same `VITE_SUPABASE_URL` /
`VITE_SUPABASE_ANON_KEY`, same `stores` / `staff` / `products` / `suppliers`
tables, and the same staff auth accounts. Log in here with the same
credentials used on Tindahan POS.

It is built against
`apps/tindahan-pos/supabase/migrations/0017_inventory_management.sql`, which
adds `warehouses`, `warehouse_stock`, `purchase_orders` /
`purchase_order_lines`, extends `receiving_entries` with
`purchase_order_id`/`warehouse_id`, and adds `product_unit_conversions`,
`inventory_beginning_balances`, and `inventory_counts` /
`inventory_count_lines`. That migration must be applied to the shared
Supabase project before this app will work.

## Running locally

```bash
npm install
cp .env.example .env   # fill in the SAME Supabase project values as tindahan-pos
npm run dev
```

## Scripts

- `npm run dev` — start the Vite dev server
- `npm run build` — type-check and build for production
- `npm run lint` — run oxlint
- `npm test` — run the vitest suite once
- `npm run test:watch` — run vitest in watch mode
- `npm run test:coverage` — run vitest with coverage

## Known scope limits

- Receiving/PO stock updates are not wrapped in a single DB transaction (no
  RPC exists for this yet), so a failure partway through a save can leave a
  receiving entry recorded without every side effect applied. A future
  `receive_stock()` Postgres function would close this gap.
- Editing a purchase order after it leaves `draft` isn't implemented —
  receiving against it is the intended way to progress it further.
- Actual Inventory counts don't auto-adjust `products.stock` /
  `warehouse_stock` from a recorded variance; that's a deliberate manual
  follow-up step, matching the migration's own comment on the table.
