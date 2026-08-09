import { createContext, useContext } from "react";

export interface NetworkStatusContextValue {
  /**
   * Best-effort connectivity signal for UI display and retry timing only —
   * never gate a checkout attempt on this. A false "offline" reading must
   * never block a sale that would actually succeed; the real online/offline
   * classification of a checkout happens by inspecting the RPC error itself
   * (see classifyCheckoutError.ts).
   */
  isOnline: boolean;
  /** When the last reachability probe completed, or null before the first one has run. */
  lastCheckedAt: string | null;
  /** Runs an immediate reachability probe instead of waiting for the next interval tick. */
  checkNow: () => Promise<boolean>;
}

export const NetworkStatusContext = createContext<NetworkStatusContextValue | null>(null);

export function useNetworkStatus() {
  const ctx = useContext(NetworkStatusContext);
  if (!ctx) throw new Error("useNetworkStatus must be used within NetworkProvider");
  return ctx;
}
