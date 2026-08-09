import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { NetworkStatusContext } from "./networkContext";

const PROBE_INTERVAL_MS = 20_000;
const PROBE_TIMEOUT_MS = 5_000;
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;

/**
 * navigator.onLine only reflects link-layer connectivity (e.g. connected to
 * a Wi-Fi router with no upstream internet still reports true), so it's
 * combined with an active reachability probe against the Supabase project
 * itself. Neither signal gates checkout() — this is display/retry-timing
 * only (see NetworkStatusContextValue's doc comment).
 */
async function probeReachability(): Promise<boolean> {
  if (!SUPABASE_URL) return navigator.onLine;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);
  try {
    await fetch(`${SUPABASE_URL}/auth/v1/health`, {
      method: "GET",
      cache: "no-store",
      signal: controller.signal,
    });
    return true;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

export function NetworkProvider({ children }: { children: ReactNode }) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [lastCheckedAt, setLastCheckedAt] = useState<string | null>(null);
  const inFlightRef = useRef(false);

  const checkNow = useCallback(async (): Promise<boolean> => {
    if (inFlightRef.current) return isOnline;
    inFlightRef.current = true;
    try {
      const reachable = await probeReachability();
      setIsOnline(reachable);
      setLastCheckedAt(new Date().toISOString());
      return reachable;
    } finally {
      inFlightRef.current = false;
    }
  }, [isOnline]);

  useEffect(() => {
    function handleOnline() {
      void checkNow();
    }
    function handleOffline() {
      setIsOnline(false);
      setLastCheckedAt(new Date().toISOString());
    }
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    void checkNow();
    const interval = setInterval(() => void checkNow(), PROBE_INTERVAL_MS);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- checkNow is stable enough for interval/listener setup; re-subscribing every render would reset the interval pointlessly.
  }, []);

  return (
    <NetworkStatusContext.Provider value={{ isOnline, lastCheckedAt, checkNow }}>
      {children}
    </NetworkStatusContext.Provider>
  );
}
