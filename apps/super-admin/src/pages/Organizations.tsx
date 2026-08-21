import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { listOrganizations, type Organization } from "../lib/platform";

export function Organizations() {
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    listOrganizations()
      .then((rows) => !cancelled && setOrgs(rows))
      .catch((err) => !cancelled && setError(err instanceof Error ? err.message : "Could not load organizations."))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold tracking-tight text-slate-900">Organizations</h1>
      <p className="text-sm text-slate-500">
        Every tenant on the platform. Open one to change which applications it may use.
      </p>

      {error && (
        <p role="alert" className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {/* Six columns need real width. Scroll the table rather than let the
          columns collapse into each other on a narrow window. */}
      <div className="mt-6 overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <div className="min-w-[860px]">
        <div className="grid grid-cols-[minmax(0,2fr)_110px_120px_80px_80px_minmax(0,1.6fr)] gap-3 border-b border-slate-200 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
          <span>Organization</span>
          <span>Plan</span>
          <span>Subscription</span>
          <span className="text-right">Branches</span>
          <span className="text-right">Staff</span>
          <span>Modules</span>
        </div>

        {loading && <p className="px-4 py-8 text-center text-sm text-slate-400">Loading…</p>}

        {!loading && orgs.length === 0 && !error && (
          <p className="px-4 py-8 text-center text-sm text-slate-400">No organizations yet.</p>
        )}

        {orgs.map((org) => (
          <Link
            key={org.organizationId}
            to={`/organizations/${org.organizationId}`}
            className="grid grid-cols-[minmax(0,2fr)_110px_120px_80px_80px_minmax(0,1.6fr)] items-center gap-3 border-b border-slate-100 px-4 py-3 text-sm last:border-b-0 hover:bg-slate-50"
          >
            <div className="min-w-0">
              <p className="truncate font-medium text-slate-800">{org.name}</p>
              <p className="text-xs text-slate-400">{org.status}</p>
            </div>
            <span className="text-slate-600">{org.planCode ?? "—"}</span>
            <span className="text-slate-600">{org.subscriptionStatus ?? "—"}</span>
            <span className="text-right tabular-nums text-slate-600">{org.branchCount}</span>
            <span className="text-right tabular-nums text-slate-600">{org.staffCount}</span>
            <div className="flex flex-wrap gap-1">
              {org.enabledModules
                .filter((m) => m !== "CORE")
                .map((m) => (
                  <span
                    key={m}
                    className="rounded-full bg-[var(--color-brand-light)] px-2 py-0.5 text-[11px] font-medium text-[var(--color-brand)]"
                  >
                    {m}
                  </span>
                ))}
            </div>
          </Link>
        ))}
        </div>
      </div>
    </div>
  );
}
