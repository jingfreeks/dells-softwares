import { supabase } from "@/lib/supabaseClient";
import { isConnectivityFailure } from "./classifyCheckoutError";
import { listQueuedSales, removeQueuedSale, updateQueuedSale, type QueuedSale } from "./offlineQueue";

const SYNCED_RETENTION_MS = 24 * 60 * 60 * 1000;

function errorMessage(err: unknown): string {
  if (err && typeof err === "object" && "message" in err) {
    const message = (err as { message?: unknown }).message;
    return typeof message === "string" ? message : "";
  }
  return typeof err === "string" ? err : "";
}

type SyncOutcome =
  | { kind: "synced" }
  | { kind: "needs_reauth" }
  | { kind: "connectivity" }
  | { kind: "failed"; message: string };

async function syncOne(sale: QueuedSale): Promise<SyncOutcome> {
  let error: unknown = null;
  try {
    const response = await supabase.rpc("checkout_sale", {
      p_items: sale.payload.items,
      p_services: sale.payload.services,
      p_customer_id: sale.payload.customerId,
      p_payment_type: sale.payload.paymentType,
      p_reference_no: sale.payload.referenceNo,
      p_override_pin: sale.payload.overridePin,
      p_cashier_token: sale.payload.cashierToken,
      p_client_request_id: sale.id,
      p_occurred_at: sale.occurredAt,
      p_is_offline_replay: true,
    });
    error = response.error;
  } catch (thrown) {
    // The RPC call itself threw (a fetch failure) — always connectivity, never a business rule.
    error = thrown;
  }
  if (!error) return { kind: "synced" };

  if (isConnectivityFailure(error)) return { kind: "connectivity" };
  const message = errorMessage(error);
  if (message.includes("EXPIRED_CASHIER_SESSION")) return { kind: "needs_reauth" };
  return { kind: "failed", message: message || "Sync failed." };
}

/**
 * Drains pending/failed queued sales in order, one at a time — not
 * parallel, so it doesn't hammer a just-restored connection and so a
 * still-offline device stops at the first item rather than burning through
 * the whole queue with the same failure. Returns true if anything in the
 * queue changed state (worth a UI refresh).
 *
 * `onSynced` fires after each successfully-replayed sale — used to trigger
 * a background products refetch, since an offline-replayed sale may have
 * driven stock negative (see migration 0030's stock_discrepancies) and the
 * client's stale optimistic stock guess should eventually reflect that.
 */
export async function drainQueue(storeId: string, onSynced?: () => void): Promise<boolean> {
  const items = (await listQueuedSales(storeId)).filter(
    (sale) => sale.status === "pending" || sale.status === "failed"
  );
  let changed = false;

  for (const item of items) {
    await updateQueuedSale(storeId, item.id, { status: "syncing" });
    const outcome = await syncOne(item);
    changed = true;

    if (outcome.kind === "synced") {
      await updateQueuedSale(storeId, item.id, { status: "synced" });
      onSynced?.();
      continue;
    }
    if (outcome.kind === "needs_reauth") {
      // Subsequent items likely carry the same now-stale token — stop here
      // rather than failing through the rest of the queue identically.
      await updateQueuedSale(storeId, item.id, { status: "needs_cashier_reauth" });
      break;
    }
    if (outcome.kind === "connectivity") {
      // Still offline (or flaked again) — stop for now, retried on the next trigger.
      await updateQueuedSale(storeId, item.id, { status: "pending", attempts: item.attempts + 1 });
      break;
    }
    // A business-rule rejection on replay is specific to this one sale —
    // don't let it hold up the rest of the queue.
    await updateQueuedSale(storeId, item.id, {
      status: "failed",
      lastError: outcome.message,
      attempts: item.attempts + 1,
    });
  }

  return changed;
}

/** Updates every reauth-blocked item with a freshly obtained cashier token and re-queues it for another drain attempt. */
export async function resumeAfterReauth(storeId: string, newCashierToken: string): Promise<void> {
  const items = await listQueuedSales(storeId);
  await Promise.all(
    items
      .filter((sale) => sale.status === "needs_cashier_reauth")
      .map((sale) =>
        updateQueuedSale(storeId, sale.id, {
          status: "pending",
          payload: { ...sale.payload, cashierToken: newCashierToken },
        })
      )
  );
}

/** Garbage-collects synced items older than the retention window, keeping the queue small. */
export async function pruneSynced(storeId: string): Promise<void> {
  const items = await listQueuedSales(storeId);
  const cutoff = Date.now() - SYNCED_RETENTION_MS;
  await Promise.all(
    items
      .filter((sale) => sale.status === "synced" && new Date(sale.updatedAt).getTime() < cutoff)
      .map((sale) => removeQueuedSale(storeId, sale.id))
  );
}
