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
