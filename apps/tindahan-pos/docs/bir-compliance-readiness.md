# BIR compliance readiness

## Status

This system is **BIR-compliance-ready**, not BIR-accredited or BIR-approved. No such claim is made or displayed anywhere in the product. The transaction, invoice-numbering, sales-record, audit-trail, and reporting architecture is built so this app can be prepared for the applicable BIR registration process — the exact registration category (CAS Acknowledgement Certificate, POS/sales-receipting registration, or another category) and its documentary requirements must be confirmed against the taxpayer's actual circumstances and the current BIR Citizen's Charter at the time of application. This document exists to make that confirmation possible: it describes what the system does today, cites the code that does it, and lists what a reviewer would still need to check or extend before registration.

Five phases of this work have shipped, each as its own migration and PR:

| # | What it does | Migration | PR |
|---|---|---|---|
| 1 | Per-store, transaction-safe OR/invoice numbering; batched product loading | `0037_document_series.sql` | #118 |
| 2 | Void/cancellation workflow with an audit trail | `0038_void_sale.sql` | #119 |
| 3 | Real, admin-editable business config (TIN, VAT status, invoice type) | `0039_store_bir_config.sql` | #120 |
| 4 | VAT computation and breakdown per sale | `0040_vat_computation.sql` | #121 |
| 5 | POS device traceability | `0041_sale_device_traceability.sql` | #122 |

