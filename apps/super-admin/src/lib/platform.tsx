import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./supabaseClient";

export interface PlatformAdmin {
  scope: "SUPPORT" | "BILLING" | "ENGINEER" | "SUPERUSER";
  status: string;
  mfaFresh: boolean;
  mfaExpiresAt: string | null;
}

export interface Organization {
  organizationId: string;
  name: string;
  status: string;
  createdAt: string;
  planCode: string | null;
  subscriptionStatus: string | null;
  branchCount: number;
  staffCount: number;
  enabledModules: string[];
}

export interface OrganizationModule {
  moduleCode: string;
  name: string;
  isSellable: boolean;
  enabled: boolean;
  source: string | null;
  validUntil: string | null;
}

/** Usage against ceiling for one limit key. `cap` null means unlimited. */
export interface OrganizationLimit {
  moduleCode: string;
  limitKey: string;
  cap: number | null;
  currentUsage: number | null;
  atOrOver: boolean;
}

/** A capability a tenant can hold, within a module they must also hold. */
export interface OrganizationFeature {
  featureCode: string;
  moduleCode: string;
  name: string;
  enabled: boolean;
  source: string | null;
  /** False when the owning module is off — the feature is dark regardless. */
  moduleHeld: boolean;
}

export interface Plan {
  planCode: string;
  name: string;
  description: string | null;
  pricePhp: number | null;
  billingInterval: string | null;
  isActive: boolean;
  modules: string[];
  /** Feature codes this plan grants. Empty until 20260815115000 is applied. */
  features: string[];
}

export interface PlatformAuditEntry {
  id: number;
  actorEmail: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  reason: string | null;
  createdAt: string;
}

interface PlatformContextValue {
  session: Session | null;
  /** null once resolved means "signed in, but not a platform administrator". */
  admin: PlatformAdmin | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  signOut: () => Promise<void>;
  /** Stamps mfa_verified_at. Fails unless the session actually carries aal2. */
  verifyMfa: () => Promise<{ ok: boolean; error?: string }>;
  refresh: () => Promise<void>;
}

const PlatformContext = createContext<PlatformContextValue | null>(null);

export function PlatformProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [admin, setAdmin] = useState<PlatformAdmin | null>(null);
  const [loading, setLoading] = useState(true);

  const loadAdmin = useCallback(async () => {
    const { data, error } = await supabase.rpc("platform_me");
    // Zero rows is the documented answer for "not an administrator" -- it is
    // not an error state, and must not be shown as one.
    const row = !error && Array.isArray(data) && data.length > 0 ? data[0] : null;
    setAdmin(
      row
        ? {
            scope: row.scope,
            status: row.status,
            mfaFresh: row.mfa_fresh,
            mfaExpiresAt: row.mfa_expires_at,
          }
        : null
    );
  }, []);

  useEffect(() => {
    let cancelled = false;

    supabase.auth.getSession().then(async ({ data }) => {
      if (cancelled) return;
      setSession(data.session);
      if (data.session) await loadAdmin();
      if (!cancelled) setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      if (!next) setAdmin(null);
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [loadAdmin]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return { ok: false, error: error.message };
      await loadAdmin();
      return { ok: true };
    },
    [loadAdmin]
  );

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setAdmin(null);
  }, []);

  const verifyMfa = useCallback(async () => {
    const { error } = await supabase.rpc("platform_verify_mfa");
    if (error) return { ok: false, error: error.message };
    await loadAdmin();
    return { ok: true };
  }, [loadAdmin]);

  return (
    <PlatformContext.Provider
      value={{ session, admin, loading, signIn, signOut, verifyMfa, refresh: loadAdmin }}
    >
      {children}
    </PlatformContext.Provider>
  );
}

export function usePlatform() {
  const ctx = useContext(PlatformContext);
  if (!ctx) throw new Error("usePlatform must be used within PlatformProvider");
  return ctx;
}

// --- data access -------------------------------------------------------------
// Every call below goes through a platform_* RPC. There is deliberately no
// direct table access anywhere in this app: the `core` schema is not exposed
// to PostgREST, and each RPC re-checks core.is_platform_admin() server-side.

