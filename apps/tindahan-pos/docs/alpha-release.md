# Tindahan POS — Alpha Release Documentation

This document covers the full engagement that led up to the Alpha release: the device-pairing bugfix, the production database sync, the Alpha audit, and the three P1 fixes it produced. It's written for developers picking up this codebase — what changed, why, and where to look.

**Status:** merged to `main` via PR #104 (staging → main), which itself carried PR #103 (dev → staging) and PR #102 (`feature/alpha-p1-fixes` → dev). Production database confirmed in sync (all 28 migrations applied, no pending schema changes from this engagement).

---

## 1. Device pairing & POS stability fixes

**Branch/commit:** `bugfix/device-pairing-pos-fixes` (`ae4f557`), plus a related fix `22d62b2` ("Fix white flash on route transitions and logout").

Real-device testing surfaced four issues with the Phase 3 device-pairing feature:

| Issue | Fix |
|---|---|
| Pairing code was hard to read on the physical device screen | Contrast/typography fix in the pairing code display |
| "Failed to send a request to Edge Function" — a CORS error on some networks | Hardened the `pair-device` edge function's CORS handling |
| A transient error could leave the POS screen frozen/blank with no way to recover | New shared `PageErrorOverlay` component (`src/components/PageErrorOverlay/`) — catches the failure and offers a retry instead of a dead screen |
| A newly paired device showed no products in the POS product grid | Fixed the store-data load path for device sessions in `ProductBrowsePanel`/`storeData.tsx` |

Files touched: `src/lib/auth/authContext.ts`, `src/lib/cashierSession/cashierSession.tsx`, `src/lib/storeData/storeData.tsx`, `src/pages/Pos/component/CashierLoginScreen.tsx`, `src/pages/Pos/component/ProductBrowsePanel.tsx`, `src/components/PageErrorOverlay/` (new).

## 2. Production database sync

Before the Alpha fixes could ship, production needed the 12 migrations that had accumulated on `dev` but never reached the `zwjwbfzrfjhslyxpsxby` ("DellsSoftware") production project: `0017_inventory_management.sql` through `0028_checkout_sale_device_caller.sql` (inventory management, warehouse transfers, store fee config, owner PIN override, cashier PIN login, device pairing, and related fixes).

**Safety process followed** (per explicit instruction: back up first, verify no data loss):

