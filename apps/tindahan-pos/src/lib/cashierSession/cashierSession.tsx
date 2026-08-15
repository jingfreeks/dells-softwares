import { useEffect, useRef, useState, type ReactNode } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/lib/auth";
import type { CashierProfile } from "@/lib/types";
import { ERROR_COULD_NOT_START_SESSION } from "@/lib/textLabels";
import { CashierSessionContext, type StartCashierSessionResult } from "./cashierSessionContext";

const STORAGE_KEY = "tindahan-pos:cashier-session";

interface StoredSession {
  token: string;
  expiresAt: string;
  cashier: CashierProfile;
}

function readStoredSession(): StoredSession | null {
  const raw = window.sessionStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as StoredSession;
    if (new Date(parsed.expiresAt).getTime() <= Date.now()) {
      window.sessionStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    window.sessionStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

function writeStoredSession(session: StoredSession | null) {
  if (session) {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } else {
    window.sessionStorage.removeItem(STORAGE_KEY);
  }
}

export function CashierSessionProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [session, setSession] = useState<StoredSession | null>(() => readStoredSession());
  const [loading, setLoading] = useState(false);
  const lastUserIdRef = useRef<string | null>(null);
  const initializedRef = useRef(false);

  // If the signed-in staff member changes (a different admin signs into this
  // browser, or the previous one signs out), any quick-switched cashier from
  // before no longer applies to this session. Skip while AuthProvider is
  // still resolving its initial session (user flips from null to a real id
  // once, on every load, which isn't a "change") — only compare once that
  // first resolution has happened.
  useEffect(() => {
    if (authLoading) return;
    if (!initializedRef.current) {
      initializedRef.current = true;
      lastUserIdRef.current = user?.id ?? null;
      return;
    }
    if (user?.id !== lastUserIdRef.current) {
      lastUserIdRef.current = user?.id ?? null;
      setSession(null);
      writeStoredSession(null);
    }
  }, [user?.id, authLoading]);

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
      writeStoredSession(next);
      return { ok: true };
    } catch {
      // A genuine network failure (fetch throwing), not a normal RPC error
      // response — without this catch, `loading` would stay stuck `true`
      // and the PIN keypad would look permanently frozen with no feedback.
      return { ok: false, error: ERROR_COULD_NOT_START_SESSION };
    } finally {
      setLoading(false);
    }
  }

  async function endCashierSession(closingFloat?: number): Promise<void> {
    if (session) {
      await supabase.rpc("end_cashier_session", { p_token: session.token, p_closing_float: closingFloat ?? null });
    }
    setSession(null);
    writeStoredSession(null);
  }

  function reportExpiredSession(): void {
    setSession(null);
    writeStoredSession(null);
  }

  return (
    <CashierSessionContext.Provider
      value={{
        activeCashier: session?.cashier ?? null,
        loading,
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
