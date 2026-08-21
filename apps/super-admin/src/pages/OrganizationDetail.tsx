import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  listOrganizationFeatures,
  listOrganizationLimits,
  listOrganizationModules,
  listOrganizations,
  listPlans,
  resetModuleToPlan,
  setModule,
  setPlan,
  setFeature,
  setLimit,
  resetFeatureToPlan,
  setSubscriptionStatus,
  blocksWrites,
  SUBSCRIPTION_STATUSES,
  type Organization,
  type OrganizationFeature,
  type OrganizationLimit,
  type OrganizationModule,
  type Plan,
  type SubscriptionStatus,
  outranksPlan,
  featuresLostByPlanChange,
  planPriceLabel,
} from "../lib/platform";

export function OrganizationDetail() {
  const { orgId = "" } = useParams();
  const [org, setOrg] = useState<Organization | null>(null);
  const [modules, setModules] = useState<OrganizationModule[]>([]);
  const [limits, setLimits] = useState<OrganizationLimit[]>([]);
  const [features, setFeatures] = useState<OrganizationFeature[]>([]);
  const [busyFeature, setBusyFeature] = useState<string | null>(null);
  const [busyLimit, setBusyLimit] = useState<string | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [busyPlan, setBusyPlan] = useState(false);
  const [busyStatus, setBusyStatus] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyModule, setBusyModule] = useState<string | null>(null);
  const [reason, setReason] = useState("");

  const load = useCallback(async () => {
    const [orgs, mods, planList, limitList, featureList] = await Promise.all([
      listOrganizations(),
      listOrganizationModules(orgId),
      listPlans(),
      listOrganizationLimits(orgId),
      listOrganizationFeatures(orgId),
    ]);
    setOrg(orgs.find((o) => o.organizationId === orgId) ?? null);
    setModules(mods);
    setPlans(planList);
    setLimits(limitList);
    setFeatures(featureList);
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

  async function handleSetPlan(planCode: string) {
    if (!planCode || planCode === org?.planCode) return;
    setBusyPlan(true);
    setError(null);
    try {
      await setPlan(orgId, planCode, reason);
      await load();
      setReason("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not change the plan.");
    } finally {
      setBusyPlan(false);
    }
  }

  async function handleSetStatus(status: SubscriptionStatus) {
    if (status === org?.subscriptionStatus) return;
    setBusyStatus(true);
    setError(null);
    try {
      await setSubscriptionStatus(orgId, status, reason);
      await load();
      setReason("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not change the billing state.");
    } finally {
      setBusyStatus(false);
    }
  }

  async function handleSetFeature(feature: OrganizationFeature, enabled: boolean) {
    setBusyFeature(feature.featureCode);
    setError(null);
    try {
      await setFeature(orgId, feature.featureCode, enabled, reason);
      await load();
      setReason("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not change this feature.");
    } finally {
      setBusyFeature(null);
    }
  }

  async function handleResetFeature(feature: OrganizationFeature) {
    setBusyFeature(feature.featureCode);
    setError(null);
    try {
      await resetFeatureToPlan(orgId, feature.featureCode, reason);
      await load();
      setReason("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not hand this feature back.");
    } finally {
      setBusyFeature(null);
    }
  }

  async function handleSetLimit(limit: OrganizationLimit, value: number | null) {
    setBusyLimit(limit.limitKey);
    setError(null);
    try {
      await setLimit(orgId, limit.moduleCode, limit.limitKey, value, reason);
      await load();
      setReason("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not change this limit.");
    } finally {
      setBusyLimit(null);
    }
  }

  async function handleReset(module: OrganizationModule) {
    setBusyModule(module.moduleCode);
    setError(null);
    try {
      await resetModuleToPlan(orgId, module.moduleCode, reason);
      await load();
      setReason("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not hand this module back to the plan.");
    } finally {
      setBusyModule(null);
    }
  }

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

      <div className="mt-4 max-w-2xl rounded-2xl border border-slate-200 bg-white p-4">
        <p className="text-sm font-medium text-slate-800">Plan</p>
        <p className="mt-0.5 text-xs text-slate-500">
          Changing the plan re-derives this tenant&apos;s modules <em>and features</em>. Prefer it
          over toggling them one by one — a manual toggle opts that module or feature out of plan
          control until it is handed back.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {plans.map((p) => {
            const current = p.planCode === org?.planCode;
            // What this button would actually take away. Only SUBSCRIPTION
            // grants are at risk -- comped and grandfathered ones outrank the
            // plan and survive, so counting them here would frighten an
            // operator out of a safe action.
            const lost = current ? [] : featuresLostByPlanChange(features, p);
            return (
              <button
                key={p.planCode}
                type="button"
                onClick={() => handleSetPlan(p.planCode)}
                disabled={busyPlan || current || !p.isActive}
                title={
                  `Price: ${planPriceLabel(p)}\n` +
                  `Modules: ${p.modules.filter((m) => m !== "CORE").join(", ") || "none"}\n` +
                  `Features: ${p.features.length}` +
                  (lost.length > 0
                    ? `\n\nSwitches off: ${lost.map((f) => f.name).join(", ")}`
                    : "")
                }
                className={`cursor-pointer rounded-xl px-3 py-1.5 text-sm font-medium disabled:cursor-not-allowed ${
                  current
                    ? "bg-[var(--color-brand)] text-white disabled:opacity-100"
                    : "border border-slate-300 text-slate-600 hover:bg-slate-50 disabled:opacity-60"
                }`}
              >
                {p.name}
                {current ? " ·  current" : ` · ${planPriceLabel(p)}`}
                {lost.length > 0 && (
                  <span className="ml-1 text-amber-600" title="">
                    −{lost.length}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        {plans.some((p) => p.planCode !== org?.planCode &&
                           featuresLostByPlanChange(features, p).length > 0) && (
          <p className="mt-2 text-xs text-amber-700">
            A number in amber is how many capabilities that plan would switch off for this tenant.
            Comped and grandfathered features are not counted — those outrank the plan and survive
            the change.
          </p>
        )}
      </div>

      <div className="mt-4 max-w-2xl rounded-2xl border border-slate-200 bg-white p-4">
        <p className="text-sm font-medium text-slate-800">Billing state</p>
        <p className="mt-0.5 text-xs text-slate-500">
          Suspending or cancelling stops this tenant creating new records. It never hides,
          blocks or deletes what they already have — they can still read and export
          everything. Both require a reason.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {SUBSCRIPTION_STATUSES.map((s) => {
            const current = s === org?.subscriptionStatus;
            const destructive = blocksWrites(s);
            return (
              <button
                key={s}
                type="button"
                onClick={() => handleSetStatus(s)}
                disabled={busyStatus || current}
                className={`cursor-pointer rounded-xl px-3 py-1.5 text-sm font-medium disabled:cursor-not-allowed ${
                  current
                    ? destructive
                      ? "bg-red-600 text-white disabled:opacity-100"
                      : "bg-[var(--color-brand)] text-white disabled:opacity-100"
                    : destructive
                      ? "border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-60"
                      : "border border-slate-300 text-slate-600 hover:bg-slate-50 disabled:opacity-60"
                }`}
              >
                {s.replace("_", " ")}
                {current && " ·  current"}
              </button>
            );
          })}
        </div>
        {org && blocksWrites(org.subscriptionStatus) && (
          <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
            This tenant cannot create new records. Their data is untouched and still readable
            by them. Changing their plan will not lift this — reinstate them here.
          </p>
        )}
        {org?.subscriptionStatus === "PAST_DUE" && (
          <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
            In grace: still fully usable, and warned in their own app. Nothing escalates this
            automatically — suspending is a decision someone has to make here.
          </p>
        )}
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
                <div className="flex shrink-0 items-center gap-2">
                {m.source === "MANUAL" && (
                  <button
                    type="button"
                    onClick={() => handleReset(m)}
                    disabled={busyModule === m.moduleCode}
                    title="Drop the manual override so this tenant's plan governs the module again"
                    className="cursor-pointer rounded-xl px-2.5 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Follow plan
                  </button>
                )}
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
                </div>
              )}
            </div>
          );
        })}
      </div>

      {limits.length > 0 && (
        <div className="mt-4 max-w-2xl rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-sm font-medium text-slate-800">Limits</p>
          <p className="mt-0.5 text-xs text-slate-500">
            Usage is counted the same way the database counts it when refusing a new record, so
            these numbers are what the tenant is actually hitting. Retired devices and closed
            branches don&apos;t count.
          </p>

          <div className="mt-3 space-y-2">
            {limits.map((l) => (
              <div
                key={`${l.moduleCode}.${l.limitKey}`}
                className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-xl border border-slate-100 px-3 py-2"
              >
                <div className="min-w-[9rem] flex-1">
                  <p className="text-sm text-slate-800">
                    {l.limitKey}{" "}
                    <span
                      className={`font-medium ${l.atOrOver ? "text-red-600" : "text-slate-500"}`}
                    >
                      {l.currentUsage ?? "—"} / {l.cap ?? "∞"}
                    </span>
                  </p>
                  <p className="text-xs text-slate-400">
                    {l.moduleCode}
                    {l.atOrOver && " · at the ceiling"}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleSetLimit(l, (l.cap ?? 0) + 1)}
                    disabled={busyLimit === l.limitKey || l.cap === null}
                    title="Raise this ceiling by one"
                    className="cursor-pointer rounded-lg border border-slate-300 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    +1
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSetLimit(l, Math.max(0, (l.cap ?? 0) - 1))}
                    disabled={busyLimit === l.limitKey || l.cap === null || l.cap === 0}
                    title="Lower this ceiling by one. Existing records are never removed."
                    className="cursor-pointer rounded-lg border border-slate-300 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    −1
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSetLimit(l, null)}
                    disabled={busyLimit === l.limitKey || l.cap === null}
                    title="Remove the ceiling entirely — unlimited, which is not the same as zero"
                    className="cursor-pointer rounded-lg px-2 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Uncap
                  </button>
                </div>
              </div>
            ))}
          </div>

          <p className="mt-3 text-xs text-slate-400">
            Lowering a ceiling below current usage never deletes anything — the tenant keeps what
            they have and simply cannot add more. Changing a plan re-derives these.
          </p>
        </div>
      )}

      {features.length > 0 && (
        <div className="mt-4 max-w-2xl rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-sm font-medium text-slate-800">Features</p>
          <p className="mt-0.5 text-xs text-slate-500">
            What this tenant gets <em>within</em> the modules they hold. A sari-sari store and a
            convenience store can both be on POS and still have different products. Nothing
            enforces these yet — they are recorded and ready for when it does.
          </p>

          {Array.from(new Set(features.map((f) => f.moduleCode))).map((moduleCode) => (
            <div key={moduleCode} className="mt-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                {moduleCode}
              </p>
              <div className="mt-1 space-y-1.5">
                {features
                  .filter((f) => f.moduleCode === moduleCode)
                  .map((f) => {
                    // A feature is dark whenever its module is off, however its
                    // own row reads. Saying so beats showing "Enabled" on
                    // something the tenant cannot reach.
                    const dark = !f.moduleHeld;
                    return (
                      <div
                        key={f.featureCode}
                        className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-xl border border-slate-100 px-3 py-2"
                      >
                        <div className="min-w-[11rem] flex-1">
                          <p className="text-sm text-slate-800">{f.name}</p>
                          <p className="text-xs text-slate-400">
                            {f.featureCode}
                            {f.source === "MANUAL" && " · comped"}
                            {f.source === "GRANDFATHERED" && " · grandfathered"}
                            {dark && " · off because " + moduleCode + " is disabled"}
                          </p>
                        </div>

                        <div className="flex shrink-0 items-center gap-1">
                          {outranksPlan(f.source) && (
                            <button
                              type="button"
                              onClick={() => handleResetFeature(f)}
                              disabled={busyFeature === f.featureCode}
                              title={
                                f.source === "GRANDFATHERED"
                                  ? "Held from before the plans were tiered. Hand it back to the plan."
                                  : "Hand this feature back to the plan"
                              }
                              className="cursor-pointer rounded-lg px-2 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              Follow plan
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleSetFeature(f, !f.enabled)}
                            disabled={busyFeature === f.featureCode}
                            className={`cursor-pointer rounded-lg px-3 py-1 text-xs font-medium disabled:cursor-not-allowed disabled:opacity-40 ${
                              f.enabled && !dark
                                ? "bg-[var(--color-brand-soft,#fdecea)] text-[var(--color-brand)]"
                                : "border border-slate-300 text-slate-500"
                            }`}
                          >
                            {f.enabled ? (dark ? "On, but dark" : "Enabled") : "Disabled"}
                          </button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          ))}

          <p className="mt-3 text-xs text-slate-400">
            Turning one off records a manual decision that survives the tenant&apos;s next plan
            change — use <span className="font-medium">Follow plan</span> to hand it back.
          </p>
          <p className="mt-1 text-xs text-slate-400">
            <span className="font-medium">Grandfathered</span> means the tenant held it before the
            plans were tiered and kept it, rather than anyone choosing it for them. It outranks the
            plan the same way a comp does, and <span className="font-medium">Follow plan</span>
            &nbsp;hands it back the same way.
          </p>
        </div>
      )}

      <p className="mt-3 max-w-2xl text-xs text-slate-400">
        Changes take effect immediately and are recorded as a manual grant, so they survive the
        tenant&apos;s next plan change. Disabling a module blocks new records but never hides or
        deletes existing data.
      </p>
    </div>
  );
}
