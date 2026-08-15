import { useState, type ReactNode } from "react";
import { NavLink } from "react-router-dom";
import { usePlatform } from "../lib/platform";

/**
 * The console has four states, and conflating any two of them would be a
 * security or honesty problem:
 *
 *   loading          -> say nothing yet
 *   not signed in    -> sign-in form
 *   signed in, not an administrator -> a flat refusal that reveals nothing
 *                       about the platform admin layer (platform_me()
 *                       returns zero rows, exactly as it does for a cashier)
 *   administrator, second factor stale -> the MFA step, and NOTHING else;
 *                       every platform_* RPC would return empty anyway, so
 *                       rendering the console here would show a
 *                       convincing-looking but entirely empty platform
 */
export function Shell({ children }: { children: ReactNode }) {
  const { admin, signOut } = usePlatform();

  return (
    <div className="flex h-screen bg-[var(--color-canvas)]">
      <aside className="flex w-60 shrink-0 flex-col border-r border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-5 py-4">
          <p className="text-sm font-bold tracking-tight text-slate-900">Platform Console</p>
          <p className="text-xs text-slate-500">Dell&apos;s Software</p>
        </div>

        <nav className="flex flex-1 flex-col gap-0.5 p-3" aria-label="Main">
          <ConsoleLink to="/organizations">Organizations</ConsoleLink>
          <ConsoleLink to="/audit">Platform audit</ConsoleLink>
        </nav>

        <div className="border-t border-slate-200 p-3">
          <div className="px-2 pb-2">
            <p className="text-xs font-medium text-slate-700">{admin?.scope}</p>
            <p className="text-[11px] text-slate-400">
              MFA valid until{" "}
              {admin?.mfaExpiresAt
                ? new Date(admin.mfaExpiresAt).toLocaleTimeString([], {
                    hour: "numeric",
                    minute: "2-digit",
                  })
                : "—"}
            </p>
          </div>
          <button
            type="button"
            onClick={signOut}
            className="w-full cursor-pointer rounded-lg px-2 py-1.5 text-left text-sm text-slate-600 hover:bg-slate-100"
          >
            Log out
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}

function ConsoleLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `rounded-lg px-3 py-2 text-sm font-medium ${
          isActive ? "bg-[var(--color-brand-light)] text-[var(--color-brand)]" : "text-slate-600 hover:bg-slate-100"
        }`
      }
    >
      {children}
    </NavLink>
  );
}

/** Signed in, but no platform_admins row. Says nothing more than it must. */
export function NoAccess() {
  const { signOut } = usePlatform();
  return (
    <CenteredCard title="No access">
      <p className="text-sm text-slate-600">
        This account isn&apos;t authorised for the platform console.
      </p>
      <button
        type="button"
        onClick={signOut}
        className="mt-4 w-full cursor-pointer rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
      >
        Sign out
      </button>
    </CenteredCard>
  );
}

/**
 * Administrator whose second factor is stale. The button does not "unlock"
 * anything client-side -- it calls platform_verify_mfa(), which the server
 * refuses unless the session JWT actually carries aal2.
 */
export function MfaGate() {
  const { verifyMfa, signOut } = usePlatform();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleVerify() {
    setBusy(true);
    setError(null);
    const result = await verifyMfa();
    setBusy(false);
    if (!result.ok) setError(result.error ?? "Could not verify your second factor.");
  }

  return (
    <CenteredCard title="Second factor required">
      <p className="text-sm text-slate-600">
        Platform administration needs a second factor verified in the last 8 hours.
      </p>
      {error && (
        <p role="alert" className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error === "MFA_REQUIRED: platform administration requires a second factor"
            ? "Your current session doesn’t carry a second factor. Sign in again with MFA enrolled on this account."
            : error}
        </p>
      )}
      <button
        type="button"
        onClick={handleVerify}
        disabled={busy}
        className="mt-4 w-full cursor-pointer rounded-xl bg-[var(--color-brand)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--color-brand-dark)] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {busy ? "Verifying…" : "Verify second factor"}
      </button>
      <button
        type="button"
        onClick={signOut}
        className="mt-2 w-full cursor-pointer rounded-xl px-4 py-2 text-sm text-slate-500 hover:bg-slate-50"
      >
        Sign out
      </button>
    </CenteredCard>
  );
}

export function CenteredCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--color-canvas)] p-6">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-brand)]">
          Platform Console
        </p>
        <h1 className="mt-1 text-lg font-bold tracking-tight text-slate-900">{title}</h1>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}
