import { createContext, useContext } from "react";

export interface FeaturesContextValue {
  /** Codes from my_store_features() that this store actually holds, e.g. "pos.utang". */
  features: Set<string>;
  /** True until the first fetch resolves for the current staff member. */
  loading: boolean;
}

export const FeaturesContext = createContext<FeaturesContextValue | null>(null);

export function useFeatures() {
  const ctx = useContext(FeaturesContext);
  if (!ctx) throw new Error("useFeatures must be used within FeaturesProvider");
  return ctx;
}

/**
 * Does this store hold `code`?
 *
 * FAILS OPEN while loading, and open on a failed fetch — the opposite of
 * useCan(). The two are answering different questions and the safe default
 * differs:
 *
 *   a permission withheld in error hides a button from a cashier who could
 *   have pressed it, which is recoverable;
 *
 *   a FEATURE withheld in error hides utang from a shop mid-sale because a
 *   network call was slow. This is a UX gate, not the security boundary
 *   (Architecture v1 §08) — the database is what actually decides, and it is
 *   the thing that must fail closed. Flickering a feature away for a moment
 *   and then restoring it is worse than briefly showing one the tenant does
 *   not hold, which the server would refuse anyway.
 *
 * The same reasoning is why Staff.tsx now waits on permissions before
 * redirecting: an unloaded answer is not a negative answer.
 */
export function useFeature(code: string): boolean {
  const { features, loading } = useFeatures();
  if (loading) return true;
  return features.has(code);
}
