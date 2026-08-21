import { createContext, useContext } from "react";

/** One row of my_store_features() — the whole catalogue, held or not. */
export interface StoreFeature {
  code: string;
  moduleCode: string;
  name: string;
  held: boolean;
}

export interface FeaturesContextValue {
  /** Codes from my_store_features() that this store actually holds, e.g. "pos.utang". */
  features: Set<string>;
  /**
   * Every capability the platform sells, with whether this store holds it.
   *
   * my_store_features() deliberately returns the whole catalogue rather than
   * only what is held, so a tenant can see what they are missing instead of
   * it being invisible. useFeature() only ever needs the held half; the
   * settings page needs both, which is why this sits beside the Set rather
   * than replacing it.
   */
  catalogue: StoreFeature[];
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
