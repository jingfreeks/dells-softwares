import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth, ARIA_LOADING } from "@/lib";
import { Sidebar } from "@/components/Sidebar";
import { MobileHeader } from "@/components/MobileHeader";
import { BottomNav } from "@/components/BottomNav";
import "@/pages/authTheme.css";

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="tpl-root tpl-shell-bg flex h-screen items-center justify-center">
        <div
          role="status"
          aria-label={ARIA_LOADING}
          className="h-8 w-8 animate-spin rounded-full border-2 border-white/15 border-t-[#3B82F6]"
        />
      </div>
    );
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
