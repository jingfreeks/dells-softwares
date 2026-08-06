import { useRef, type ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/lib";

/**
 * Guards /onboarding specifically — deliberately doesn't reuse
 * ProtectedRoute's chrome (Sidebar/BottomNav) since the wizard is a
 * full-screen, one-time flow. Bounces a signed-in admin who already
 * finished onboarding straight to the dashboard, so the URL can't be
 * revisited to redo it.
 */
export function OnboardingRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();

  // Snapshotted once, on the first render where a user is actually
  // available — not read live on every render. Onboarding.tsx flips
  // user.onboardedAt right before navigating itself to /admin on
  // completion; if this read the live value, that same state change would
  // make this route redirect to /pos in a race with that explicit
  // navigation, while the wizard is still mounted.
  const alreadyOnboardedRef = useRef<boolean | null>(null);
  if (!loading && user && alreadyOnboardedRef.current === null) {
    alreadyOnboardedRef.current = Boolean(user.onboardedAt);
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[var(--color-canvas)]">
        <div
          role="status"
          aria-label="Loading"
          className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-[var(--color-brand)]"
        />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role !== "admin" || alreadyOnboardedRef.current) {
    return <Navigate to="/pos" replace />;
  }

  return <>{children}</>;
}
