import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/lib";
import { Sidebar } from "@/components/Sidebar";
import { MobileHeader } from "@/components/MobileHeader";
import { BottomNav } from "@/components/BottomNav";
import { PageLoadingOverlay } from "@/components/PageLoadingOverlay";
import "@/pages/authTheme.css";

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, deviceSession, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <PageLoadingOverlay variant="dark" />;
  }

  // A paired device (Phase 3) has a real session but no human staff member
  // behind it — it can only ever reach /pos (the cashier picker / POS
  // checkout screen), never Staff/Settings/Admin/Inventory/Customers. No
  // Sidebar/BottomNav — a bare register isn't meant to navigate anywhere.
  if (deviceSession && !user) {
    if (location.pathname !== "/pos") {
      return <Navigate to="/pos" replace />;
    }
    return <main className="tpl-root tpl-shell-bg h-screen">{children}</main>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Admins who haven't finished the post-registration onboarding wizard get
  // bounced there from any other protected route — cashiers never see it
  // since only the registering admin sets up store info.
  if (user.role === "admin" && !user.onboardedAt) {
    return <Navigate to="/onboarding" replace />;
  }

  return (
    <div className="tpl-root tpl-shell-bg flex h-screen flex-col lg:flex-row">
      <Sidebar />
      <div className="flex min-h-0 flex-1 flex-col">
        <MobileHeader />
        <main className="tpl-main flex-1 pb-16 lg:pb-0">{children}</main>
      </div>
      <BottomNav />
    </div>
  );
}
