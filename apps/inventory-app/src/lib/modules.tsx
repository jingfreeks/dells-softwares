import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "./supabaseClient";
import { useAuth } from "./auth";

/** Tooltip for a write control disabled because the module is off. */
export const MODULE_READ_ONLY_HINT =
  "Inventory isn’t enabled for your store. Existing records stay viewable, but can’t be changed.";

/**
 * Tooltip for a write control disabled because the tenant's PLAN does not
 * include this capability — a different thing from the module being off, and a
 * very different thing from lacking permission.
 *
 * Before the tier split every plan sold every feature, so this could not
 * happen. Now a store on BASIC genuinely does not have purchase orders, and
 * without this they would meet a bare policy denial reading "You do not have
 * permission to make this change" — which blames the person for something no
 * amount of permission-granting can fix.
 */
export const FEATURE_NOT_IN_PLAN_HINT =
  "This isn’t part of your plan. Existing records stay viewable, and nothing has been removed.";

export interface StoreModule {
  moduleCode: string;
  name: string;
  enabled: boolean;
}

/** One row of my_store_features() — the whole catalogue, held or not. */
export interface StoreFeature {
  featureCode: string;
  name: string;
  enabled: boolean;
}

/**
 * The §08 grace ladder, from public.my_store_billing_state().
 *
 * Entitlement ("may this store use Inventory at all") and billing state
 * ("is this store paid up") are separate questions with separate answers,
 * and a store can fail either one independently. They are fetched together
 * only because they share a lifecycle.
 */
export interface BillingState {
  subscriptionStatus: string;
  writesAllowed: boolean;
  /** Only set while PAST_DUE: when grace runs out. */
  graceEndsAt: string | null;
}

interface ModulesContextValue {
  modules: StoreModule[];
  features: StoreFeature[];
  billing: BillingState | null;
  /** True until the first fetch resolves for the current staff member. */
  loading: boolean;
}

const ModulesContext = createContext<ModulesContextValue | null>(null);
const EMPTY: StoreModule[] = [];
const NO_FEATURES: StoreFeature[] = [];

/**
 * Which applications this store is entitled to, from
 * public.my_store_modules() (see 20260815096000_public_module_contract.sql).
 *
 * The `core` schema is not exposed to PostgREST, so core.module_enabled()
 * is deliberately reached through that one narrow public wrapper rather
 * than queried directly.
 */
export function ModulesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id;
  const [modules, setModules] = useState<StoreModule[]>(EMPTY);
  const [features, setFeatures] = useState<StoreFeature[]>(NO_FEATURES);
  const [billing, setBilling] = useState<BillingState | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    if (!userId) {
      setModules(EMPTY);
      setFeatures(NO_FEATURES);
      setBilling(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    Promise.all([
      supabase.rpc("my_store_modules"),
      supabase.rpc("my_store_billing_state"),
      supabase.rpc("my_store_features"),
    ]).then(([mods, bill, feats]) => {
      if (cancelled) return;

      setModules(
        mods.error || !mods.data
          ? EMPTY
          : mods.data.map((row) => ({
              moduleCode: row.module_code,
              name: row.name,
              enabled: row.enabled,
            }))
      );

      setFeatures(
        feats.error || !feats.data
          ? NO_FEATURES
          : feats.data.map((row) => ({
              featureCode: row.feature_code,
              name: row.name,
              enabled: row.enabled,
            }))
      );

      // A failed or empty read leaves this null, which every consumer reads
      // as "nothing to warn about". Presentation must never be the thing
      // that stops someone working -- the database is the real boundary.
      const row = bill.error ? null : bill.data?.[0];
      setBilling(
        row
          ? {
              subscriptionStatus: row.subscription_status,
              writesAllowed: row.writes_allowed,
              graceEndsAt: row.grace_ends_at,
            }
          : null
      );

      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [userId]);

  return (
    <ModulesContext.Provider value={{ modules, features, billing, loading }}>
      {children}
    </ModulesContext.Provider>
  );
}

export function useModules() {
  const ctx = useContext(ModulesContext);
  if (!ctx) throw new Error("useModules must be used within ModulesProvider");
  return ctx;
}

/**
 * Is this module enabled for the signed-in staff member's store?
 *
 * Returns true while still loading, deliberately. This drives read-only
 * *presentation* only -- the database is the actual boundary -- and
 * flashing "read only" on every page load before the answer arrives would
 * be both wrong and alarming. A disabled module settles a moment later,
 * and any write attempted in between is refused server-side anyway.
 */
export function useHasModule(moduleCode: string): boolean {
  const { modules, loading } = useModules();
  if (loading) return true;
  const found = modules.find((m) => m.moduleCode === moduleCode);
  return found ? found.enabled : false;
}

/**
 * Does this store's plan include `featureCode`?
 *
 * Same deliberate optimism as useHasModule, for the same reason: this drives
 * read-only *presentation*, the database is the real boundary, and flashing
 * "not in your plan" on every page load before the answer arrives would be
 * both wrong and alarming.
 *
 * A feature the catalogue does not mention at all answers TRUE. That is not
 * an oversight — an unknown code means this client is older than the server's
 * catalogue, and refusing a capability because the UI has not heard of it yet
 * would break a store for shipping a deploy in the wrong order. The server
 * refuses anything genuinely withheld.
 */
export function useHasFeature(featureCode: string): boolean {
  const { features, loading } = useModules();
  if (loading) return true;
  const found = features.find((f) => f.featureCode === featureCode);
  return found ? found.enabled : true;
}

/**
 * The store's billing state, or null while loading or unknown.
 *
 * Same optimism as useHasModule: an unknown answer means "say nothing".
 * A banner wrongly claiming someone is suspended is worse than a missing
 * one, and the write would be refused server-side regardless.
 */
export function useBillingState(): BillingState | null {
  const { billing, loading } = useModules();
  return loading ? null : billing;
}
