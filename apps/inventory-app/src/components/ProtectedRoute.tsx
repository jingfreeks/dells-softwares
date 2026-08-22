import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { Sidebar } from "./Sidebar";
import { MobileHeader } from "./MobileHeader";
import { BottomNav } from "./BottomNav";
import { ModuleBanner } from "./ModuleBanner";

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();

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

  return (
    <div className="flex h-screen flex-col bg-[var(--color-canvas)] lg:flex-row lg:gap-3 lg:p-3">
      <div className="shrink-0 overflow-hidden lg:rounded-2xl lg:shadow-[0_1px_2px_rgba(15,23,42,0.04),0_14px_32px_-18px_rgba(201,59,46,0.22)]">
        <Sidebar />
      </div>
      <div className="flex min-h-0 flex-1 flex-col">
        <MobileHeader />
        <ModuleBanner />
        <main className="flex-1 overflow-y-auto pb-16 lg:pb-0">{children}</main>
      </div>
      <BottomNav />
    </div>
  );
}
