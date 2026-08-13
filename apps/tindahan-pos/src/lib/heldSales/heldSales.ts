import type { PaymentType, ServiceLine } from "@/lib/types";
import { dbDelete, dbGetAll, dbPut } from "./db";

export interface HeldSaleLine {
  productId: string;
  quantity: number;
}

export interface HeldSale {
  id: string;
  cartLines: HeldSaleLine[];
  serviceLines: ServiceLine[];
  paymentType: PaymentType;
  tendered: string;
  referenceNo: string;
  selectedCustomerId: string | null;
  /** Always null in v1 — no UI prompts for it yet, but the field costs nothing to keep around. */
  note: string | null;
  /** Display only — any cashier at the store can resume/discard any held sale, this is never used for access control. */
  heldByCashierId: string | null;
  heldByName: string;
  createdAt: string;
}

export async function holdSale(storeId: string, sale: Omit<HeldSale, "id" | "createdAt">): Promise<HeldSale> {
  const record: HeldSale = {
    ...sale,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  };
  // Unlike the offline queue's best-effort writes, a failed hold risks silently
  // losing a customer's order — let this throw so the caller can tell the
  // cashier holding didn't work, instead of swallowing it.
  await dbPut(storeId, record);
  return record;
}

export async function listHeldSales(storeId: string): Promise<HeldSale[]> {
  try {
    const all = await dbGetAll<HeldSale>(storeId);
    return all.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  } catch {
    return [];
  }
}

export async function removeHeldSale(storeId: string, id: string): Promise<void> {
  try {
    await dbDelete(storeId, id);
  } catch {
    // Best-effort — a stale entry lingering in the list is recoverable (discard again), not data loss.
  }
}

// Service-line labels are freeform strings built at add-time (see
// EloadServicePanel/CashInServicePanel/CashOutServicePanel), not a fixed
// constant — ServiceLine has no dedicated "kind" field to check instead, so
// this matches on the literal substrings those panels always include.
const IRREVERSIBLE_SERVICE_MARKERS = [" load ₱", "cash-in ₱", "cash-out ₱"];

/**
 * True if holding/discarding this sale means a real e-load or drawer-cash
 * movement already happened and won't be reversed — those wallet/drawer
 * effects fire the instant the service line is added to the cart, not at
 * checkout, and are never undone just by removing the line (see
 * addEloadService/addCashInService/addCashOutService in Pos/hooks.tsx).
 */
export function heldSaleHasIrreversibleService(held: HeldSale): boolean {
  return held.serviceLines.some((line) => IRREVERSIBLE_SERVICE_MARKERS.some((marker) => line.label.includes(marker)));
}
