import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { useBillingState } from "./billingContext";
import { recordActiveTrial, shouldShowTrialExpired, markTrialExpiredShown } from "./trialExpiredTracking";

/**
 * Mounted once inside ProtectedRoute (admins only, same gating as
 * BillingBanner). See trialExpiredTracking.ts for why this can't be
 * answered from the RPC alone.
 */
export function useTrialExpiredRedirect() {
  const { user } = useAuth();
  const billing = useBillingState();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user || user.role !== "admin" || !billing) return;
    const storeId = user.storeId;

    if (billing.subscriptionStatus === "TRIALING" && billing.trialEndsAt) {
      recordActiveTrial(storeId, billing.trialEndsAt);
      return;
    }

    if (location.pathname === "/trial-expired") return;
    if (shouldShowTrialExpired(storeId)) {
      markTrialExpiredShown(storeId);
      navigate("/trial-expired", { replace: true });
    }
  }, [user, billing, location.pathname, navigate]);
}
