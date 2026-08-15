import { useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/lib/auth";
import { PermissionsContext, useCan } from "./permissionsContext";

const EMPTY = new Set<string>();

/** Mounted inside AuthProvider — refetches list_my_permissions() whenever the
 * signed-in staff member changes. A paired device session has no staff row
 * (see auth.tsx's loadDeviceProfile) and so never holds any permission. */
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

/** Renders `children` only once the signed-in staff member holds `do`. */
export function Can({ do: code, children }: { do: string; children: ReactNode }) {
  return useCan(code) ? <>{children}</> : null;
}