export async function listOrganizations(): Promise<Organization[]> {
  const { data, error } = await supabase.rpc("platform_organizations");
  if (error) throw new Error(error.message);
  return (data ?? []).map((r: Record<string, never>) => ({
    organizationId: r.organization_id,
    name: r.name,
    status: r.status,
    createdAt: r.created_at,
    planCode: r.plan_code,
    subscriptionStatus: r.subscription_status,
    branchCount: r.branch_count,
    staffCount: r.staff_count,
    enabledModules: r.enabled_modules ?? [],
  }));
}

export async function listOrganizationModules(orgId: string): Promise<OrganizationModule[]> {
  const { data, error } = await supabase.rpc("platform_organization_modules", { p_org: orgId });
  if (error) throw new Error(error.message);
  return (data ?? []).map((r: Record<string, never>) => ({
    moduleCode: r.module_code,
    name: r.name,
    isSellable: r.is_sellable,
    enabled: r.enabled,
    source: r.source,
    validUntil: r.valid_until,
  }));
}

export async function setModule(
  orgId: string,
  moduleCode: string,
  enabled: boolean,
  reason: string
): Promise<void> {
  const { error } = await supabase.rpc("platform_set_module", {
    p_org: orgId,
    p_module: moduleCode,
    p_enabled: enabled,
    p_reason: reason || null,
  });
  if (error) throw new Error(error.message);
}

export async function listPlans(): Promise<Plan[]> {
  const { data, error } = await supabase.rpc("platform_plans");
  if (error) throw new Error(error.message);
  return (data ?? []).map((r: Record<string, never>) => ({
    planCode: r.plan_code,
    name: r.name,
    description: r.description,
    pricePhp: r.price_php,
    billingInterval: r.billing_interval,
    isActive: r.is_active,
    modules: r.modules ?? [],
    features: r.features ?? [],
  }));
}

/**
 * What moving this tenant onto `plan` would actually switch off.
 *
 * Only SUBSCRIPTION-sourced grants are at risk: MANUAL and GRANDFATHERED
 * outrank the plan and survive the change untouched (see
 * materialize_subscription_features). Showing those as "will be lost" would be
 * a lie that makes operators afraid of a safe action -- and the tenants most
 * likely to be moved are precisely the grandfathered ones, for whom the honest
 * answer is usually "nothing".
 *
 * Features whose module the target plan does not grant are included: holding a
 * feature without its module is not holding it.
 */
export function featuresLostByPlanChange(
  current: OrganizationFeature[],
  plan: Plan
): OrganizationFeature[] {
  return current.filter(
    (f) =>
      f.enabled &&
      f.source === "SUBSCRIPTION" &&
      (!plan.features.includes(f.featureCode) || !plan.modules.includes(f.moduleCode))
  );
}

export async function setPlan(orgId: string, planCode: string, reason: string): Promise<void> {
  const { error } = await supabase.rpc("platform_set_plan", {
    p_org: orgId,
    p_plan_code: planCode,
    p_reason: reason || null,
  });
  if (error) throw new Error(error.message);
}

export async function listOrganizationLimits(orgId: string): Promise<OrganizationLimit[]> {
  const { data, error } = await supabase.rpc("platform_organization_limits", { p_org: orgId });
  if (error) throw new Error(error.message);
  return (data ?? []).map((r: Record<string, never>) => ({
    moduleCode: r.module_code,
    limitKey: r.limit_key,
    cap: r.cap,
    currentUsage: r.current_usage,
    atOrOver: r.at_or_over,
  }));
}

/**
 * Raise, lower or remove a ceiling.
 *
 * `value === null` removes the key, which means UNLIMITED — distinct from 0,
 * which really does mean nobody may add another. The server keeps those two
 * apart deliberately, so the caller has to as well.
 */
export async function setLimit(
  orgId: string,
  moduleCode: string,
  limitKey: string,
  value: number | null,
  reason: string
): Promise<void> {
  const { error } = await supabase.rpc("platform_set_limit", {
    p_org: orgId,
    p_module: moduleCode,
    p_key: limitKey,
    p_value: value,
    p_reason: reason || null,
  });
  if (error) throw new Error(error.message);
}

