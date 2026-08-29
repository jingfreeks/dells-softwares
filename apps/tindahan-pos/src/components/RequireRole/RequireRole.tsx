import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/lib";
import type { Role } from "@/lib/types";

interface RequireRoleProps {
  roles: Role[];
  children: ReactNode;
}

/**
 * Route-level role gate for pages that are role-restricted (not just
 * permission-restricted -- see Staff.tsx/Reports.tsx for the
 * useCan()-based pattern where a granular RBAC permission, not the raw
 * staff.role, decides access).
 *
 * nav.ts's `roles` list on a nav entry only controls whether the sidebar
 * link is shown -- it was never enforced against a direct navigation.
 * Every route wrapped in this component previously rendered fully for any
 * signed-in staff member who typed its URL, admin-only content and all
 * (found live: a Cashier reaching /admin, /reports, and every
 * /settings/* sub-page except Profile). ProtectedRoute only checks "is
 * this person signed in at all" -- this is the actual per-route check.
 */
export function RequireRole({ roles, children }: RequireRoleProps) {
  const { user } = useAuth();
  if (user && !roles.includes(user.role)) {
    return <Navigate to="/pos" replace />;
  }
  return <>{children}</>;
}
