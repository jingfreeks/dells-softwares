import { createContext, useContext } from "react";

/**
 * The §08 grace ladder, from public.my_store_billing_state().
 *
 * See 20260815100000_grace_and_downgrade_ladder.sql. Reads and exports are
 * allowed in every state; only creating new records is ever withdrawn, and
 * even then nothing existing is hidden or deleted.
 */
export interface BillingState {
  organizationStatus: string;
  subscriptionStatus: string;
  writesAllowed: boolean;
  /** Only set while PAST_DUE: when grace runs out. */
  graceEndsAt: string | null;
}

interface BillingContextValue {
  billing: BillingState | null;
  /** True until the first fetch resolves for the current staff member. */
  loading: boolean;
}

export const BillingContext = createContext<BillingContextValue | null>(null);

function useBillingContext(): BillingContextValue {
  const ctx = useContext(BillingContext);
  if (!ctx) throw new Error("useBillingState must be used within BillingProvider");
  return ctx;
}

/**
 * The store's billing state, or null while loading or unknown.
 *
 * Optimistic on purpose: an unknown answer means "say nothing". A banner
 * wrongly telling someone they are suspended is worse than a missing one,
 * and the database is the real boundary either way.
 */
export function useBillingState(): BillingState | null {
  const { billing, loading } = useBillingContext();
  return loading ? null : billing;
}
