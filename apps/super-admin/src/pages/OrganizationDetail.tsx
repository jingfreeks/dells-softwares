import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  listOrganizationModules,
  listOrganizations,
  setModule,
  type Organization,
  type OrganizationModule,
} from "../lib/platform";

export function OrganizationDetail() {
  const { orgId = "" } = useParams();
  const [org, setOrg] = useState<Organization | null>(null);
  const [modules, setModules] = useState<OrganizationModule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyModule, setBusyModule] = useState<string | null>(null);
  const [reason, setReason] = useState("");

  const load = useCallback(async () => {
    const [orgs, mods] = await Promise.all([listOrganizations(), listOrganizationModules(orgId)]);
    setOrg(orgs.find((o) => o.organizationId === orgId) ?? null);
    setModules(mods);
  }, [orgId]);

  useEffect(() => {
    let cancelled = false;
    load()
      .catch((err) => !cancelled && setError(err instanceof Error ? err.message : "Could not load organization."))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [load]);

  async function handleToggle(module: OrganizationModule) {
    setBusyModule(module.moduleCode);
    setError(null);
    try {
      await setModule(orgId, module.moduleCode, !module.enabled, reason);
      await load();
      setReason("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not change this module.");
    } finally {
      setBusyModule(null);
    }
  }

  if (loading) return <p className="p-6 text-sm text-slate-400">Loading…</p>;

  return (
    <div className="p-6">
      <Link to="/organizations" className="text-sm text-[var(--color-brand)] hover:underline">
        ← Organizations
      </Link>

      <h1 className="mt-2 text-xl font-bold tracking-tight text-slate-900">{org?.name ?? "Organization"}</h1>
      <p className="text-sm text-slate-500">
        {org?.planCode ?? "No plan"} · {org?.subscriptionStatus ?? "—"} · {org?.branchCount ?? 0} branch(es) ·{" "}
        {org?.staffCount ?? 0} staff
      </p>

      {error && (
        <p role="alert" className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="mt-6 max-w-2xl">
        <label htmlFor="reason" className="text-xs font-medium text-slate-700">
          Reason (recorded in the platform audit)
        </label>
        <input
          id="reason"
          type="text"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="e.g. pilot customer, paid upgrade, ticket #42"
          className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-[var(--color-brand)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand)]"
        />
      </div>

      <div className="mt-4 max-w-2xl overflow-hidden rounded-2xl border border-slate-200 bg-white">
        {modules.map((m) => {
          // CORE is always on and not sellable; the server refuses to disable
          // it, so offering a control here would be a lie.
          const locked = !m.isSellable;
          return (
            <div
              key={m.moduleCode}
              className="flex items-center justify-between gap-4 border-b border-slate-100 px-4 py-3 last:border-b-0"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-800">{m.name}</p>
                <p className="text-xs text-slate-400">
                  {m.moduleCode}
                  {m.source ? ` · ${m.source}` : ""}
                  {m.validUntil ? ` · until ${new Date(m.validUntil).toLocaleDateString()}` : ""}
                </p>
              </div>

              {locked ? (
                <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-500">
                  Always on
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => handleToggle(m)}
                  disabled={busyModule === m.moduleCode}
                  aria-pressed={m.enabled}
                  className={`shrink-0 cursor-pointer rounded-xl px-3 py-1.5 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-60 ${
                    m.enabled
                      ? "bg-[var(--color-brand-light)] text-[var(--color-brand)] hover:bg-[var(--color-brand)]/15"
                      : "border border-slate-300 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {busyModule === m.moduleCode ? "Saving…" : m.enabled ? "Enabled" : "Disabled"}
                </button>
              )}
            </div>
          );
        })}
      </div>

      <p className="mt-3 max-w-2xl text-xs text-slate-400">
        Changes take effect immediately and are recorded as a manual grant, so they survive the
        tenant&apos;s next plan change. Disabling a module blocks new records but never hides or
        deletes existing data.
      </p>
    </div>
  );
}
