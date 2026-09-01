import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { NavLink } from "react-router-dom";
import { usePlatform, type MfaEnrollment } from "../lib/platform";

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
    <div className="flex h-screen">
      <aside
        className="flex w-60 shrink-0 flex-col border-r px-3 py-4"
        style={{ borderColor: "var(--bd2)", background: "var(--panel)" }}
      >
        <div className="mb-5 flex items-center gap-2.5 px-2">
          <span
            className="grid h-8 w-8 place-items-center rounded-lg text-sm font-bold text-white"
            style={{
              background: "linear-gradient(160deg,#F87171,#B91C1C)",
              boxShadow: "0 0 22px rgba(248,113,113,.30)",
            }}
            aria-hidden
          >
            P
          </span>
          <div>
            <p className="text-[13px] font-bold tracking-tight" style={{ color: "var(--t1)" }}>
              Platform Console
            </p>
            <p className="text-[11px]" style={{ color: "var(--t6)" }}>
              Dell&apos;s Softwares
            </p>
          </div>
        </div>

        <nav className="flex flex-1 flex-col gap-0.5" aria-label="Main">
          <ConsoleLink to="/dashboard">Dashboard</ConsoleLink>
          <ConsoleLink to="/organizations">Organizations</ConsoleLink>
          <ConsoleLink to="/deletion-requests">Deletion requests</ConsoleLink>
          <ConsoleLink to="/audit">Platform audit</ConsoleLink>
          <ConsoleLink to="/security">Security</ConsoleLink>
        </nav>

        {/* The security state is part of the chrome, not a page: the
            operator should always be able to see which identity they are
            acting as and how long that authority lasts. */}
        <div
          className="mb-3 rounded-xl border px-3 py-2.5"
          style={{ background: "rgba(248,113,113,.07)", borderColor: "rgba(248,113,113,.24)" }}
        >
          <p
            className="mb-0.5 text-[11px] font-semibold"
            style={{ color: "var(--bad)", letterSpacing: ".6px" }}
          >
            {admin?.scope ?? "NO SCOPE"}
          </p>
          <p className="text-[11.5px]" style={{ color: "var(--t6)" }}>
            {admin?.mfaExpiresAt
              ? `MFA valid until ${new Date(admin.mfaExpiresAt).toLocaleTimeString([], {
                  hour: "numeric",
                  minute: "2-digit",
                })}`
              : "MFA not verified"}
          </p>
        </div>

        <button
          type="button"
          onClick={signOut}
          className="cursor-pointer rounded-lg px-2 py-1.5 text-left text-[13px] transition-colors hover:bg-white/5"
          style={{ color: "var(--t6)" }}
        >
          Log out
        </button>
      </aside>

      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}

function ConsoleLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <NavLink
      to={to}
      className="rounded-lg px-3 py-2 text-[13.5px] font-medium transition-colors"
      style={({ isActive }) => ({
        color: isActive ? "var(--t1)" : "var(--t5)",
        background: isActive ? "var(--gl)" : "transparent",
      })}
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
      <p className="text-[13px]" style={{ color: "var(--t5)" }}>
        This account isn&apos;t authorised for the platform console.
      </p>
      <button
        type="button"
        onClick={signOut}
        className="mt-4 w-full cursor-pointer rounded-xl border px-4 py-2 text-[13px] font-medium hover:bg-white/5"
        style={{ borderColor: "var(--bd)", color: "var(--t3)" }}
      >
        Sign out
      </button>
    </CenteredCard>
  );
}

/**
 * Administrator whose second factor is stale (admin.mfaFresh === false).
 * This covers two genuinely different situations, distinguished by whether
 * the account has ever enrolled a TOTP factor at all:
 *
 *   - never enrolled -> show the QR code and take them through enrollment
 *     once, verifying the first code as part of turning it on
 *   - already enrolled, but this session hasn't proven it recently ->
 *     just ask for the next code from their existing authenticator
 *
 * Either way, the button does not "unlock" anything client-side --
 * verifyMfaCode() challenges the real factor and only then calls
 * platform_verify_mfa(), which the server refuses unless the session JWT
 * actually carries aal2.
 */
