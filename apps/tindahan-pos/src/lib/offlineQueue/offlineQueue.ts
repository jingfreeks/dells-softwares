import type { PaymentType, ServiceType } from "@/lib/types";
import { dbDelete, dbGetAll, dbPut } from "./db";

export type QueuedSaleStatus = "pending" | "syncing" | "synced" | "needs_cashier_reauth" | "failed";

export interface QueuedSalePayload {
  items: { product_id: string; quantity: number }[];
  services: {
    label: string;
    amount: number;
    fee: number;
    // Carried through unchanged on replay so cashier_cash_out_cap
    // (20260903200000) sees the same cash-out amount offline and online.
    service_type?: ServiceType;
    cash_handed_over?: number;
  }[];
  customerId: string | null;
  paymentType: PaymentType;
  referenceNo: string | null;
  overridePin: string | null;
  cashierToken: string | null;
}

export interface QueuedSale {
  /** = client_request_id, the idempotency key checkout_sale() dedupes on. */
  id: string;
  payload: QueuedSalePayload;
  /** ISO timestamp captured when checkout() was first attempted — sent as p_occurred_at on replay. */
  occurredAt: string;
  /** For display only (OfflineQueueCard) — not sent to the server. */
  cashierName: string;
  /** The total the cashier's receipt already showed — for display only. */
  total: number;
  status: QueuedSaleStatus;
  attempts: number;
  lastError: string | null;
  createdAt: string;
  updatedAt: string;
}

// Every failed/best-effort operation here degrades silently by design —
// there is no fallback storage worth building for this pass. If IndexedDB
// is unavailable (e.g. private browsing in some browsers), the caller's
// checkout() error surfaces normally instead of the sale vanishing with no
// feedback at all.

export async function enqueueSale(
  storeId: string,
  sale: Omit<QueuedSale, "status" | "attempts" | "lastError" | "createdAt" | "updatedAt">
): Promise<void> {
  try {
    const now = new Date().toISOString();
    const record: QueuedSale = {
      ...sale,
      status: "pending",
      attempts: 0,
      lastError: null,
      createdAt: now,
      updatedAt: now,
    };
    await dbPut(storeId, record);
  } catch {
    // Best-effort — see module doc comment above.
  }
}

export async function listQueuedSales(storeId: string): Promise<QueuedSale[]> {
  try {
    const all = await dbGetAll<QueuedSale>(storeId);
    return all.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  } catch {
    return [];
  }
}

export async function updateQueuedSale(
  storeId: string,
  id: string,
  patch: Partial<Omit<QueuedSale, "id">>
): Promise<void> {
  try {
    const all = await dbGetAll<QueuedSale>(storeId);
    const existing = all.find((sale) => sale.id === id);
    if (!existing) return;
    await dbPut(storeId, { ...existing, ...patch, updatedAt: new Date().toISOString() });
  } catch {
    // Best-effort — see module doc comment above.
  }
}

export async function removeQueuedSale(storeId: string, id: string): Promise<void> {
  try {
    await dbDelete(storeId, id);
  } catch {
    // Best-effort — see module doc comment above.
  }
}

export async function countPending(storeId: string): Promise<number> {
  const all = await listQueuedSales(storeId);
  return all.filter((sale) => sale.status === "pending" || sale.status === "failed").length;
}
