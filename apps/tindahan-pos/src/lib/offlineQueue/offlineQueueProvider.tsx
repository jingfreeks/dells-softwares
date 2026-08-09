import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useAuth } from "@/lib/auth";
import { useCashierSession } from "@/lib/cashierSession";
import { useStoreData } from "@/lib/storeData";
import { useNetworkStatus } from "@/lib/network";
import { OfflineQueueContext } from "./offlineQueueContext";
import { listQueuedSales, type QueuedSale } from "./offlineQueue";
import { drainQueue, pruneSynced, resumeAfterReauth } from "./syncEngine";

export function OfflineQueueProvider({ children }: { children: ReactNode }) {
  const { user, deviceSession } = useAuth();
  const { refresh } = useStoreData();
  const { cashierToken } = useCashierSession();
  const { isOnline } = useNetworkStatus();
  const storeId = user?.storeId ?? deviceSession?.storeId ?? null;

  const [items, setItems] = useState<QueuedSale[]>([]);
  const isDrainingRef = useRef(false);
  const lastResumedTokenRef = useRef<string | null>(null);

  const refreshItems = useCallback(async () => {
    if (!storeId) return;
    setItems(await listQueuedSales(storeId));
  }, [storeId]);

  const triggerDrain = useCallback(async () => {
    if (!storeId || isDrainingRef.current) return;
    isDrainingRef.current = true;
    try {
      const changed = await drainQueue(storeId, () => void refresh());
      if (changed) await pruneSynced(storeId);
    } finally {
      isDrainingRef.current = false;
      await refreshItems();
    }
  }, [storeId, refresh, refreshItems]);

  // Pick up anything left over from a prior tab session, and try once on mount.
  useEffect(() => {
    void refreshItems();
    void triggerDrain();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only meant to run once storeId first resolves, not on every triggerDrain identity change.
  }, [storeId]);

  useEffect(() => {
    function handleOnline() {
      void triggerDrain();
    }
    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, [triggerDrain]);

  useEffect(() => {
    if (isOnline) void triggerDrain();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only react to isOnline flipping, not every triggerDrain identity change.
  }, [isOnline]);

  // A queue item stuck on EXPIRED_CASHIER_SESSION just needs any current,
  // valid cashier token — not necessarily from the same cashier who made
  // the original sale. Once someone signs back in on this device (the
  // normal cashier picker flow, nothing bespoke here), automatically hand
  // that fresh token to the stuck items and resume.
  useEffect(() => {
    if (!storeId || !cashierToken || cashierToken === lastResumedTokenRef.current) return;
    lastResumedTokenRef.current = cashierToken;
    void resumeAfterReauth(storeId, cashierToken).then(() => triggerDrain());
  }, [storeId, cashierToken, triggerDrain]);

  const pendingCount = items.filter((sale) => sale.status === "pending" || sale.status === "failed").length;
  const needsReauth = items.some((sale) => sale.status === "needs_cashier_reauth");
  const lastSyncedAt =
    items
      .filter((sale) => sale.status === "synced")
      .map((sale) => sale.updatedAt)
      .sort()
      .at(-1) ?? null;

  return (
    <OfflineQueueContext.Provider
      value={{ pendingCount, items, lastSyncedAt, retryNow: () => void triggerDrain(), needsReauth }}
    >
      {children}
    </OfflineQueueContext.Provider>
  );
}