export function MfaGate() {
  const { getMfaStatus, enrollMfa, verifyMfaCode, signOut } = usePlatform();
  const [checkingStatus, setCheckingStatus] = useState(true);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [enrollment, setEnrollment] = useState<MfaEnrollment | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const status = await getMfaStatus();
      if (cancelled) return;
      if (status.enrolled && status.factorId) {
        setFactorId(status.factorId);
      } else {
        const result = await enrollMfa();
        if (cancelled) return;
        if (result.ok && result.enrollment) {
          setEnrollment(result.enrollment);
          setFactorId(result.enrollment.factorId);
        } else {
          setError(result.error ?? "Could not start enrollment.");
        }
      }
      setCheckingStatus(false);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleVerify(e: FormEvent) {
    e.preventDefault();
    if (!factorId) return;
    setBusy(true);
    setError(null);
    const result = await verifyMfaCode(factorId, code);
    setBusy(false);
    if (!result.ok) {
      setError(result.error ?? "Could not verify that code.");
      setCode("");
    }
  }

  if (checkingStatus) {
    return (
      <CenteredCard title="Second factor required">
        <div
          role="status"
          aria-label="Loading"
          className="h-6 w-6 animate-spin rounded-full border-2 border-white/15 border-t-[var(--bad)]"
        />
      </CenteredCard>
    );
  }

  return (
    <CenteredCard title={enrollment ? "Set up your second factor" : "Second factor required"}>
      {enrollment ? (
        <>
          <p className="text-[13px]" style={{ color: "var(--t5)" }}>
            Platform administration requires a second factor. Scan this with an authenticator app
            (Google Authenticator, 1Password, Authy), then enter the 6-digit code it shows.
          </p>
          {/* The QR stays on white regardless of the console's dark theme:
              the modules are dark-on-transparent, and a scanner needs the
              light ground behind them. */}
          <div className="mt-3 w-fit rounded-lg bg-white p-2">
            <img src={enrollment.qrCodeDataUri} alt="Scan with your authenticator app" width={220} height={220} />
          </div>
          <p className="mt-2.5 text-[11.5px]" style={{ color: "var(--t6)" }}>
            Can&apos;t scan? Enter this code manually:{" "}
            <code className="techno rounded px-1.5 py-0.5" style={{ background: "var(--gl3)", color: "var(--t3)" }}>
              {enrollment.secret}
            </code>
          </p>
        </>
      ) : (
        <p className="text-[13px]" style={{ color: "var(--t5)" }}>
          Enter the 6-digit code from your authenticator app for this account.
        </p>
      )}

      <form onSubmit={handleVerify}>
        <label htmlFor="mfaCode" className="sr-only">
          Authentication code
        </label>
        <input
          id="mfaCode"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
          className="mt-4 w-full rounded-xl border px-3 py-2.5 text-center text-lg tracking-[0.3em] outline-none focus:border-[var(--bad)]"
          style={{ background: "var(--gl3)", borderColor: "var(--bd)", color: "var(--t1)" }}
          placeholder="000000"
        />

        {error && (
          <p
            role="alert"
            className="mt-3 rounded-lg border px-3 py-2 text-[12.5px]"
            style={{ background: "rgba(248,113,113,.07)", borderColor: "rgba(248,113,113,.24)", color: "var(--bad)" }}
          >
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={busy || code.length !== 6}
          className="mt-4 w-full cursor-pointer rounded-xl bg-[var(--color-brand)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--color-brand-dark)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {busy ? "Verifying…" : enrollment ? "Verify and enable" : "Verify second factor"}
        </button>
      </form>
      <button
        type="button"
        onClick={signOut}
        className="mt-2 w-full cursor-pointer rounded-xl px-4 py-2 text-[12.5px] hover:bg-white/5"
        style={{ color: "var(--t6)" }}
      >
        Sign out
      </button>
    </CenteredCard>
  );
}

export function CenteredCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div
        className="w-full max-w-sm rounded-2xl border p-6"
        style={{ background: "var(--panel)", borderColor: "var(--bd2)" }}
      >
        <p
          className="mb-1 text-[11px] font-semibold"
          style={{ color: "var(--bad)", letterSpacing: ".7px" }}
        >
          PLATFORM CONSOLE
        </p>
        <h1 className="mb-4 text-[19px] font-semibold" style={{ color: "var(--t1)" }}>
          {title}
        </h1>
        {children}
      </div>
    </div>
  );
}
