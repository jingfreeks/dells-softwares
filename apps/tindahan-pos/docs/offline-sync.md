# Offline checkout & sync

## What this is

The POS checkout screen (`src/pages/Pos`) keeps working if the connection drops mid-sale. A sale that can't reach the server is queued on the device (IndexedDB) and replayed automatically once the connection is back — the cashier sees a normal receipt either way, just marked "Saved offline" when it was queued.

**Scope**: in-tab resilience only. There is no service worker and no installable-PWA app-shell caching. If the browser tab is closed or the OS kills it while sales are still queued, they survive (IndexedDB persists), but nothing drains the queue until the tab is reopened and the app boots again. A dropped connection while the tab stays open is the case this covers — that's the common real-world failure mode for a shop's wifi, not a full offline-first app.

## How a sale gets queued

`checkout()` (`src/lib/storeData/storeData.tsx`) always attempts the live `checkout_sale` RPC first — it never pre-emptively queues based on a "looks offline" signal, because that signal (`useNetworkStatus()`, `src/lib/network/`) is unreliable (`navigator.onLine` only reflects link-layer state) and a false negative must never block a sale that would actually succeed.

If the RPC call fails, `isConnectivityFailure()` (`src/lib/offlineQueue/classifyCheckoutError.ts`) decides what happened:

- The call **threw** (the fetch itself failed) → always connectivity.
- The call **resolved with an error** whose message matches a known business-rule rejection (`CREDIT_LIMIT_EXCEEDED`, `Insufficient stock`, `EXPIRED_CASHIER_SESSION`, etc. — the full whitelist is in that file) → not connectivity, surfaces to the cashier immediately, exactly as before this feature existed.
- Anything else (an error with no recognizable shape) → **treated as connectivity**, on purpose. Supabase doesn't give a clean "this was a network error" signal from the client SDK, so this is a heuristic; the trade-off is deliberate — queuing a sale that could have been shown as a real error is recoverable (see idempotency below), wrongly blocking a real offline sale isn't.

A queued sale gets the same optimistic local state patch (stock, sales list, customer balance) that a live sale gets — applied exactly once, at the moment it's queued. The sync engine that confirms it server-side later never re-applies that patch, so the totals a cashier already saw on the receipt never change after the fact.

## Idempotency and replay

Every checkout — live or queued — carries a client-generated `client_request_id` (a UUID) and an `occurred_at` timestamp, both captured once, up front, before the first attempt. `checkout_sale()` (migration `0030` + fixes in `0032`/`0033`) uses `client_request_id` as an idempotency key: if a sale with that id already exists for the store, it returns the original result instead of erroring or inserting a duplicate. This is what makes it safe for the sync engine to retry a queued sale without risking a double charge or a double stock decrement.

`occurred_at` is separate from `created_at` (the real insert time) — it's what the UI and Reports show as "when this happened," so a sale queued for an hour and synced later still shows the actual time of sale, not the sync time. `created_at` stays what any server-side ordering/date-range logic uses.

## What happens to stock when a queued sale oversells

A live sale still hard-rejects on insufficient stock, unchanged. A **replayed** offline sale (`p_is_offline_replay: true`) never rejects for stock — by the time it's replaying, the cashier already told a real customer the sale went through, so blocking it here would mean money already collected never gets recorded. Instead:

- The sale is recorded normally.
- Stock is allowed to go negative.
- A row is logged to `stock_discrepancies` (store_id, product_id, sale_id, deficit) for every line that oversold.

There's no UI surfacing this table yet — reconciling it (a manual recount, or a Dashboard/Inventory alert) is a fast-follow, not part of this pass. Query it directly in Supabase if you need to check for drift after a spotty day.

## The queue itself

`src/lib/offlineQueue/` — IndexedDB-backed (`db.ts`/`offlineQueue.ts`), one database per store (`tindahan-pos-offline-queue-<storeId>`), so a shared device never mixes one store's queue with another's. Each queued item tracks `status`: `pending` → `syncing` → `synced` (or `failed` / `needs_cashier_reauth`).

`syncEngine.ts`'s `drainQueue()` processes pending/failed items **one at a time**, in order — not in parallel, so it doesn't hammer a connection that just came back and so a still-broken connection stops cleanly at the first item instead of failing through the whole queue identically:

- Success → `synced` (kept for ~24h for the UI's history, then pruned).
- `EXPIRED_CASHIER_SESSION` → `needs_cashier_reauth`, and draining **stops** — later items likely carry the same stale token.
- Connectivity failure again → back to `pending`, `attempts` incremented, draining stops.
- Any other business-rule rejection on replay → `failed` with the message, but draining **continues** — one bad sale shouldn't hold up the rest.

`OfflineQueueProvider` (`offlineQueueProvider.tsx`) wires this into the app: it drains on mount (in case the tab reloaded with sales still queued), on the browser's `online` event, and whenever `useNetworkStatus()` flips to online. When items are stuck on `needs_cashier_reauth`, the provider watches the shared `useCashierSession()` token and automatically resumes them the moment *any* valid cashier session appears — no separate re-auth UI was built for this; it reuses the same PIN sign-in every cashier already goes through, since the replayed sale only needs a currently-valid token, not necessarily the same cashier's.

## Where it's surfaced

- **Settings → Backup**: `SyncStatusCard` swaps to a pending state with a real count when sales are queued; `OfflineQueueCard` lists each queued sale with its status and a manual "Retry now".
- **POS receipt**: shows "Saved offline — will sync when back online" when the sale that was just rung up is `syncStatus: "pending"`.

## Known limits

- Tab-close/crash while sales are queued: they survive (IndexedDB), but nothing drains them until the app reloads.
- The connectivity-vs-business-rule classification is a heuristic, not a guarantee — see `classifyCheckoutError.ts`'s doc comment.
- No UI yet for `stock_discrepancies` — it's there to query, not (yet) to alert on.
