import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { PlatformProvider, usePlatform } from "./lib/platform";
import { MfaGate, NoAccess, Shell } from "./components/Shell";
import { Login } from "./pages/Login";
import { Organizations } from "./pages/Organizations";
import { OrganizationDetail } from "./pages/OrganizationDetail";
import { Audit } from "./pages/Audit";

/**
 * The gate is resolved once, here, rather than per route -- so there is no
 * path through the router that renders a console screen without a verified
 * administrator behind it.
 */
function Console() {
  const { session, admin, loading } = usePlatform();

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

  if (!session) return <Login />;
  if (!admin) return <NoAccess />;
  if (!admin.mfaFresh) return <MfaGate />;

  return (
    <Shell>
      <Routes>
        <Route path="/organizations" element={<Organizations />} />
        <Route path="/organizations/:orgId" element={<OrganizationDetail />} />
        <Route path="/audit" element={<Audit />} />
        <Route path="*" element={<Navigate to="/organizations" replace />} />
      </Routes>
    </Shell>
  );
}

export default function App() {
  return (
    <PlatformProvider>
      <BrowserRouter>
        <Console />
      </BrowserRouter>
    </PlatformProvider>
  );
}
