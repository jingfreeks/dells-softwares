import type { Category, Customer, Product, Supplier } from "@/lib/types";

export interface CachedStoreData {
  products: Product[];
  categories: Category[];
  customers: Customer[];
  suppliers: Supplier[];
}

/**
 * A last-known-good snapshot of the catalog data the POS page needs to
 * function, so a reload (e.g. the browser discarding a backgrounded tab)
 * can paint real data immediately instead of a blank loading spinner
 * while `refresh()` re-fetches in the background. sessionStorage-scoped
 * and keyed by staff id, same rationale as pendingSalePersistence — gone
 * once the tab closes, never bleeds across accounts on a shared terminal.
 * Sales and receiving history are deliberately left out: they're
 * admin-only reporting data, not something the cashier flow needs
 * on-screen the instant the page repaints.
 */
function storageKey(userId: string): string {
  return `tindahan-pos:store-data-cache:${userId}`;
}

export function loadCachedStoreData(userId: string): CachedStoreData | null {
  try {
    const raw = sessionStorage.getItem(storageKey(userId));
    if (!raw) return null;
    return JSON.parse(raw) as CachedStoreData;
  } catch {
    return null;
  }
}

export function saveCachedStoreData(userId: string, data: CachedStoreData): void {
  try {
    sessionStorage.setItem(storageKey(userId), JSON.stringify(data));
  } catch {
    // Best-effort cache — losing it silently just means the next load
    // falls back to the normal spinner-then-fetch path.
  }
}
