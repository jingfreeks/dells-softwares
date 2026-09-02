import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  listOrganizationFeatures,
  listOrganizationStaff,
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
  type OrganizationStaff,
  type OrganizationLimit,
  type OrganizationModule,
  type Plan,
  type SubscriptionStatus,
  outranksPlan,
  featuresLostByPlanChange,
  planPriceLabel,
} from "../lib/platform";
import { StatusChip } from "../components/StatusChip";

export function OrganizationDetail() {
  const { orgId = "" } = useParams();
  const [org, setOrg] = useState<Organization | null>(null);
  const [modules, setModules] = useState<OrganizationModule[]>([]);
  const [limits, setLimits] = useState<OrganizationLimit[]>([]);
  const [features, setFeatures] = useState<OrganizationFeature[]>([]);
  const [staff, setStaff] = useState<OrganizationStaff[]>([]);
  const [busyFeature, setBusyFeature] = useState<string | null>(null);
  const [busyLimit, setBusyLimit] = useState<string | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [busyPlan, setBusyPlan] = useState(false);
  const [busyStatus, setBusyStatus] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyModule, setBusyModule] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [grantAsAddon, setGrantAsAddon] = useState(false);
  const [tab, setTab] = useState<TabKey>("overview");

  const load = useCallback(async () => {
    const [orgs, mods, planList, limitList, featureList, staffList] = await Promise.all([
      listOrganizations(),
      listOrganizationModules(orgId),
      listPlans(),
      listOrganizationLimits(orgId),
      listOrganizationFeatures(orgId),
      listOrganizationStaff(orgId),
    ]);
    setOrg(orgs.find((o) => o.organizationId === orgId) ?? null);
    setModules(mods);
    setPlans(planList);
    setLimits(limitList);
    setFeatures(featureList);
    setStaff(staffList);
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
      await setModule(orgId, module.moduleCode, !module.enabled, reason, grantAsAddon ? "ADDON" : "MANUAL");
      await load();
      setReason("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not change this module.");
    } finally {
      setBusyModule(null);
    }
  }


  if (loading) {
    return (
      <p className="px-7 py-10 text-[13px]" style={{ color: "var(--t6)" }}>Loading…</p>
    );
  }

  return (
    <div className="px-7 py-6">
      <Link to="/organizations" className="text-[12.5px] hover:underline" style={{ color: "var(--a4)" }}>
        ← Organizations
      </Link>

      <header className="mt-2 mb-5 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-[19px] font-semibold" style={{ color: "var(--t1)" }}>
            {org?.name ?? "Organization"}
          </h1>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[12.5px]" style={{ color: "var(--t6)" }}>
            <span className="techno" style={{ color: "var(--t9)" }}>{orgId}</span>
            <span>·</span>
            <span>{org?.branchCount ?? 0} branch(es)</span>
            <span>·</span>
            <span>{org?.staffCount ?? 0} staff</span>
          </p>
        </div>
        {org && <StatusChip status={org.subscriptionStatus} orgStatus={org.status} />}
      </header>

      {error && (
        <div
          role="alert"
          className="mb-4 max-w-3xl rounded-xl border p-3.5"
          style={{ background: "rgba(248,113,113,.07)", borderColor: "rgba(248,113,113,.24)" }}
        >
          <p className="text-[13px]" style={{ color: "var(--bad)" }}>{error}</p>
        </div>
      )}

      {/* The reason travels with every action on this page, so it sits above
          the tabs rather than inside one of them. */}
      <div className="card mb-4 max-w-3xl p-4">
        <label htmlFor="reason" className="mb-1 block text-[11px] font-medium" style={{ color: "var(--t6)" }}>
          Reason (recorded in the platform audit)
        </label>
        <input
          id="reason"
          type="text"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="e.g. pilot customer, paid upgrade, ticket #42"
          className="w-full rounded-xl border px-3 py-2 text-[13px] outline-none focus:border-[var(--a3)]"
          style={{ background: "var(--gl3)", borderColor: "var(--bd)", color: "var(--t1)" }}
        />
        <label className="mt-2.5 flex items-start gap-2 text-[11.5px]" style={{ color: "var(--t6)" }}>
          <input
            type="checkbox"
            checked={grantAsAddon}
            onChange={(e) => setGrantAsAddon(e.target.checked)}
            className="mt-0.5 rounded"
          />
          <span>
            Grant the next module toggle as a paid add-on, not a comp — tagged distinctly (ADDON,
            not MANUAL) so it reads as revenue, not a favor.
          </span>
        </label>
      </div>

      <div role="tablist" aria-label="Organization sections" className="mb-4 flex flex-wrap gap-1 border-b" style={{ borderColor: "var(--bd3)" }}>
        {TABS.map((t) => {
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              role="tab"
              type="button"
              id={`tab-${t.key}`}
              aria-selected={active}
              aria-controls={`panel-${t.key}`}
              onClick={() => setTab(t.key)}
              className="-mb-px cursor-pointer border-b-2 px-3 py-2 text-[12.5px] font-medium"
              style={{
                borderColor: active ? "var(--bad)" : "transparent",
                color: active ? "var(--t1)" : "var(--t6)",
              }}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === "overview" && (
        <div role="tabpanel" id="panel-overview" aria-labelledby="tab-overview" className="max-w-3xl">
          <div className="card p-4">
            <h2 className="mb-3 text-[13.5px] font-semibold" style={{ color: "var(--t2)" }}>Overview</h2>
            <dl className="grid gap-2.5 sm:grid-cols-2">
              <Fact label="Plan" value={org?.planCode ?? "No plan"} />
              <Fact label="Subscription" value={org?.subscriptionStatus ?? "—"} />
              <Fact label="Organization status" value={org?.status ?? "—"} />
              <Fact
                label="Created"
                value={org ? new Date(org.createdAt).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }) : "—"}
              />
              <Fact label="Branches" value={String(org?.branchCount ?? 0)} />
              <Fact label="Staff" value={String(org?.staffCount ?? 0)} />
            </dl>
          </div>

          {/* Two of the designed tabs have no backend behind them. An empty
              tab would read as "this tenant has no staff and no history",
              which is a claim, so they are absent and named instead. */}
          <div className="card mt-4 p-4">
            <h2 className="mb-1 text-[13.5px] font-semibold" style={{ color: "var(--t2)" }}>
              Not shown here
            </h2>
            <ul className="mt-2 grid gap-1.5">
              <li className="text-[12.5px]" style={{ color: "var(--t5)" }}>
                <span style={{ color: "var(--t3)" }}>This tenant&apos;s activity</span>
                <span style={{ color: "var(--t9)" }}>
                  {" "}
                  — platform_audit() takes a row limit and no organization filter, so it cannot be
                  narrowed to one tenant.
                </span>
              </li>
            </ul>
          </div>
        </div>
      )}

      {tab === "users" && (
        <div role="tabpanel" id="panel-users" aria-labelledby="tab-users" className="max-w-3xl">
          <div className="card p-4">
            <h2 className="text-[13.5px] font-semibold" style={{ color: "var(--t2)" }}>Staff</h2>
            <p className="mt-0.5 text-[12px]" style={{ color: "var(--t6)" }}>
              Two roles are shown because this app has two. The badge is the RBAC assignment,
              which decides permissions — a SUPERVISOR holds 15 and a CASHIER none. Both are
              <span className="techno"> cashier</span> to the coarse enum underneath, so the enum
              alone would not tell you what someone can do.
            </p>

            {staff.length === 0 ? (
              <p className="mt-4 text-[12.5px]" style={{ color: "var(--t6)" }}>
                No staff records for this organization.
              </p>
            ) : (
              <div className="mt-3.5 space-y-1.5">
                {staff.map((m) => (
                  <div
                    key={m.staffId}
                    className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5 rounded-xl border px-3 py-2"
                    style={{ borderColor: "var(--bd3)", opacity: m.active ? 1 : 0.6 }}
                  >
                    <div className="min-w-[11rem] flex-1">
                      <p className="text-[13px]" style={{ color: "var(--t3)" }}>
                        {m.name ?? "Unnamed"}
                        {!m.active && (
                          <span className="ml-2 text-[11px]" style={{ color: "var(--t9)" }}>deactivated</span>
                        )}
                      </p>
                      <p className="techno" style={{ color: "var(--t9)" }}>{m.email ?? "no email"}</p>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                      {m.pinLocked && (
                        <span
                          className="rounded-full border px-2 py-0.5 text-[11px] font-medium"
                          style={{ color: "var(--warn)", borderColor: "rgba(251,191,36,.28)" }}
                          title="PIN entry is locked out right now"
                        >
                          PIN locked
                        </span>
                      )}
                      <span
                        className="rounded-full px-2.5 py-0.5 text-[11px] font-medium"
                        style={{ background: "var(--gl3)", color: "var(--t5)" }}
                      >
                        {m.rbacRole ?? "no role"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* PIN failure counters are returned by nothing here on purpose:
                whether a cashier has been fumbling their PIN is the shop's
                business, not the platform's. Whether they are locked out
                right now is what support gets called about. */}
            <p className="mt-3 text-[11.5px]" style={{ color: "var(--t9)" }}>
              Deactivated staff are listed and dimmed rather than hidden — they still hold
              historical sales. Staff are managed by the tenant, not from this console.
            </p>
          </div>
        </div>
      )}

      {tab === "subscription" && (
        <div role="tabpanel" id="panel-subscription" aria-labelledby="tab-subscription" className="max-w-3xl">
          <div className="card p-4">
            <h2 className="text-[13.5px] font-semibold" style={{ color: "var(--t2)" }}>Plan</h2>
            <p className="mt-0.5 text-[12px]" style={{ color: "var(--t6)" }}>
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
                      (lost.length > 0 ? `\n\nSwitches off: ${lost.map((f) => f.name).join(", ")}` : "")
                    }
                    className="cursor-pointer rounded-xl border px-3 py-1.5 text-[12.5px] font-medium disabled:cursor-not-allowed"
                    style={
                      current
                        ? { background: "var(--color-brand)", borderColor: "var(--color-brand)", color: "#fff", opacity: 1 }
                        : { borderColor: "var(--bd)", color: "var(--t3)" }
                    }
                  >
                    {p.name}
                    {current ? " ·  current" : ` · ${planPriceLabel(p)}`}
                    {lost.length > 0 && (
                      <span className="ml-1" style={{ color: "var(--warn)" }} title="">
                        −{lost.length}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            {plans.some((p) => p.planCode !== org?.planCode && featuresLostByPlanChange(features, p).length > 0) && (
              <p className="mt-2.5 text-[11.5px]" style={{ color: "var(--warn)" }}>
                A number in amber is how many capabilities that plan would switch off for this tenant.
                Comped and grandfathered features are not counted — those outrank the plan and survive
                the change.
              </p>
            )}
          </div>

          <div className="card mt-4 p-4">
            <h2 className="text-[13.5px] font-semibold" style={{ color: "var(--t2)" }}>Billing state</h2>
            <p className="mt-0.5 text-[12px]" style={{ color: "var(--t6)" }}>
              Suspending or cancelling stops this tenant creating new records. It never hides, blocks
              or deletes what they already have — they can still read and export everything. Both
              require a reason.
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
                    className="cursor-pointer rounded-xl border px-3 py-1.5 text-[12.5px] font-medium disabled:cursor-not-allowed"
                    style={
                      current
                        ? destructive
                          ? { background: "#DC2626", borderColor: "#DC2626", color: "#fff", opacity: 1 }
                          : { background: "var(--color-brand)", borderColor: "var(--color-brand)", color: "#fff", opacity: 1 }
                        : destructive
                          ? { borderColor: "rgba(248,113,113,.35)", color: "var(--bad)" }
                          : { borderColor: "var(--bd)", color: "var(--t3)" }
                    }
                  >
                    {s.replace("_", " ")}
                    {current && " ·  current"}
                  </button>
                );
              })}
            </div>
            {org && blocksWrites(org.subscriptionStatus) && (
              <p
                className="mt-3 rounded-lg border px-3 py-2 text-[11.5px]"
                style={{ background: "rgba(248,113,113,.07)", borderColor: "rgba(248,113,113,.24)", color: "var(--bad)" }}
              >
                This tenant cannot create new records. Their data is untouched and still readable by
                them. Changing their plan will not lift this — reinstate them here.
              </p>
            )}
            {org?.subscriptionStatus === "PAST_DUE" && (
              <p
                className="mt-3 rounded-lg border px-3 py-2 text-[11.5px]"
                style={{ background: "rgba(251,191,36,.07)", borderColor: "rgba(251,191,36,.24)", color: "var(--warn)" }}
              >
                In grace: still fully usable, and warned in their own app. Nothing escalates this
                automatically — suspending is a decision someone has to make here.
              </p>
            )}
          </div>
        </div>
      )}

      {tab === "modules" && (
        <div role="tabpanel" id="panel-modules" aria-labelledby="tab-modules" className="max-w-3xl">
          <div className="card overflow-hidden">
            {modules.map((m) => {
              // CORE is always on and not sellable; the server refuses to disable
              // it, so offering a control here would be a lie.
              const locked = !m.isSellable;
              return (
                <div
                  key={m.moduleCode}
                  className="flex items-center justify-between gap-4 border-b px-4 py-3 last:border-0"
                  style={{ borderColor: "var(--bd3)" }}
                >
                  <div className="min-w-0">
                    <p className="text-[13.5px] font-medium" style={{ color: "var(--t2)" }}>{m.name}</p>
                    <p className="techno" style={{ color: "var(--t9)" }}>
                      {m.moduleCode}
                      {m.source ? ` · ${m.source}` : ""}
                      {m.validUntil ? ` · until ${new Date(m.validUntil).toLocaleDateString()}` : ""}
                    </p>
                  </div>

                  {locked ? (
                    <span
                      className="shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium"
                      style={{ background: "var(--gl3)", color: "var(--t6)" }}
                    >
                      Always on
                    </span>
                  ) : (
                    <div className="flex shrink-0 items-center gap-2">
                      {outranksPlan(m.source) && (
                        <button
                          type="button"
                          onClick={() => handleReset(m)}
                          disabled={busyModule === m.moduleCode}
                          title="Drop the manual/add-on override so this tenant's plan governs the module again"
                          className="cursor-pointer rounded-xl px-2.5 py-1.5 text-[11.5px] font-medium hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-60"
                          style={{ color: "var(--t6)" }}
                        >
                          Follow plan
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleToggle(m)}
                        disabled={busyModule === m.moduleCode}
                        aria-pressed={m.enabled}
                        className="shrink-0 cursor-pointer rounded-xl border px-3 py-1.5 text-[12.5px] font-medium disabled:cursor-not-allowed disabled:opacity-60"
                        style={
                          m.enabled
                            ? { background: "rgba(201,59,46,.16)", borderColor: "rgba(201,59,46,.35)", color: "#F2A79E" }
                            : { borderColor: "var(--bd)", color: "var(--t5)" }
                        }
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
            <div className="card mt-4 p-4">
              <h2 className="text-[13.5px] font-semibold" style={{ color: "var(--t2)" }}>Limits</h2>
              <p className="mt-0.5 text-[12px]" style={{ color: "var(--t6)" }}>
                Usage is counted the same way the database counts it when refusing a new record, so
                these numbers are what the tenant is actually hitting. Retired devices and closed
                branches don&apos;t count.
              </p>

              <div className="mt-3 space-y-2">
                {limits.map((l) => (
                  <div
                    key={`${l.moduleCode}.${l.limitKey}`}
                    className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-xl border px-3 py-2"
                    style={{ borderColor: "var(--bd3)" }}
                  >
                    <div className="min-w-[9rem] flex-1">
                      <p className="text-[13px]" style={{ color: "var(--t3)" }}>
                        {l.limitKey}{" "}
                        <span
                          className="font-medium tabular-nums"
                          style={{ color: l.atOrOver ? "var(--bad)" : "var(--t5)" }}
                        >
                          {l.currentUsage ?? "—"} / {l.cap ?? "∞"}
                        </span>
                      </p>
                      <p className="techno" style={{ color: "var(--t9)" }}>
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
                        className="cursor-pointer rounded-lg border px-2 py-1 text-[11.5px] font-medium hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40"
                        style={{ borderColor: "var(--bd)", color: "var(--t3)" }}
                      >
                        +1
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSetLimit(l, Math.max(0, (l.cap ?? 0) - 1))}
                        disabled={busyLimit === l.limitKey || l.cap === null || l.cap === 0}
                        title="Lower this ceiling by one. Existing records are never removed."
                        className="cursor-pointer rounded-lg border px-2 py-1 text-[11.5px] font-medium hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40"
                        style={{ borderColor: "var(--bd)", color: "var(--t3)" }}
                      >
                        −1
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSetLimit(l, null)}
                        disabled={busyLimit === l.limitKey || l.cap === null}
                        title="Remove the ceiling entirely — unlimited, which is not the same as zero"
                        className="cursor-pointer rounded-lg px-2 py-1 text-[11.5px] font-medium hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40"
                        style={{ color: "var(--t6)" }}
                      >
                        Uncap
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <p className="mt-3 text-[11.5px]" style={{ color: "var(--t9)" }}>
                Lowering a ceiling below current usage never deletes anything — the tenant keeps what
                they have and simply cannot add more. Changing a plan re-derives these.
              </p>
            </div>
          )}

          {features.length > 0 && (
            <div className="card mt-4 p-4">
              <h2 className="text-[13.5px] font-semibold" style={{ color: "var(--t2)" }}>Features</h2>
              <p className="mt-0.5 text-[12px]" style={{ color: "var(--t6)" }}>
                What this tenant gets <em>within</em> the modules they hold. A sari-sari store and a
                convenience store can both be on POS and still have different products. Nothing
                enforces these yet — they are recorded and ready for when it does.
              </p>

              {Array.from(new Set(features.map((f) => f.moduleCode))).map((moduleCode) => (
                <div key={moduleCode} className="mt-3.5">
                  <p className="text-[11px] font-semibold" style={{ color: "var(--t6)", letterSpacing: ".5px" }}>
                    {moduleCode}
                  </p>
                  <div className="mt-1.5 space-y-1.5">
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
                            className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-xl border px-3 py-2"
                            style={{ borderColor: "var(--bd3)" }}
                          >
                            <div className="min-w-[11rem] flex-1">
                              <p className="text-[13px]" style={{ color: "var(--t3)" }}>{f.name}</p>
                              <p className="techno" style={{ color: "var(--t9)" }}>
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
                                  className="cursor-pointer rounded-lg px-2 py-1 text-[11.5px] font-medium hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40"
                                  style={{ color: "var(--t6)" }}
                                >
                                  Follow plan
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => handleSetFeature(f, !f.enabled)}
                                disabled={busyFeature === f.featureCode}
                                className="cursor-pointer rounded-lg border px-3 py-1 text-[11.5px] font-medium disabled:cursor-not-allowed disabled:opacity-40"
                                style={
                                  f.enabled && !dark
                                    ? { background: "rgba(201,59,46,.16)", borderColor: "rgba(201,59,46,.35)", color: "#F2A79E" }
                                    : { borderColor: "var(--bd)", color: "var(--t6)" }
                                }
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

              <p className="mt-3 text-[11.5px]" style={{ color: "var(--t9)" }}>
                Turning one off records a manual decision that survives the tenant&apos;s next plan
                change — use <span className="font-medium">Follow plan</span> to hand it back.
              </p>
              <p className="mt-1 text-[11.5px]" style={{ color: "var(--t9)" }}>
                <span className="font-medium">Grandfathered</span> means the tenant held it before the
                plans were tiered and kept it, rather than anyone choosing it for them. It outranks the
                plan the same way a comp does, and <span className="font-medium">Follow plan</span>
                &nbsp;hands it back the same way.
              </p>
            </div>
          )}
        </div>
      )}

      <p className="mt-4 max-w-3xl text-[11.5px]" style={{ color: "var(--t9)" }}>
        Changes take effect immediately and are recorded as a manual grant, so they survive the
        tenant&apos;s next plan change. Disabling a module blocks new records but never hides or
        deletes existing data.
      </p>
    </div>
  );
}

type TabKey = "overview" | "users" | "subscription" | "modules";

/**
 * Users is backed by platform_organization_staff() (20260902150000).
 *
 * The design also specifies an Activity tab, which is still omitted: only
 * some platform actions carry the organization id in entity_id, so a tab
 * built on that filter would show a partial history while looking complete.
 * The Overview tab names that gap rather than rendering a misleading tab.
 */
const TABS: { key: TabKey; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "users", label: "Users" },
  { key: "subscription", label: "Subscription" },
  { key: "modules", label: "Modules" },
];

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="shrink-0 text-[12px]" style={{ color: "var(--t6)" }}>{label}</dt>
      <dd className="min-w-0 truncate text-right text-[12.5px]" style={{ color: "var(--t3)" }}>{value}</dd>
    </div>
  );
}
