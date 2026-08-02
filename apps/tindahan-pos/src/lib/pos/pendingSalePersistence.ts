import type { ServiceLine } from "@/lib/types";

export interface PendingSaleSnapshot {
  cartLines: { productId: string; quantity: number }[];
  serviceLines: ServiceLine[];
  selectedCustomerId: string | null;
}

/**
 * Recovers an in-progress sale after the POS page reloads mid-checkout —
 * most commonly the browser discarding a backgrounded tab to save memory
 * and reloading it fresh when the cashier switches back, which otherwise
 * silently wipes the cart. Scoped to sessionStorage (survives a reload,
 * gone once the tab actually closes) and keyed by the signed-in staff id
 * so one cashier's leftover sale never resurfaces under a different
 * cashier on a shared terminal.
 */
function storageKey(userId: string): string {
  return `tindahan-pos:pending-sale:${userId}`;
}

export function loadPendingSale(userId: string): PendingSaleSnapshot | null {
  try {
    const raw = sessionStorage.getItem(storageKey(userId));
    if (!raw) return null;
    return JSON.parse(raw) as PendingSaleSnapshot;
  } catch {
    return null;
  }
}

export function savePendingSale(userId: string, snapshot: PendingSaleSnapshot): void {
  try {
    sessionStorage.setItem(storageKey(userId), JSON.stringify(snapshot));
  } catch {
    // sessionStorage can throw in private browsing or when full — this is
    // a best-effort safety net, not a feature the checkout flow depends on.
  }
}

export function clearPendingSale(userId: string): void {
  try {
    sessionStorage.removeItem(storageKey(userId));
  } catch {
    // see savePendingSale
  }
}
