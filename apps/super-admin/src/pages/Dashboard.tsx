import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  listDeletionRequests,
  listOrganizations,
  listPlatformAudit,
  listPlatformAdmins,
  type DeletionRequest,
  type Organization,
  type PlatformAuditEntry,
  type PlatformAdminRow,
} from "../lib/platform";

/**
 * Platform overview (platform-dashboard.html).
 *
 * Every number here is counted from rows the backend returned. The
 * design's own subtitle makes the promise -- "real counts from the
 * organizations table, nothing here is fabricated" -- so a metric with no
 * data source says so rather than showing a plausible number.
 */
export function Dashboard() {
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [requests, setRequests] = useState<DeletionRequest[]>([]);
  const [events, setEvents] = useState<PlatformAuditEntry[]>([]);
  const [admins, setAdmins] = useState<PlatformAdminRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([listOrganizations(), listDeletionRequests(), listPlatformAudit(8), listPlatformAdmins()])
      .then(([o, d, a, admin]) => {
        if (cancelled) return;
        setOrgs(o);
        setRequests(d);
        setEvents(a);
        setAdmins(admin);
      })
      .catch((err) => !cancelled && setError(err instanceof Error ? err.message : "Unable to load the platform overview."))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) return <PageFrame><Skeleton /></PageFrame>;

  if (error) {
    return (
      <PageFrame>
        <div className="card p-4" role="alert">
          <p className="text-sm" style={{ color: "var(--bad)" }}>{error}</p>
        </div>
      </PageFrame>
    );
  }

  const active = orgs.filter((o) => o.subscriptionStatus === "ACTIVE").length;
  const trialing = orgs.filter((o) => o.subscriptionStatus === "TRIALING").length;
  const cancelled = orgs.filter(
    (o) => o.status === "CANCELLED" || o.subscriptionStatus === "CANCELLED"
  ).length;
  const pending = requests.filter((r) => r.status === "PENDING").length;

  // Plan distribution, counted rather than assumed: an organization with
  // no plan is its own bucket instead of being dropped from the total.
  const byPlan = new Map<string, number>();
  for (const o of orgs) byPlan.set(o.planCode ?? "No plan", (byPlan.get(o.planCode ?? "No plan") ?? 0) + 1);
  const plans = [...byPlan.entries()].sort((a, b) => b[1] - a[1]);

  const recent = [...orgs]
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
    .slice(0, 5);

  return (
    <PageFrame>
      <div className="mb-4 grid grid-cols-2 gap-3.5 lg:grid-cols-4">
        <Metric label="ORGANIZATIONS" value={orgs.length} />
        <Metric label="ACTIVE STORES" value={active} />
        <Metric label="TRIAL" value={trialing} />
        <Metric label="CANCELLED" value={cancelled} />
      </div>

      <div className="mb-4 grid gap-3.5 lg:grid-cols-3">
        <section className="card p-4">
          <h2 className="mb-3 text-[13.5px] font-semibold" style={{ color: "var(--t2)" }}>
            Subscription distribution
          </h2>
          {orgs.length === 0 ? (
            <p className="text-[12.5px]" style={{ color: "var(--t6)" }}>No organizations yet.</p>
          ) : (
            <>
              <div className="mb-3 flex h-2.5 overflow-hidden rounded-full">
                {plans.map(([code, n], i) => (
                  <span
                    key={code}
                    style={{
                      width: `${(n / orgs.length) * 100}%`,
                      background: code === "No plan" ? "rgba(255,255,255,.14)" : PLAN_COLOURS[i % PLAN_COLOURS.length],
                    }}
                  />
                ))}
              </div>
              {plans.map(([code, n]) => (
                <div key={code} className="flex justify-between py-1 text-[12.5px]">
                  <span style={{ color: "var(--t5)" }}>{code}</span>
                  <span className="tabular-nums" style={{ color: "var(--t3)" }}>{n}</span>
                </div>
              ))}
            </>
          )}
        </section>

        <section className="card p-4">
          <h2 className="mb-3 text-[13.5px] font-semibold" style={{ color: "var(--t2)" }}>
            Platform admins
          </h2>
          <p className="text-[26px] font-semibold tabular-nums" style={{ color: "var(--t1)" }}>
            {admins.filter((a) => a.status === "ACTIVE").length}
          </p>
          <p className="text-[12px]" style={{ color: "var(--t6)" }}>
            active
            {admins.length > admins.filter((a) => a.status === "ACTIVE").length &&
              ` · ${admins.length - admins.filter((a) => a.status === "ACTIVE").length} inactive`}
          </p>
          <ul className="mt-3 grid gap-1">
            {admins
              .filter((a) => a.status === "ACTIVE")
              .map((a) => (
                <li key={a.email ?? a.scope} className="flex items-baseline justify-between gap-2">
                  <span className="truncate text-[12px]" style={{ color: "var(--t5)" }}>
                    {a.email ?? "unknown"}
                  </span>
                  <span className="techno shrink-0" style={{ color: a.mfaFresh ? "var(--okd)" : "var(--t9)" }}>
                    {a.scope}
                  </span>
                </li>
              ))}
          </ul>
          {/* mfa_verified_at is deliberately not returned by platform_admins():
              who can act right now is useful, when they last authenticated is
              session timing the console has no need for. */}
          <p className="mt-2.5 text-[11.5px]" style={{ color: "var(--t9)" }}>
            A scope in green has a second factor inside the 8-hour window and can act now.
            Granting or revoking an administrator requires SUPERUSER and is not exposed here.
          </p>
        </section>

        <section className="card p-4">
          <h2 className="mb-3 text-[13.5px] font-semibold" style={{ color: "var(--t2)" }}>
            Pending deletion requests
          </h2>
          <p className="text-[28px] font-semibold tabular-nums" style={{ color: "var(--t1)" }}>{pending}</p>
          <p className="mt-1 text-[12.5px]" style={{ color: "var(--t6)" }}>
            {pending === 0 ? "Nothing awaiting review right now." : "Awaiting a platform decision."}
          </p>
          {pending > 0 && (
            <Link to="/deletion-requests" className="mt-2 inline-block text-[12.5px]" style={{ color: "var(--a4)" }}>
              Review
            </Link>
          )}
        </section>
      </div>

      <div className="grid gap-3.5 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <section className="card p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-[13.5px] font-semibold" style={{ color: "var(--t2)" }}>
              Recent organization registrations
            </h2>
            <Link to="/organizations" className="text-[12.5px]" style={{ color: "var(--a4)" }}>View all</Link>
          </div>
          {recent.length === 0 ? (
            <p className="text-[12.5px]" style={{ color: "var(--t6)" }}>No organizations registered yet.</p>
          ) : (
            <ul>
              {recent.map((o) => (
                <li key={o.organizationId} className="flex items-center justify-between border-b py-2 last:border-0" style={{ borderColor: "var(--bd3)" }}>
                  <div className="min-w-0">
                    <Link to={`/organizations/${o.organizationId}`} className="block truncate text-[13px]" style={{ color: "var(--t2)" }}>
                      {o.name}
                    </Link>
                    <p className="text-[11.5px]" style={{ color: "var(--t9)" }}>
                      {o.planCode ?? "No plan"} · {o.staffCount} staff
                    </p>
                  </div>
                  <span className="shrink-0 text-[11.5px] tabular-nums" style={{ color: "var(--t6)" }}>
                    {new Date(o.createdAt).toLocaleDateString()}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-[13.5px] font-semibold" style={{ color: "var(--t2)" }}>
              Recent platform activity
            </h2>
            <Link to="/audit" className="text-[12.5px]" style={{ color: "var(--a4)" }}>View all</Link>
          </div>
          {events.length === 0 ? (
            <p className="text-[12.5px]" style={{ color: "var(--t6)" }}>No platform activity recorded yet.</p>
          ) : (
            <ul>
              {events.map((e) => (
                <li key={e.id} className="border-b py-2 last:border-0" style={{ borderColor: "var(--bd3)" }}>
                  <p className="techno" style={{ color: "var(--t3)" }}>{e.action}</p>
                  <p className="text-[11.5px]" style={{ color: "var(--t9)" }}>
                    {e.actorEmail ?? "system"} · {new Date(e.createdAt).toLocaleString()}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </PageFrame>
  );
}

const PLAN_COLOURS = ["#3B82F6", "#60A5FA", "#93C5FD"];

function PageFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-7 py-6">
      <header className="mb-5">
        <h1 className="text-[19px] font-semibold" style={{ color: "var(--t1)" }}>Platform overview</h1>
        <p className="mt-0.5 text-[12.5px]" style={{ color: "var(--t6)" }}>
          Real counts from the organizations table — nothing here is fabricated.
        </p>
      </header>
      {children}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="card p-4">
      <p className="mb-1 text-[11px] font-semibold" style={{ color: "var(--t6)", letterSpacing: ".6px" }}>
        {label}
      </p>
      <p className="text-[26px] font-semibold tabular-nums" style={{ color: "var(--t1)" }}>{value}</p>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4" aria-hidden>
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="card p-4">
          <div className="mb-2 h-2.5 w-20 rounded" style={{ background: "var(--gl)" }} />
          <div className="h-6 w-10 rounded" style={{ background: "var(--gl)" }} />
        </div>
      ))}
    </div>
  );
}
