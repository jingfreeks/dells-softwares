import { useEffect, useState } from "react";
import { listPlatformAudit, usePlatform, type PlatformAuditEntry } from "../lib/platform";

export function Audit() {
  const { admin } = usePlatform();
  const [entries, setEntries] = useState<PlatformAuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    listPlatformAudit(200)
      .then((rows) => !cancelled && setEntries(rows))
      .catch((err) => !cancelled && setError(err instanceof Error ? err.message : "Could not load the audit log."))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  // ENGINEER scope only, matching the RLS policy on core.platform_audit_logs.
  // SUPERUSER satisfies it; SUPPORT and BILLING legitimately get nothing.
  const mayRead = admin?.scope === "ENGINEER" || admin?.scope === "SUPERUSER";

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold tracking-tight text-slate-900">Platform audit</h1>
      <p className="text-sm text-slate-500">
        Platform-level actions that belong to no single tenant — admin grants, module changes,
        break-glass bootstraps.
      </p>

      {!mayRead && (
        <p className="mt-4 rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-600">
          Your scope ({admin?.scope}) can&apos;t read the platform audit. ENGINEER or SUPERUSER is
          required.
        </p>
      )}

      {error && (
        <p role="alert" className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="mt-6 overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <div className="min-w-[760px]">
        <div className="grid grid-cols-[150px_minmax(0,1fr)_200px_minmax(0,1fr)] gap-3 border-b border-slate-200 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
          <span>When</span>
          <span>Action</span>
          <span>Actor</span>
          <span>Reason</span>
        </div>

        {loading && <p className="px-4 py-8 text-center text-sm text-slate-400">Loading…</p>}

        {!loading && entries.length === 0 && (
          <p className="px-4 py-8 text-center text-sm text-slate-400">Nothing recorded yet.</p>
        )}

        {entries.map((e) => (
          <div
            key={e.id}
            className="grid grid-cols-[150px_minmax(0,1fr)_200px_minmax(0,1fr)] gap-3 border-b border-slate-100 px-4 py-2.5 text-sm last:border-b-0"
          >
            <span className="text-xs text-slate-500">
              {new Date(e.createdAt).toLocaleString([], {
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
              })}
            </span>
            <span className="truncate font-medium text-slate-800">{e.action}</span>
            <span className="truncate text-slate-600">{e.actorEmail ?? "system"}</span>
            <span className="truncate text-slate-500">{e.reason ?? "—"}</span>
          </div>
        ))}
        </div>
      </div>
    </div>
  );
}
