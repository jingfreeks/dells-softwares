import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";

/** What the shell needs to decide which of the five states to render. */
export type AccessState =
  | "loading"
  | "signed-out"
  /** Signed in, store holds ACCOUNTING, staff member may look. */
  | "ready"
  /** Signed in, but this store's plan does not include the module. */
  | "module-off"
  /** Signed in and the store has it, but this person may not open it. */
  | "no-permission"
  /** The check itself failed. Distinct from "denied" on purpose. */
  | "error";

interface SessionValue {
  session: Session | null;
  access: AccessState;
  /** Re-run the module and permission checks. */
  refresh: () => void;
  signOut: () => Promise<void>;
}

const SessionContext = createContext<SessionValue | null>(null);

/**
 * The session Accounting inherits rather than owns.
 *
 * Two questions decide what the app may show, and they are deliberately
 * separate because conflating them produces the dead end the design's
 * no-access screen exists to prevent -- someone retyping a correct password
 * at what is actually a permissions wall:
 *
 *   does this STORE hold the ACCOUNTING module   -> a plan question, my_store_modules()
 *   may this PERSON open Accounting              -> an RBAC question, list_my_permissions()
 *
 * Neither is a security boundary. The database is: every accounting policy
 * checks the module itself, and my_accounting_accounts() checks the
 * permission. These two calls only decide which honest screen to render
 * instead of letting a request fail with a raw error.
 */
export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [access, setAccess] = useState<AccessState>("loading");
  const [reloadKey, setReloadKey] = useState(0);

  const refresh = useCallback(() => setReloadKey((k) => k + 1), []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function check() {
      if (session === null) {
        // getSession() has resolved to "nobody" rather than "not yet": the
        // provider starts at loading and only lands here once it has an
        // answer, so this is not a flash of the signed-out screen.
        if (!cancelled) setAccess("signed-out");
        return;
      }

      const [modules, permissions] = await Promise.all([
        supabase.rpc("my_store_modules"),
        supabase.rpc("list_my_permissions"),
      ]);

      if (cancelled) return;

      if (modules.error || permissions.error) {
        setAccess("error");
        return;
      }

      const holdsModule = (modules.data ?? []).some(
        (row: { module_code?: string; enabled?: boolean }) =>
          row.module_code === "ACCOUNTING" && row.enabled !== false
      );
      if (!holdsModule) {
        setAccess("module-off");
        return;
      }

      const mayView = (permissions.data ?? []).some(
        (row: string | { code?: string }) =>
          (typeof row === "string" ? row : row.code) === "accounting.view"
      );
      setAccess(mayView ? "ready" : "no-permission");
    }

    void check();
    return () => {
      cancelled = true;
    };
  }, [session, reloadKey]);

  const signOut = useCallback(async () => {
    // Signing out here signs you out of Tindahan POS too, because it is one
    // session. The app switcher says so before you click it.
    await supabase.auth.signOut();
  }, []);

  const value = useMemo<SessionValue>(
    () => ({ session, access, refresh, signOut }),
    [session, access, refresh, signOut]
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionValue {
  const value = useContext(SessionContext);
  if (!value) throw new Error("useSession must be used inside a SessionProvider");
  return value;
}
