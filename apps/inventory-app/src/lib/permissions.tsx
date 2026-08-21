import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "./supabaseClient";
import { useAuth } from "./auth";

interface PermissionsContextValue {
  /** Codes from list_my_permissions() (tindahan-pos migration 0044_rbac_foundation.sql
   * — this app has no migrations of its own, it shares tindahan-pos's schema). */
  permissions: Set<string>;
  loading: boolean;
}

const PermissionsContext = createContext<PermissionsContextValue | null>(null);
const EMPTY = new Set<string>();

export function PermissionsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id;
  const [permissions, setPermissions] = useState<Set<string>>(EMPTY);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    if (!userId) {
      setPermissions(EMPTY);
      setLoading(false);
      return;
    }

    setLoading(true);
    supabase
      .rpc("list_my_permissions")
      .then(({ data, error }) => {
        if (cancelled) return;
        setPermissions(error || !data ? EMPTY : new Set(data));
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [userId]);

  return (
    <PermissionsContext.Provider value={{ permissions, loading }}>
      {children}
    </PermissionsContext.Provider>
  );
}

export function usePermissions() {
  const ctx = useContext(PermissionsContext);
  if (!ctx) throw new Error("usePermissions must be used within PermissionsProvider");
  return ctx;
}

/** True once permissions have loaded and include `code`; false while loading or absent. */
export function useCan(code: string): boolean {
  const { permissions } = usePermissions();
  return permissions.has(code);
}

/** Renders `children` only once the signed-in staff member holds `do`. */
export function Can({ do: code, children }: { do: string; children: ReactNode }) {
  return useCan(code) ? <>{children}</> : null;
}

/**
 * Has this staff member been established NOT to hold `code`?
 *
 * The distinction from `!useCan(code)` is the whole point, and it is the
 * difference between a working page and a page nobody can open. `useCan` fails
 * closed while permissions are in flight, which is right for hiding a button —
 * showing one that turns out not to work is worse than a button arriving a
 * moment late. It is wrong for a redirect, because a redirect is not
 * recoverable: the page is gone before the answer lands.
 *
 * That is exactly what happened here. Every guarded page in this app read
 * `if (user && !canManage) return <Navigate/>`, so an owner opening
 * /purchase-orders directly — from a bookmark, or just a refresh — was thrown
 * to the dashboard before their own permissions had finished loading. Clicking
 * through from inside the app worked, because by then they were cached, which
 * is why it survived this long.
 *
 * An unloaded answer is not a negative answer.
 */
export function useAccessDenied(code: string): boolean {
  const { permissions, loading } = usePermissions();
  return !loading && !permissions.has(code);
}
