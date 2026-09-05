import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "./supabaseClient";
import { useAuth } from "./auth";

/**
 * Which features this store holds.
 *
 * The web app has had this since 20260815110000; mobile has not needed it
 * until Review, which is the first mobile screen that is sold rather than
 * simply present. Shaped like BillingProvider next door -- same refetch key,
 * same cancelled guard, same "a failed read must not stop anyone working"
 * posture -- so there is one provider idiom in this app rather than two.
 */

interface FeaturesContextValue {
  features: Set<string>;
  /** True until the first fetch resolves for the current staff member. */
  loading: boolean;
}

const EMPTY = new Set<string>();
const FeaturesContext = createContext<FeaturesContextValue | null>(null);

export function FeaturesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id;
  const [features, setFeatures] = useState<Set<string>>(EMPTY);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    // A paired device has no staff row, so auth_store_id() is null and the RPC
    // answers for nobody. Resolving to empty-and-loaded is right: a bare
    // counter device must still be able to sell.
    if (!userId) {
      setFeatures(EMPTY);
      setLoading(false);
      return;
    }

    setLoading(true);
    supabase.rpc("my_store_features").then(({ data, error }) => {
      if (cancelled) return;
      setFeatures(
        error || !data
          ? EMPTY
          : new Set(
              data.filter((row) => row.enabled).map((row) => row.feature_code)
            )
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

export function useFeatures(): FeaturesContextValue {
  const ctx = useContext(FeaturesContext);
  if (!ctx) throw new Error("useFeatures must be used within FeaturesProvider");
  return ctx;
}

/**
 * Does the store hold this feature, and do we know yet?
 *
 * `null` means still loading, and callers must treat that as neither yes nor
 * no. The web app learned this the hard way: a hook that guesses "yes" while
 * loading is right for hiding a menu item and wrong for a locked screen --
 * guessing yes flashes real figures at a Starter store, guessing no tells a
 * paying one it has been downgraded.
 *
 * The client answer is for presentation only. review_summary() refuses
 * server-side regardless of what this returns.
 */
export function useFeatureState(code: string): boolean | null {
  const { features, loading } = useFeatures();
  return loading ? null : features.has(code);
}
