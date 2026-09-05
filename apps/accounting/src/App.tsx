import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { LoadingSkeleton } from "@/components";
import { Dashboard, NoAccess } from "@/pages";
import { SessionProvider, TEXT_LOADING, useSession } from "@/lib";

/**
 * One gate in front of every route.
 *
 * Not a security boundary -- the database is. Every accounting policy checks
 * the module and my_accounting_accounts() checks the permission, so a client
 * that skipped this would still be refused. What this decides is which honest
 * screen someone sees instead of a raw error.
 */
function Gate() {
  const { access } = useSession();

  if (access === "loading") return <LoadingSkeleton label={TEXT_LOADING} />;
  if (access !== "ready") return <NoAccess reason={access} />;

  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export function App() {
  return (
    <SessionProvider>
      <BrowserRouter>
        <Gate />
      </BrowserRouter>
    </SessionProvider>
  );
}
