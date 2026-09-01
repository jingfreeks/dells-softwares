import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { listPlatformAudit, usePlatform, type PlatformAuditEntry } from "../lib/platform";

/**
 * Security (platform-security.html).
 *
 * The nav has always carried a Security entry; until now it had no route
 * and fell through to the dashboard redirect, which is a dead link that
 * looks like a working one.
 *
 * Everything here is read from something real: the session, the roster
 * row returned by platform_me(), the account's own TOTP factors, and the
 * audit log. Nothing asserts a posture the browser cannot observe -- no
 * "RLS: enabled", no "encryption: on", no green ticks for infrastructure
 * this app has no way to verify. The last card names what is missing
 * instead, so an absent fact reads as absent rather than as fine.
 */
export function Security() {
  const { admin, session, getMfaStatus } = usePlatform();
  const [mfa, setMfa] = useState<{ enrolled: boolean; factorId: string | null } | null>(null);
  const [events, setEvents] = useState<PlatformAuditEntry[]>([]);
  const [now, setNow] = useState(() => Date.now());

  // The MFA window is the thing most worth watching on this page, so the
  // remaining time is live rather than a figure that silently goes stale.
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    let cancelled = false;
    getMfaStatus().then((s) => !cancelled && setMfa(s));
    return () => {
      cancelled = true;
    };
  }, [getMfaStatus]);

  // Same gate as the audit page, matching the RLS policy on
  // core.platform_audit_logs. Anyone else simply gets no feed.
  const mayReadAudit = admin?.scope === "ENGINEER" || admin?.scope === "SUPERUSER";

  useEffect(() => {
    if (!mayReadAudit) return;
    let cancelled = false;
    listPlatformAudit(100)
      .then((rows) => !cancelled && setEvents(rows))
      .catch(() => {
        /* The feed is supplementary; the audit page reports its own errors. */
      });
    return () => {
      cancelled = true;
    };
  }, [mayReadAudit]);

  const adminEvents = useMemo(
    () => events.filter((e) => ADMIN_ACTION.test(e.action)).slice(0, 6),
    [events]
  );

  const expiresAt = admin?.mfaExpiresAt ? new Date(admin.mfaExpiresAt).getTime() : null;
  const msLeft = expiresAt === null ? null : expiresAt - now;

  return (
    <div className="px-7 py-6">
      <header className="mb-5">
        <h1 className="text-[19px] font-semibold" style={{ color: "var(--t1)" }}>Security</h1>
        <p className="mt-0.5 text-[12.5px]" style={{ color: "var(--t6)" }}>
          The authority you are currently acting with, and where it comes from.
        </p>
      </header>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card p-5" aria-label="This session">
          <h2 className="mb-3 text-[13.5px] font-semibold" style={{ color: "var(--t2)" }}>This session</h2>
          <dl className="grid gap-2.5">
            <Row label="Signed in as" value={session?.user?.email ?? "—"} />
            <Row label="Platform scope" value={admin?.scope ?? "none"} mono />
            <Row label="Roster status" value={admin?.status ?? "—"} mono />
            <Row
              label="Two-factor"
              value={
                msLeft === null
                  ? "Not verified"
                  : msLeft <= 0
                    ? "Expired"
                    : `Valid for ${formatLeft(msLeft)}`
              }
              tone={msLeft !== null && msLeft > 0 ? "ok" : "bad"}
            />
          </dl>
          <p className="mt-3.5 text-[11.5px]" style={{ color: "var(--t9)" }}>
            Platform authority lapses 8 hours after each two-factor verification. The database
            enforces that window itself — core.is_platform_admin() requires an ACTIVE roster row
            whose mfa_verified_at is inside 8 hours — so an expired session loses access whether or
            not this console notices.
          </p>
        </section>

        <section className="card p-5" aria-label="Authenticator">
          <h2 className="mb-3 text-[13.5px] font-semibold" style={{ color: "var(--t2)" }}>
            Authenticator
          </h2>
          {mfa === null ? (
            <p className="text-[12.5px]" style={{ color: "var(--t6)" }}>Checking…</p>
          ) : (
            <dl className="grid gap-2.5">
              <Row
                label="TOTP factor"
                value={mfa.enrolled ? "Enrolled and verified" : "Not enrolled"}
                tone={mfa.enrolled ? "ok" : "bad"}
              />
              {mfa.factorId && <Row label="Factor id" value={mfa.factorId} mono />}
            </dl>
          )}
          <p className="mt-3.5 text-[11.5px]" style={{ color: "var(--t9)" }}>
            Read from this account&apos;s own factors. There is deliberately no unenroll control
            here: dropping the only factor would lock this account out of the console entirely, and
            the recovery path is an operator action rather than a button.
          </p>
        </section>
      </div>

      <section className="card mt-4 p-5" aria-label="Scope capabilities">
        <h2 className="mb-1 text-[13.5px] font-semibold" style={{ color: "var(--t2)" }}>
          What {admin?.scope ?? "this scope"} authorizes
        </h2>
        <p className="mb-4 text-[11.5px]" style={{ color: "var(--t9)" }}>
          Taken from the checks the functions actually run, not from a description of them.
          SUPERUSER satisfies every scope.
        </p>

        <div className="grid gap-5 sm:grid-cols-2">
          {CAPABILITIES.map((group) => (
            <div key={group.group}>
              <h3
                className="mb-2 text-[11px] font-semibold"
                style={{ color: "var(--t6)", letterSpacing: ".5px" }}
              >
                {group.group.toUpperCase()}
              </h3>
              <ul className="grid gap-1.5">
                {group.items.map((item) => {
                  const allowed = grants(admin?.scope, item.scope);
                  return (
                    <li key={item.label} className="flex items-start gap-2">
                      <span
                        aria-hidden
                        className="mt-[3px] inline-block h-[13px] w-[13px] shrink-0 rounded-full border"
                        style={
                          allowed
                            ? { borderColor: "rgba(74,222,128,.4)", background: "rgba(74,222,128,.18)" }
                            : { borderColor: "var(--bd)", background: "transparent" }
                        }
                      />
                      <span className="min-w-0">
                        <span
                          className="block text-[12.5px]"
                          style={{ color: allowed ? "var(--t3)" : "var(--t8)" }}
                        >
                          {item.label}
                          <span className="sr-only">{allowed ? " — permitted" : " — not permitted"}</span>
                        </span>
                        <span className="block text-[11px]" style={{ color: "var(--t9)" }}>
                          {item.note ?? (item.scope ? `Requires ${item.scope}` : "Any active admin")}
                        </span>
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {mayReadAudit && (
        <section className="card mt-4 p-5" aria-label="Administrator identity events">
          <div className="mb-3 flex items-baseline justify-between gap-3">
            <h2 className="text-[13.5px] font-semibold" style={{ color: "var(--t2)" }}>
              Administrator identity events
            </h2>
            <Link to="/audit" className="text-[12px] hover:underline" style={{ color: "var(--a4)" }}>
              Full audit
            </Link>
          </div>

          {adminEvents.length === 0 ? (
            <p className="text-[12.5px]" style={{ color: "var(--t6)" }}>
              No administrator identity events in the last 100 platform actions.
            </p>
          ) : (
            <ul className="grid gap-2">
              {adminEvents.map((e) => (
                <li key={e.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
                  <span className="techno" style={{ color: "var(--t3)" }}>{e.action}</span>
                  <span className="text-[12px]" style={{ color: "var(--t6)" }}>
                    {e.actorEmail ?? "system"}
                  </span>
                  <span className="text-[11.5px] tabular-nums" style={{ color: "var(--t9)" }}>
                    {new Date(e.createdAt).toLocaleString()}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3.5 text-[11.5px]" style={{ color: "var(--t9)" }}>
            Filtered to actions affecting administrator identity — grants, revocations, bootstraps
            and two-factor verifications — from the 100 most recent platform events. Everything
            else is on the audit page; nothing is hidden by this filter that is not reachable there.
          </p>
        </section>
      )}

      <section className="card mt-4 p-5" aria-label="Unavailable information">
        <h2 className="mb-1 text-[13.5px] font-semibold" style={{ color: "var(--t2)" }}>
          What this page cannot tell you
        </h2>
        <p className="mb-3 text-[11.5px]" style={{ color: "var(--t9)" }}>
          Listed rather than omitted, so a missing fact is not mistaken for a clean one.
        </p>
        <ul className="grid gap-1.5">
          {UNAVAILABLE.map((u) => (
            <li key={u.what} className="text-[12.5px]" style={{ color: "var(--t5)" }}>
              <span style={{ color: "var(--t3)" }}>{u.what}</span>
              <span style={{ color: "var(--t9)" }}> — {u.why}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

/** Mirrors core.is_platform_admin(): an exact scope match, or SUPERUSER,
 *  or no scope requirement at all. */
function grants(scope: string | undefined, required: string | null): boolean {
  if (!scope) return false;
  if (required === null) return true;
  return scope === required || scope === "SUPERUSER";
}

const ADMIN_ACTION = /^(PLATFORM_ADMIN_|BOOTSTRAP_)/;

/**
 * Verified against the live database rather than the migration files --
 * several of these functions are redefined across migrations, so only the
 * current definition is authoritative.
 */
const CAPABILITIES: { group: string; items: { label: string; scope: string | null; note?: string }[] }[] = [
  {
    group: "Tenants",
    items: [
      { label: "View organizations, plans, modules, features and limits", scope: null },
      {
        label: "Enable or disable a module",
        scope: null,
        note: "Any active admin — unlike every other entitlement change. Known gap, issue #415.",
      },
    ],
  },
  {
    group: "Billing",
    items: [
      { label: "Change a plan", scope: "BILLING" },
      { label: "Change subscription status", scope: "BILLING" },
      { label: "Override a feature or a limit", scope: "BILLING" },
      { label: "Reset a feature or module to its plan", scope: "BILLING" },
    ],
  },
  {
    group: "Account deletion",
    items: [
      { label: "View deletion requests", scope: "ENGINEER" },
      { label: "Deny a deletion request", scope: "ENGINEER" },
      { label: "Approve a deletion request", scope: "ENGINEER", note: "Requires ENGINEER — irreversible" },
    ],
  },
  {
    group: "Platform",
    items: [
      { label: "Read the platform audit log", scope: "ENGINEER" },
      {
        label: "Grant or revoke a platform administrator",
        scope: "SUPERUSER",
        note: "Requires SUPERUSER — not exposed in this console",
      },
    ],
  },
];

const UNAVAILABLE = [
  {
    what: "The list of platform administrators",
    why: "no RPC returns the roster; core.platform_admins is not reachable from the browser",
  },
  {
    what: "Your other active sessions and devices",
    why: "the client can only see the session it is holding",
  },
  {
    what: "IP address and request metadata for audit events",
    why: "platform_audit() does not return them",
  },
  {
    what: "Database and infrastructure posture",
    why: "not observable from the browser; asserting it here would be a claim this app cannot check",
  },
];

function formatLeft(ms: number): string {
  const mins = Math.floor(ms / 60_000);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function Row({
  label,
  value,
  mono,
  tone,
}: {
  label: string;
  value: string;
  mono?: boolean;
  tone?: "ok" | "bad";
}) {
  const color = tone === "ok" ? "var(--okd)" : tone === "bad" ? "var(--bad)" : "var(--t3)";
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="shrink-0 text-[12px]" style={{ color: "var(--t6)" }}>{label}</dt>
      <dd
        className={`min-w-0 truncate text-right ${mono ? "techno" : "text-[12.5px]"}`}
        style={{ color }}
      >
        {value}
      </dd>
    </div>
  );
}
