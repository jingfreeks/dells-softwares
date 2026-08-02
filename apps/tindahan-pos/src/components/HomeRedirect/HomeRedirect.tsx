import { Navigate } from "react-router-dom";
import { useAuth, ARIA_LOADING } from "@/lib";

/**
 * Where a bare "/" (or an unmatched path) actually lands, once we know
 * who's signed in — admins land on the Dashboard, cashiers land on the
 * register. /admin has no role guard of its own beyond "signed in", so
 * this has to wait for the profile (and its role) to load rather than
 * guessing before `user` is populated, or an admin would flash through
 * to /pos before the redirect had anything to go on.
 */
export function HomeRedirect() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[var(--color-canvas)]">
        <div
          role="status"
          aria-label={ARIA_LOADING}
          className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-[var(--color-brand)]"
        />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={user.role === "admin" ? "/admin" : "/pos"} replace />;
}
