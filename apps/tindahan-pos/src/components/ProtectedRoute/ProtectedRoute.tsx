import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth, TITLE_UNABLE_TO_CONNECT, LABEL_SKIP_TO_CONTENT } from "@/lib";
import { Sidebar } from "@/components/Sidebar";
import { MobileHeader } from "@/components/MobileHeader";
import { BillingBanner } from "@/components/BillingBanner";
import { AlphaModeBadge } from "@/components/AlphaModeBadge";
import { BottomNav } from "@/components/BottomNav";
import { PageLoadingOverlay } from "@/components/PageLoadingOverlay";
import { PageErrorOverlay } from "@/components/PageErrorOverlay";
import { useTrialExpiredRedirect } from "@/lib/billing/useTrialExpiredRedirect";
import "@/pages/authTheme.css";

// A layout route (rendered once via <Route element={<ProtectedRoute />}>
// wrapping every authenticated page as a child route) rather than a
// wrapper taking `children`. Sidebar/MobileHeader/BottomNav mount once and
// stay mounted across navigation between authenticated pages — only
// <Outlet /> swaps — so switching pages no longer unmounts and remounts
// the whole shell (which showed up as a white flash between pages).
export function ProtectedRoute() {
  const { user, deviceSession, loading, authError, retryAuth } = useAuth();
  const location = useLocation();
  useTrialExpiredRedirect();

  if (loading) {
    return <PageLoadingOverlay variant="dark" />;
  }

  // A real connection/initialization failure (not just "not signed in")
  // must never render as a blank screen — give the user a way to retry.
  if (authError) {
    return <PageErrorOverlay variant="dark" title={TITLE_UNABLE_TO_CONNECT} message={authError} onRetry={retryAuth} />;
  }

  // A paired device (Phase 3) has a real session but no human staff member
  // behind it — it can only ever reach /pos (the cashier picker / POS
  // checkout screen), never Staff/Settings/Admin/Inventory/Customers. No
  // Sidebar/BottomNav — a bare register isn't meant to navigate anywhere.
  if (deviceSession && !user) {
    if (location.pathname !== "/pos") {
      return <Navigate to="/pos" replace />;
    }
    return (
      <main className="tpl-root tpl-shell-bg h-screen">
        <Outlet />
      </main>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Admins who haven't finished the post-registration onboarding wizard get
  // bounced there from any other protected route — cashiers never see it
  // since only the registering admin sets up store info. /demo is the one
  // exception: "Explore Demo Store" is chosen from inside the wizard
  // (WelcomeStep) precisely so the real store can stay un-onboarded while
  // it's used, so this gate must not immediately bounce it back.
  if (user.role === "admin" && !user.onboardedAt && location.pathname !== "/demo") {
    return <Navigate to="/onboarding" replace />;
  }

  return (
    <div className="tpl-root tpl-shell-bg flex h-screen flex-col lg:flex-row">
      <a href="#main-content" className="tpl-skip-link">
        {LABEL_SKIP_TO_CONTENT}
      </a>
      <Sidebar />
      <div className="flex min-h-0 flex-1 flex-col">
        <MobileHeader />
        <BillingBanner />
        <AlphaModeBadge />
        <main id="main-content" className="tpl-main flex-1 pb-16 lg:pb-0" tabIndex={-1}>
          <Outlet />
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
