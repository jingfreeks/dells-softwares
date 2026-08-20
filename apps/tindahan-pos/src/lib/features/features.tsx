import { useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/lib/auth";
import { FeaturesContext } from "./featuresContext";

const EMPTY = new Set<string>();

/**
 * Mounted inside AuthProvider — refetches my_store_features() whenever the
 * signed-in staff member changes, exactly like PermissionsProvider.
 *
 * A paired device session has no staff row (see auth.tsx's loadDeviceProfile),
 * so auth_store_id() is null and the RPC returns nothing. `loading` stays
 * false and useFeature() falls back to open, which is what a bare register
 * needs: it must be able to sell.
 */
export function FeaturesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id;
  const [features, setFeatures] = useState<Set<string>>(EMPTY);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    if (!userId) {
      setFeatures(EMPTY);
      setLoading(false);
      return;
    }

    setLoading(true);
    supabase.rpc("my_store_features").then(({ data, error }) => {
      if (cancelled) return;
      // A failed read leaves the set empty AND loading false, which
      // useFeature() reads as "hold everything" — see its comment. The
      // server still refuses anything the tenant does not hold.
      setFeatures(
        error || !data
          ? EMPTY
          : new Set(data.filter((r) => r.enabled).map((r) => r.feature_code))
      );
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [userId]);

  return (
    <FeaturesContext.Provider value={{ features, loading }}>{children}</FeaturesContext.Provider>
  );
}
