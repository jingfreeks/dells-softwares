import { createContext, useContext } from "react";
import type { QueuedSale } from "./offlineQueue";

export interface OfflineQueueContextValue {
  /** Sales still waiting to sync (pending or failed) — the count worth surfacing to a cashier/owner. */
  pendingCount: number;
  /** The full queue, including synced items kept briefly for display. */
  items: QueuedSale[];
  /** ISO timestamp of the most recently confirmed sync, or null if nothing has synced yet this session. */
  lastSyncedAt: string | null;
  /** Manually triggers a drain attempt — e.g. a "Retry now" button. */
  retryNow: () => void;
  /** True if one or more queued sales are stuck waiting for a fresh cashier sign-in. */
  needsReauth: boolean;
}

export const OfflineQueueContext = createContext<OfflineQueueContextValue | null>(null);

export function useOfflineQueue() {
  const ctx = useContext(OfflineQueueContext);
  if (!ctx) throw new Error("useOfflineQueue must be used within OfflineQueueProvider");
  return ctx;
}