1. **Backup** — `supabase db dump --linked` for schema, `--data-only --use-copy` for data, `--role-only` for roles, all against the production project. Required Docker Desktop running (the Supabase CLI needs it to run pg_dump in a container — a local Homebrew `pg_dump` binary was not sufficient). Backups live in `supabase/backups/production-backup-20260809-102947-{schema,data,roles}.sql`.
2. **Migrate** — `supabase db push --linked --yes` applied all 12 pending migrations.
3. **Verify zero data loss** — a second `--data-only` dump was taken post-migration (`production-postmigration-verify-data.sql`) and each of the 12 pre-existing tables' row counts were diffed (via `COPY ... FROM stdin` line counts) before vs. after. All matched.
4. **Deploy edge functions** — `pair-device` (with `--no-verify-jwt`, since it's the deliberately-anonymous device-pairing entry point) and `unpair-device` were deployed to production, matching their staging config.

No further DB action was needed for the three P1 fixes below — none of them touched the schema.

## 3. Alpha audit & pricing strategy

A full feature/pricing audit was conducted against the `dells-sari-sari-store` marketing site's claims vs. the actual app, producing a competitor-researched pricing strategy. Published as a self-contained report (title "Tindahan POS — Alpha Audit & Pricing Strategy"). It identified the gaps that became this engagement's P1 priorities:

- **H-1 (High):** no printable receipt — the landing page's own FAQ asks "Can I print official receipts?" and the answer was no.
- **H-1 (High):** no sales reporting beyond a single "today" summary — no way to see a date range or break sales down by cashier.
- **L-1 (Low):** utang aging buckets existed on the Customers page but a related Settings toggle (`utangAgingThresholdDays`) silently did nothing.

The user chose to implement all three before considering Alpha ready, in that priority order.

## 4. Fix #1 — Printable Receipt

**Problem:** `runCheckout()` only showed a 4-second "Sale recorded" toast. Settings → Receipts already let an owner configure how a receipt *should* look, but nothing ever rendered one.

**What shipped:**
- `src/components/Receipt/Receipt.tsx` — a shared, presentational receipt component driven by a real `SaleRecord`, the real `stores` row, and the existing (client-side/mock) Settings → Receipts config. Renders store name/address/TIN, receipt number, date/cashier, line items, total, payment-type-conditional rows (cash tendered/change, GCash reference no., Utang balance note), and footer message.
- `src/pages/Pos/component/receiptmodal/ReceiptModal.tsx` — modal shell (same pattern as `OwnerApprovalModal`) with "Print receipt" (`window.print()`) and "New sale" actions; auto-prints if the owner enabled `autoPrintEverySale`.
- `@media print` CSS in `src/index.css` (a reusable `.print-area` marker class) so only the receipt renders when printing.
- `Pos/hooks.tsx`'s `runCheckout()` was changed to actually capture and use `checkout()`'s return value — the first place in the codebase this ever happened, which surfaced and required fixing several test mocks that had never needed a realistic `SaleRecord` shape before.

**Tests:** `src/components/Receipt/Receipt.test.tsx` (4 cases: full render, settings-gated fields, cash-only tendered/change, QR reference number), plus 3 new `Pos.test.tsx` cases (receipt modal opens with correct data, "New sale" clears the cart, `autoPrintEverySale` triggers `window.print()`).

## 5. Fix #2 — Date-Range & Per-Cashier Sales Reports

**Problem:** the only sales reporting was the Dashboard's single-day summary, computed client-side from a 100-row-capped in-memory sales array with no date-range or cashier filtering.

**What shipped:**
- `cashierId: string | null` added to `SaleRecord` (`src/lib/types.ts`) — previously only a display-only `cashierName` string existed even though `sales.cashier_id` was on the DB row.
- `fetchSalesInRange({ startDate, endDate, cashierId })` — a new, independent Supabase query in `src/lib/storeData/storeData.tsx`, filtered server-side (`.gte`/`.lte`/`.eq` on `created_at`/`cashier_id`), capped at 1000 rows instead of the Dashboard's 100 — deliberately separate from `fetchSales()`/`sales` state so a full month's report isn't silently truncated by the Dashboard's cache.
- `buildRangeReport(sales, products)` and `salesByCashier(sales)` added to `src/lib/reports/reports.ts`, reusing the existing `bestSellers`/`salesByCategory` helpers.
- A new top-level **Reports** page (`src/pages/Reports/`): date-range presets (Today / This week / This month / Custom), a cashier filter (populated from `staff`), summary cards (total sales, transactions, average sale), a per-cashier breakdown table, a sales list table, and CSV export (reusing the existing `salesToCsv`/`downloadTextFile` from `src/lib/csvExport.ts`).
- Wired into nav (`src/lib/nav.ts`, new `ReportsIcon`) and routes (`/reports`, admin-only — matching the RLS reality that `sales`/`sale_items` SELECT is already admin-only at the database level).

**Tests:** extended `src/lib/reports/__tests__/reports.test.ts` (`buildRangeReport`/`salesByCashier`), new `src/pages/Reports/__tests__/Reports.test.tsx` (4 cases: summary totals, cashier-filter re-query, date-range re-query, CSV export).

## 6. Fix #3 — Utang Aging Wired to Settings

**Problem:** research found the aging feature (buckets, an "oldest debt" badge, an overdue filter) was already substantially built on the Customers page from an earlier session — but it hardcoded a 30-day overdue cutoff and 14/30-day bucket boundaries, completely ignoring the `utangAgingThresholdDays` setting already present in Settings → Alerts. Changing that setting did nothing.

**What shipped:**
- Relocated `computeOldestDebtDays`, `isOverdueDebt`, `creditUsageVariant`, `buildDebtAgingSummary` from the page-local `src/pages/Customers/lib.ts` into the shared `src/lib/customers/customers.ts`, adding a `thresholdDays` parameter (default 30, backward compatible) to `isOverdueDebt`/`creditUsageVariant`/`buildDebtAgingSummary`. Bucket boundaries are now threshold-derived (`midpoint = floor(thresholdDays / 2)`) instead of hardcoded.
- Relocated `DebtAgeCard` from `src/pages/Customers/component/debtagecard/` into the shared `src/components/DebtAgeCard/` (same treatment `Receipt` got in Fix #1), with dynamic bucket labels (`"0–{midpoint} days"`, etc.) instead of static text.
- Both the Customers page and the new Reports page now read the real threshold via `loadAlertsMock(store.id).utangAgingThresholdDays` (the existing Settings → Alerts persistence, unchanged) and pass it through to the aging calculations and `DebtAgeCard`.
- Added a matching aging summary card to the Reports page, computed from the full customer/sales history (same source and caveats as the Customers page — a point-in-time snapshot, not scoped to the report's selected date range).
- `computeOldestDebtDays`'s known approximation (it uses a customer's *earliest-ever* credit sale as a stand-in for "oldest unpaid charge," since the schema has no ledger linking a specific payment to the specific charge it settles) was left as-is — fixing it would require a new migration and was explicitly scoped out.

**Tests:** extended `src/lib/customers/__tests__/customers.test.ts` (threshold-driven bucket/overdue behavior), new `src/components/DebtAgeCard/DebtAgeCard.test.tsx`, extended `Customers.test.tsx` (Settings-driven threshold affects the badge/filter) and `Reports.test.tsx` (aging card renders from customer/sales data).

**Live-verified:** changed the threshold to 14 days in Settings → Alerts against the real staging store, confirmed both the Customers page and the new Reports card updated their bucket boundaries/labels and matched each other's totals, then reverted the setting back to 30.

## 7. Full verification (all three fixes)

- `tsc -b`, `oxlint`, `vitest run` all green — 594 tests passing across 49 test files.
- Live browser checks against real staging data for each fix (receipt printing on a real sale, report filtering across real historical sales, aging threshold change reflected on both pages).
- Pushed via `feature/alpha-p1-fixes` → PR #102 → `dev` → PR #103 → `staging` → PR #104 → `main`.

### A note on the pre-push hook catch

One test (`Reports.test.tsx`) spread a `NodeListOf<Element>` (`[...container.querySelectorAll(...)]`), which needs the `DOM.Iterable` TypeScript lib — not enabled in this project's `tsconfig.app.json` (`lib: ["ES2023", "DOM"]`). A local `tsc -b` run passed because it reused a stale incremental build cache; the repo's `.husky/pre-push` hook runs a fresh `tsc -b` with no cache and caught it. Fixed by switching to `Array.from(...)`. Worth remembering: `tsc -b`'s incremental cache can mask a real type error that a clean build (or CI) will catch — when in doubt, clear `node_modules/.tmp/*.tsbuildinfo` before trusting a "green" `tsc -b`.

## 8. Known gaps / explicitly out of scope

- **Exact utang aging** (linking a payment to the specific charge it settles) needs a new ledger migration — not attempted this round.
- **Utang payment reminders** ("one-tap reminder run on payday" from the landing page copy) — no SMS/notification integration exists anywhere in the codebase; this is pure marketing copy with no backend support.
- **Reports/Dashboard's 100-row sales cap** — the Dashboard's `sales` state (and therefore aging calculations that reuse it) is capped at 100 rows; a store with more historical sales than that could see an inaccurate "oldest debt" figure. The new Reports page's *sales report* itself isn't affected (it uses the uncapped `fetchSalesInRange` query) — only the aging card, which intentionally shares the Customers page's existing data source and limitation.