export async function listOrganizationFeatures(orgId: string): Promise<OrganizationFeature[]> {
  const { data, error } = await supabase.rpc("platform_organization_features", { p_org: orgId });
  if (error) throw new Error(error.message);
  return (data ?? []).map((r: Record<string, never>) => ({
    featureCode: r.feature_code,
    moduleCode: r.module_code,
    name: r.name,
    enabled: r.enabled,
    source: r.source,
    moduleHeld: r.module_held,
  }));
}

/**
 * Grant or revoke one capability.
 *
 * Writes source = MANUAL, so the decision survives the tenant's next plan
 * change — and therefore needs resetFeatureToPlan() to be undoable. Both
 * halves shipped together deliberately; the module layer learned that the
 * hard way.
 */
export async function setFeature(
  orgId: string,
  featureCode: string,
  enabled: boolean,
  reason: string
): Promise<void> {
  const { error } = await supabase.rpc("platform_set_feature", {
    p_org: orgId,
    p_feature: featureCode,
    p_enabled: enabled,
    p_reason: reason || null,
  });
  if (error) throw new Error(error.message);
}

/**
 * Sources that beat the tenant's plan and therefore need handing back
 * explicitly.
 *
 * MANUAL means a human looked at this tenant and decided. GRANDFATHERED means
 * they simply already had it when 20260815113000 narrowed the plans
 * underneath them -- nobody chose it, and the distinction is the difference
 * between "we comped this" and "we are carrying them on old terms", which the
 * business will want to ask about separately.
 */
const PESO = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  minimumFractionDigits: 0,
});

const BILLING_INTERVAL_LABELS: Record<string, string> = { MONTHLY: "month", ANNUAL: "year" };

/** How a plan's price reads to an operator -- "₱599/month" or "Custom" for null. */
export function planPriceLabel(plan: Plan): string {
  if (plan.pricePhp === null) return "Custom";
  const interval = BILLING_INTERVAL_LABELS[plan.billingInterval ?? ""] ?? "month";
  return `${PESO.format(plan.pricePhp)}/${interval}`;
}

export function outranksPlan(source: string | null): boolean {
  return source === "MANUAL" || source === "GRANDFATHERED";
}

export async function resetFeatureToPlan(
  orgId: string,
  featureCode: string,
  reason: string
): Promise<void> {
  const { error } = await supabase.rpc("platform_reset_feature_to_plan", {
    p_org: orgId,
    p_feature: featureCode,
    p_reason: reason || null,
  });
  if (error) throw new Error(error.message);
}

/** The §08 ladder. SUSPENDED and CANCELLED withdraw writes; reads never stop. */
export const SUBSCRIPTION_STATUSES = [
  "TRIALING",
  "ACTIVE",
  "PAST_DUE",
  "SUSPENDED",
  "CANCELLED",
] as const;
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];

/**
 * The two states that take a tenant's ability to work away.
 *
 * Accepts null because subscriptionStatus is nullable: an organization can
 * legitimately have no live subscription row. That case must answer FALSE,
 * matching core.org_writes_allowed(), which fails OPEN for a tenant that was
 * never provisioned — a provisioning gap must not read as a suspension.
 */
export function blocksWrites(status: string | null): boolean {
  return status === "SUSPENDED" || status === "CANCELLED";
}

export async function setSubscriptionStatus(
  orgId: string,
  status: SubscriptionStatus,
  reason: string
): Promise<void> {
  const { error } = await supabase.rpc("platform_set_subscription_status", {
    p_org: orgId,
    p_status: status,
    p_reason: reason || null,
  });
  if (error) throw new Error(error.message);
}

/** Drops a MANUAL override so the tenant's plan governs the module again. */
export async function resetModuleToPlan(
  orgId: string,
  moduleCode: string,
  reason: string
): Promise<void> {
  const { error } = await supabase.rpc("platform_reset_module_to_plan", {
    p_org: orgId,
    p_module: moduleCode,
    p_reason: reason || null,
  });
  if (error) throw new Error(error.message);
}

export async function listPlatformAudit(limit = 100): Promise<PlatformAuditEntry[]> {
  const { data, error } = await supabase.rpc("platform_audit", { p_limit: limit });
  if (error) throw new Error(error.message);
  return (data ?? []).map((r: Record<string, never>) => ({
    id: r.id,
    actorEmail: r.actor_email,
    action: r.action,
    entityType: r.entity_type,
    entityId: r.entity_id,
    reason: r.reason,
    createdAt: r.created_at,
  }));
}
