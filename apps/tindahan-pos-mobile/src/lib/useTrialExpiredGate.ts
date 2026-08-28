import { useEffect, useState } from "react";
import { useAuth } from "./auth";
import { useBillingState } from "./billing";
import { recordActiveTrial, shouldShowTrialExpired, markTrialExpiredShown } from "./trialExpiredTracking";

/**
 * Mirrors the web app's useTrialExpiredRedirect() -- see
 * trialExpiredTracking.ts for why this can't be answered from the RPC
 * alone. Returns whether the one-time Trial Expired screen should show
 * right now, and a way to dismiss it once shown.
 */
export function useTrialExpiredGate() {
  const { user } = useAuth();
  const billing = useBillingState();
  const [showTrialExpired, setShowTrialExpired] = useState(false);

  useEffect(() => {
    if (!user || user.role !== "admin" || !billing) return;
    const storeId = user.storeId;

    if (billing.subscriptionStatus === "TRIALING" && billing.trialEndsAt) {
      recordActiveTrial(storeId, billing.trialEndsAt);
      return;
    }

    shouldShowTrialExpired(storeId).then((shouldShow) => {
      if (shouldShow) {
        markTrialExpiredShown(storeId);
        setShowTrialExpired(true);
      }
    });
  }, [user, billing]);

  return { showTrialExpired, dismissTrialExpired: () => setShowTrialExpired(false) };
}
