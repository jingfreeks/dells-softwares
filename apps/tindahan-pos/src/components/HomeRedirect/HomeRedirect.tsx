import { useEffect, useRef } from "react";
import { Navigate, useSearchParams } from "react-router-dom";
import { useAuth, useBillingState } from "@/lib";
import { startTrialBestEffort } from "@/lib/billing/startTrial";
import { PageLoadingOverlay } from "@/components/PageLoadingOverlay";
import { Landing } from "@/pages/Landing";

const TRIALABLE_PLAN_CODES = new Set(["BUSINESS"]);

/**
 * Where a bare "/" actually lands, once we know who's signed in — a
 * signed-out visitor sees the marketing Landing page, admins land on the
 * Dashboard, cashiers land on the register. /admin has no role guard of
 * its own beyond "signed in", so this has to wait for the profile (and
 * its role) to load rather than guessing before `user` is populated, or
 * an admin would flash through to /pos before the redirect had anything
 * to go on.
 *
 * Also where a Google OAuth redirect always lands, whatever page the
 * sign-up started from — Register's ?plan=CODE CTA can't survive that
 * round trip on its own (see loginWithGoogle()'s comment), so it's carried
 * here as a query param on the redirect URL instead and started once a
 * session exists.
 */
export function HomeRedirect() {
  const { user, loading } = useAuth();
  const billing = useBillingState();
  const [searchParams] = useSearchParams();
  const planCode = searchParams.get("plan");
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    if (!user || !planCode || !TRIALABLE_PLAN_CODES.has(planCode)) return;
    if (billing?.trialEndsAt) return;
    startedRef.current = true;
    startTrialBestEffort(planCode as "BUSINESS");
  }, [user, planCode, billing]);

  if (loading) {
    return <PageLoadingOverlay />;
  }

  if (!user) return <Landing />;
  return <Navigate to={user.role === "admin" ? "/admin" : "/pos"} replace />;
}
