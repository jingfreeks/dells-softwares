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

export interface Plan {
  planCode: string;
  name: string;
  description: string | null;
  pricePhp: number | null;
  billingInterval: string | null;
  isActive: boolean;
  modules: string[];
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
  }));
}

export async function setPlan(orgId: string, planCode: string, reason: string): Promise<void> {
  const { error } = await supabase.rpc("platform_set_plan", {
    p_org: orgId,
    p_plan_code: planCode,
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

/** The two states that take a tenant's ability to work away. */
export function blocksWrites(status: string): boolean {
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
