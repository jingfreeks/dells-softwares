import { useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/lib/auth";
import { BillingContext, type BillingState } from "./billingContext";

/**
 * Mounted inside AuthProvider — refetches my_store_billing_state() whenever
 * the signed-in staff member changes.
 *
 * A paired device session has no staff row (see auth.tsx's
 * loadDeviceProfile), so it resolves to null and a bare register never
 * renders a billing banner at a customer-facing till.
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

      // A failed or empty read leaves this null, which every consumer reads
      // as "nothing to warn about". Presentation must never be the thing
      // that stops someone working.
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
