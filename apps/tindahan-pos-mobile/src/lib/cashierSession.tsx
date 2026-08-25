import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AppState, type AppStateStatus } from "react-native";
import { supabase } from "./supabaseClient";
import { useAuth } from "./auth";
import type { CashierProfile } from "./types";

const STORAGE_KEY = "tindahan-pos-mobile:cashier-session";

/**
 * How long the app can sit backgrounded before the active cashier is
 * cleared and the register falls back to the picker — mirrors the mockup's
 * "Auto-locks after 3 minutes idle" (mobile-cashier-pin.html). There's no
 * per-touch idle timer (that would mean instrumenting every screen); on a
 * shared counter device "idle" is approximated as "app backgrounded",
 * which is what actually happens when a cashier walks away.
 */
const AUTO_LOCK_MS = 3 * 60 * 1000;

interface StoredSession {
  token: string;
  expiresAt: string;
  cashier: CashierProfile;
}

async function readStoredSession(): Promise<StoredSession | null> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredSession;
    if (new Date(parsed.expiresAt).getTime() <= Date.now()) {
      await AsyncStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

async function writeStoredSession(session: StoredSession | null): Promise<void> {
  try {
    if (session) {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    } else {
      await AsyncStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // Best-effort persistence -- ignore quota/availability errors.
  }
}

export type StartCashierSessionResult = { ok: true } | { ok: false; error: string };

interface CashierSessionContextValue {
  /** The staff member currently verified as operating the register -- null until they enter their PIN. */
  activeCashier: CashierProfile | null;
  /** True until the persisted session (if any) has been checked for expiry. */
  loading: boolean;
  startCashierSession: (staffId: string, pin: string, openingFloat: number) => Promise<StartCashierSessionResult>;
  /** closingFloat, when given, is the cash counted at shift end. Omit to end without a count ("Skip count"). */
  endCashierSession: (closingFloat?: number) => Promise<void>;
  /** The opaque token passed through to checkout() so a sale is attributed to activeCashier. */
  cashierToken: string | null;
  /** Called when the server reports the token has expired/been revoked -- prompts a re-pick. */
  reportExpiredSession: () => void;
}

const CashierSessionContext = createContext<CashierSessionContextValue | null>(null);

export function CashierSessionProvider({ children }: { children: ReactNode }) {
  const { user, device, loading: authLoading } = useAuth();
  const [session, setSession] = useState<StoredSession | null>(null);
  const [restoring, setRestoring] = useState(true);
  const [loading, setLoading] = useState(false);
  const lastIdentityRef = useRef<string | null>(null);
  const initializedRef = useRef(false);
  const backgroundedAtRef = useRef<number | null>(null);

  useEffect(() => {
    readStoredSession().then((stored) => {
      setSession(stored);
      setRestoring(false);
    });
  }, []);

  // If the signed-in identity changes (a different admin/device
  // authenticates on this app), any previously active cashier no longer
  // applies. Skip while AuthProvider is still resolving its initial
  // session -- identity flips from null to a real id once, on every load,
  // which isn't a "change".
  useEffect(() => {
    if (authLoading) return;
    const identity = user?.id ?? device?.id ?? null;
    if (!initializedRef.current) {
      initializedRef.current = true;
      lastIdentityRef.current = identity;
      return;
    }
    if (identity !== lastIdentityRef.current) {
      lastIdentityRef.current = identity;
      setSession(null);
      writeStoredSession(null);
    }
  }, [user?.id, device?.id, authLoading]);

  useEffect(() => {
    function handleAppStateChange(next: AppStateStatus) {
      if (next === "background") {
        backgroundedAtRef.current = Date.now();
        return;
      }
      if (next === "active" && backgroundedAtRef.current !== null) {
        const elapsed = Date.now() - backgroundedAtRef.current;
        backgroundedAtRef.current = null;
        if (elapsed >= AUTO_LOCK_MS) {
          setSession((current) => {
            if (current) writeStoredSession(null);
            return null;
          });
        }
      }
    }
    const subscription = AppState.addEventListener("change", handleAppStateChange);
    return () => subscription.remove();
  }, []);

  async function startCashierSession(
    staffId: string,
    pin: string,
    openingFloat: number
  ): Promise<StartCashierSessionResult> {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("start_cashier_session", {
        p_staff_id: staffId,
        p_pin: pin,
        p_opening_float: openingFloat,
      });
      if (error) return { ok: false, error: error.message };
      const row = data?.[0];
      if (!row) return { ok: false, error: "Something went wrong. Please try again." };
      if (!row.ok || !row.token || !row.staff_id || !row.name || !row.role || !row.expires_at) {
        return { ok: false, error: row.error_code ?? "Something went wrong. Please try again." };
      }

      const next: StoredSession = {
        token: row.token,
        expiresAt: row.expires_at,
        cashier: { id: row.staff_id, name: row.name, role: row.role, avatarUrl: row.avatar_url },
      };
      setSession(next);
      await writeStoredSession(next);
      return { ok: true };
    } catch {
      return { ok: false, error: "Could not start the session. Check your connection and try again." };
    } finally {
      setLoading(false);
    }
  }

  async function endCashierSession(closingFloat?: number): Promise<void> {
    if (session) {
      await supabase.rpc("end_cashier_session", { p_token: session.token, p_closing_float: closingFloat ?? null });
    }
    setSession(null);
    await writeStoredSession(null);
  }

  function reportExpiredSession(): void {
    setSession(null);
    writeStoredSession(null);
  }

  return (
    <CashierSessionContext.Provider
      value={{
        activeCashier: session?.cashier ?? null,
        loading: loading || restoring,
        startCashierSession,
        endCashierSession,
        cashierToken: session?.token ?? null,
        reportExpiredSession,
      }}
    >
      {children}
    </CashierSessionContext.Provider>
  );
}

export function useCashierSession() {
  const ctx = useContext(CashierSessionContext);
  if (!ctx) throw new Error("useCashierSession must be used within CashierSessionProvider");
  return ctx;
}
