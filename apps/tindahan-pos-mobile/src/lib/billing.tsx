import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "./supabaseClient";
import { useAuth } from "./auth";

/**
 * The same grace/trial ladder the web app's my_store_billing_state()
 * reports -- see apps/tindahan-pos/src/lib/billing/billingContext.ts.
 * Reads and exports stay allowed in every state; only creating new
 * records is ever withdrawn, and even then nothing existing is hidden or
 * deleted.
 */
export interface BillingState {
  organizationStatus: string;
  subscriptionStatus: string;
  writesAllowed: boolean;
  /** Only set while PAST_DUE: when grace runs out. */
  graceEndsAt: string | null;
  /** Only set while TRIALING: when the self-serve trial reverts to BASIC. */
  trialEndsAt: string | null;
}

interface BillingContextValue {
  billing: BillingState | null;
  /** True until the first fetch resolves for the current staff member. */
  loading: boolean;
}

const BillingContext = createContext<BillingContextValue | null>(null);

/**
 * Mounted inside AuthProvider -- refetches my_store_billing_state()
 * whenever the signed-in staff member changes. A paired device has no
 * staff row, so it resolves to null and never shows a trial/billing state
 * at a bare counter device.
 */
export function BillingProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id;
  const [billing, setBilling] = useState<BillingState | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    if (!userId) {
      setBilling(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    supabase.rpc("my_store_billing_state").then(({ data, error }) => {
      if (cancelled) return;
      // A failed or empty read leaves this null, which every consumer
      // reads as "nothing to warn about" -- presentation must never be
      // the thing that stops someone working.
      const row = error ? null : data?.[0];
      setBilling(
        row
          ? {
              organizationStatus: row.organization_status,
              subscriptionStatus: row.subscription_status,
              writesAllowed: row.writes_allowed,
              graceEndsAt: row.grace_ends_at,
              trialEndsAt: row.trial_ends_at,
            }
          : null
      );
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [userId]);

  return (
    <BillingContext.Provider value={{ billing, loading }}>{children}</BillingContext.Provider>
  );
}

/**
 * The store's billing state, or null while loading or unknown. Optimistic
 * on purpose -- an unknown answer means "say nothing" rather than wrongly
 * warning someone.
 */
export function useBillingState(): BillingState | null {
  const ctx = useContext(BillingContext);
  if (!ctx) throw new Error("useBillingState must be used within BillingProvider");
  return ctx.loading ? null : ctx.billing;
}