A later, separately-numbered audit (Phases 1-4, PRs #216-222) extended this into audit-trail coverage beyond `void_sale()`, receipt reprint/refund/discount support, and a Reports page VAT/void/payment-method/Z-reading breakdown — not itemized row-by-row here to keep this table to its original scope; see each PR's own description. This document's own "Phase 5" below continues that audit's numbering, distinct from the "5" row above.

| # | What it does | Migration | PR |
|---|---|---|---|
| Phase 5 | Real, scheduled backups (`pg_dump`/`pg_dumpall` to a private Storage bucket, 30-day retention) — replaces the previous manual, unscripted dumps and the decorative in-app "Automatic backup" controls | `20260815135000_backups_bucket.sql` | (this PR) |

## System overview

Tindahan POS is a React/Vite single-page app backed by Supabase (Postgres + Auth + Storage + Edge Functions). A store's staff sign in with email/password (admins) or a device-scoped cashier PIN (cashiers, via a paired tablet); every write that matters for tax/audit purposes — checking out a sale, voiding a sale, changing store tax config — goes through a Postgres function (`security definer` RPC) rather than a raw client-side `insert`/`update`, so business rules and row-locking are enforced in one place the client cannot bypass.

## System architecture

```text
Browser/tablet (React SPA)
        |
        | Supabase client (anon key, RLS-scoped)
        v
Postgres (Supabase)
  - RLS policies scope every table to the caller's store (auth_store_id())
  - SECURITY DEFINER RPCs are the only path for tax/audit-sensitive writes:
      checkout_sale()   -- create a sale
      void_sale()       -- void a completed sale
  - Plain admin-gated table UPDATE (RLS-only) for store config:
      stores.tin / vat_status / vat_rate / invoice_type / bir_registered / ...
```

There is no separate backend service — Postgres functions are the entire server-side business logic layer. `auth_store_id()` and `auth_role()` (both defined in `0001_init.sql`, extended in `0026_device_pairing.sql`) are the two `security definer` helpers every RLS policy and RPC relies on to resolve "which store is this caller in" and "is this caller an admin," for either a human staff sign-in or a paired device.

## Database structure

### Core tables
- **`stores`** — one row per taxpayer/store. BIR-relevant columns added across phases 3–4: `tin`, `business_permit_no`, `bir_registered`, `vat_status` (`vat_registered` | `non_vat` | `vat_exempt` | `zero_rated`), `vat_rate` (numeric, defaults to 0.12, admin-editable — not hardcoded), `invoice_type` (`Sales Invoice` | `Service Invoice` | `Cash Invoice` | `Charge Invoice` | `Credit Invoice`), plus `contact_number`/`city`/`address`/`name`/`photo_url`.
- **`document_series`** (`0037`) — one row per store (currently one series per store, `series_key = 'default'`); holds `prefix` and `next_number`. Locked with `for update` inside `checkout_sale()` so two devices checking out at the same instant can never receive the same number.
- **`sales`** — one row per transaction. Columns relevant to this document: `receipt_number` (assigned by `document_series`), `status` (`completed` | `voided`), `voided_at`/`voided_by`/`void_reason`, `vat_status`/`vat_rate`/`vatable_sales`/`vat_amount`/`vat_exempt_sales`/`zero_rated_sales` (a **snapshot** of the store's tax config at the moment of sale — never recomputed retroactively), `device_id` (which paired device, if any, rang this up), `cashier_id`, `client_request_id` (idempotency key), `occurred_at`/`created_at`.
- **`sale_items`** — line items for a sale (`product` or `service` type), `quantity`, `price`, `line_total`.
- **`audit_log`** (`0038`) — generic, append-only action log: `store_id`, `actor_id`, `action`, `entity_type`, `entity_id`, `previous_value`/`new_value` (jsonb), `reason`, `created_at`. Currently written only by `void_sale()` (`action = 'sale_voided'`), but the shape is generic so a future sensitive action (a price change, a tax-config change) can log to it without a schema change.
- **`devices`** (`0026`) — paired POS tablets. `id` doubles as the device's own `auth.users` id, so a device authenticates without a human ever being signed into it.
- **`credit_overrides`**, **`stock_discrepancies`** — narrower audit tables for specific events (an admin PIN-overriding a credit limit; an offline-replayed sale overselling stock).

### Why a snapshot, not a live join
`sales.vat_status`/`vat_rate`/`receipt_number` are all copied onto the sale row at checkout time rather than joined live from `stores`/`document_series`. If an admin later changes the store's VAT status or rate, every historical sale must keep showing the figures that were actually true when the customer paid — this is enforced structurally, not by convention.

## Transaction flow

```text
Cashier scans/selects items
        |
        v
Cart (client-side state, src/pages/Pos)
        |
        v  Complete Sale
checkout_sale() RPC  (security definer, one Postgres transaction)
        |
        |-- resolves store + cashier (staff or paired device)
        |-- re-prices every line server-side (never trusts client prices)
        |-- row-locks and decrements product stock
        |-- row-locks document_series, allocates the next receipt_number
        |-- snapshots the store's VAT status/rate, computes the breakdown
        |-- resolves the calling device's id (if any) via devices
        |-- inserts sales + sale_items
        |-- updates customer balance (credit sales)
        v
sales row (source of truth) ----+---> Receipt component (print-only CSS, thermal-width)
                                  |---> Reports / Dashboard (aggregated, filtered)
                                  |---> CSV / Excel export
```

The database transaction is the single source of truth; the printed receipt, the Reports page, and the exports are all different views over the same `sales`/`sale_items` rows — none of them independently compute or store their own copy of the totals.

**Duplicate-submission safety**: every checkout carries a client-generated `client_request_id` (UUID). `checkout_sale()` checks it first — a retried or replayed request (e.g. after a dropped connection, see `docs/offline-sync.md`) returns the original sale's result instead of inserting a second row or allocating a second receipt number.

**Printing failure handling**: the sale is saved and the receipt number assigned *before* the browser attempts to print. If printing fails, "Print receipt" reprints the same stored sale — it never creates a new transaction or consumes a new number.

## Invoice generation flow

The printed document is one presentation of the `sales` row, generated by `src/components/Receipt/Receipt.tsx`:

1. Heading = `store.invoiceType` (admin-configured, not hardcoded — see phase 3).
2. Store name/address/TIN/business permit (shown only if `includeTinAndPermit` is on and the store has them configured).
3. Receipt number (`sales.receipt_number`) and timestamp.
4. Itemized lines.
5. VAT breakdown block, driven by the sale's **snapshotted** `vat_status`:
   - `vat_registered` → VATable Sales + VAT Amount lines.
   - `zero_rated` → Zero-Rated Sales line.
   - `vat_exempt` → VAT-Exempt Sales line.
   - `non_vat` (or unset, e.g. still-offline-queued) → a plain "This invoice is NOT VAT Registered." disclosure. This is a factual statement, not a claim of specific BIR-mandated wording — the exact phrasing required for a non-VAT invoice should be confirmed against the taxpayer's approved registration before production use.
6. Total, tendered/change or reference number depending on payment type.
7. Footer message (admin-configurable).

Printing itself is the browser's native `window.print()` against a dedicated print stylesheet (`.print-area`, white background, black text, thermal-width-friendly) — never a PDF-generation step mistaken for printing. See `src/index.css` and `ReceiptModal.tsx`.

## Invoice/receipt numbering

- Server-controlled, never client-generated (`document_series` + `checkout_sale()`, `0037_document_series.sql`).
- Scoped per store — two stores can both be on `000001` with no collision, because `document_series` is keyed by `store_id`.
- Concurrency-safe: `select ... for update` on the store's `document_series` row means two POS devices checking out at the same instant serialize on that lock and always receive consecutive numbers, never the same one. This was load-tested (5 stores × 3 cashiers × 10 concurrent checkouts) with zero duplicates — see PR #118.
- Never reissued: a voided sale's number is never reused; `void_sale()` deliberately does not touch `document_series`.
- Not yet implemented: multiple named series per store (e.g. separate series per branch/document type) — the schema (`series_key`) supports it, but only one series (`'default'`) is used today, matching the fact that this app currently has no branch concept.

## Void/cancellation workflow

`void_sale(p_sale_id, p_reason)` (`0038_void_sale.sql`) is the only path that can change a sale's status:

1. Admin-only (`auth_role() = 'admin'`), enforced inside the RPC, not just at the UI layer.
2. Requires a non-blank reason.
3. Rejects an already-voided sale (`ALREADY_VOIDED`).
4. Reverses the original sale's effects atomically: restores product stock for every product line item; reverses the customer's utang balance for a credit sale.
5. Marks the row `status = 'voided'`, `voided_at`, `voided_by`, `void_reason` — **the row is never deleted**, matching the "no silent modification of issued invoices" requirement.
6. Writes an `audit_log` entry.

A voided sale stays visible in the Reports Sales table (with a "Voided" badge and the reason, on hover) and in CSV/Excel exports, but is excluded from every revenue/quantity total (`completedSales()` filter, `src/lib/reports/reports.ts`) so it's never silently double-counted or hidden.

**Not implemented**: a distinct refund/return workflow (partial reversal of a sale) — today the only correction path is a full void.

## VAT / non-VAT support

Store-level `vat_status` (four values) and `vat_rate` (configurable, defaults to the current 12% statutory rate) drive a per-sale breakdown computed inside `checkout_sale()` using the standard Philippine VAT-inclusive formula:

```text
VATable Sales (net of VAT) = Gross Amount / (1 + rate)
VAT Amount                 = Gross Amount - VATable Sales
```

Reports aggregates this into a VAT summary card (VATable Sales, VAT Amount, VAT-Exempt Sales, Zero-Rated Sales) over completed sales in the selected date range.

**Not implemented** (explicitly deferred, tracked as future work, not silently assumed):
- Per-line-item VAT exemption (a single sale with some taxable and some exempt items) — today VAT status applies to the whole sale.
- Discounts and gross-vs-net-of-discount reporting — no discount concept exists anywhere in this POS yet.
- Senior citizen / PWD discount handling, which typically interacts with VAT exemption under separate rules.

## User roles and security controls

- Two roles: `admin` and `cashier` (`staff.role`), plus a third caller type, a paired `device` (no `staff` row at all — see `devices`).
- A cashier cannot: change invoice numbering, change TIN/VAT config, delete a completed sale, void a sale, modify audit logs, or change any BIR-sensitive store config. All of these require `auth_role() = 'admin'`, enforced in RLS policies and inside the relevant RPCs (defense in depth — an RLS bypass alone would still hit the RPC's own explicit role check for `void_sale()`).
- Every table scoped to a store is protected by an RLS policy keyed off `auth_store_id()` — a store can never read another store's transactions, customers, products, or config through the normal client API.
- `checkout_sale()` and `void_sale()` are `security definer`, `revoke ... from public`, `grant execute ... to authenticated` only — no anonymous access.

## POS device configuration and traceability

- `devices` table (`0026_device_pairing.sql`): a paired tablet has its own identity, separate from any human staff account, created via a short-lived pairing code (`generate_pairing_code()` / `pair-device` Edge Function).
- `sales.device_id` (`0041_sale_device_traceability.sql`): `checkout_sale()` resolves the calling device's identity (independent of whichever staff member's cashier PIN/token is attached) and records it on the sale, giving full **Business → Device → Cashier → Transaction → Invoice** traceability.
- Settings → Devices lets an admin see currently-paired devices and unpair one (PIN-gated). There is currently no rename-after-pairing capability.
- **Not implemented**: multiple branches per business — this app has no branch concept yet (confirmed explicitly in `0026`'s own migration comment), so device traceability today is Business → Device, not Business → Branch → Device.

## Reporting

The Reports page (admin-only) provides, over an arbitrary date range with optional cashier/device filters:
- Total sales, transaction count, average sale.
- Sales by cashier, sales by category, best sellers.
- VAT summary (VATable/VAT-exempt/zero-rated sales, VAT amount collected).
- A Sales table listing every transaction in range (including voided ones, clearly badged) with a per-row void action.
- Utang (credit) aging summary.
- CSV export (`salesToCsv`) and, from the Dashboard, an Excel export — both include a Status column so a voided sale is visible in the export, not silently omitted.

The Dashboard (day-to-day operational view, distinct from Reports) only ever shows completed activity — voided sales are excluded at the data-fetch boundary rather than filtered per-widget, so there's a single place that decision is made.

## Data preservation and backups

- No client-side delete path exists for a completed sale, a customer, or an audit-log entry (no DELETE RLS policy on any of these tables for a normal client).
- Historical `sales`/`sale_items`/`audit_log` rows are retained indefinitely by default — this app does not implement automatic data purging.
- Database backups are also taken independently of Supabase's own platform-level point-in-time recovery: a scheduled GitHub Actions workflow (`.github/workflows/backup-production.yml`, daily) runs `pg_dump`/`pg_dumpall --roles-only` against production (`scripts/backup-database.mjs`) and uploads both files to a private Storage bucket (`backups`, no client-facing RLS policy — only the workflow's `service_role` key can read or write it). Backups older than 30 days are deleted automatically. **That 30-day figure is an operational/storage-cost default, not the taxpayer's statutory record-retention period** — confirm the applicable period with an accountant/BIR and adjust `RETENTION_DAYS` in the script accordingly before relying on this for compliance purposes. Restoring from a backup is an operator-run `pg_restore`/`psql` action (see `docs/backups.md`), not a self-service action in the app — the in-app "Restore" control is deliberately inert (`RestoreNote.tsx`) for exactly this reason.
- Important transaction data does not depend on `localStorage`/`sessionStorage` — those are used only for UI convenience state (a cashier's active PIN session, a pending-sale crash-recovery snapshot, non-BIR-relevant display preferences), never as the source of truth for a completed transaction.

## Electronic invoicing readiness

Every transaction exists as structured relational data (`sales` + `sale_items`, with seller/VAT/payment/device/cashier context), not merely as a rendered receipt image or PDF — see "Transaction flow" above. This is the shape RR 11-2025-style electronic invoicing would need to map from, but **no BIR electronic-invoice XML/JSON schema has been implemented**, since no verified official BIR specification for this taxpayer category has been confirmed as applicable. Do not treat this section as electronic-invoicing compliance — it is only a statement that the underlying data is structured enough to support building that mapping later, once the applicable requirement is confirmed.

## Known gaps / explicitly out of scope today

This list exists so a future reviewer doesn't have to rediscover it by reading the whole codebase:

- Direct/silent thermal printer integration (ESC/POS, QZ Tray, WebUSB/Web Serial) — printing today is the browser's native print dialog against a thermal-width-friendly stylesheet, which requires the cashier to confirm the print. A browser cannot silently print to a physical printer without such an integration; this was explicitly deferred rather than attempted.
- Per-line-item VAT exemption and discounts (see "VAT / non-VAT support" above).
- A distinct refund/return workflow separate from void.
- Multi-branch support (device series/numbering, branch-scoped reporting).
- Device rename after pairing.
- Any BIR electronic-invoice submission/schema mapping.

## Verification performed

Each phase above was verified end-to-end on a disposable local Supabase stack (never the shared staging/production project) before merging — see the corresponding PR description for specifics. Notably: a 150-transaction concurrent-checkout load test found zero duplicate receipt numbers across 5 simulated stores (PR #118); direct RPC tests confirmed `void_sale()`'s stock/balance reversal, `ALREADY_VOIDED`, and `ADMIN_ONLY` behavior (PR #119); VAT math was verified against all four `vat_status` values including the exact ₱112 → ₱100 VATable + ₱12 VAT split (PR #121); device attribution was verified independent of cashier attribution (PR #122).
