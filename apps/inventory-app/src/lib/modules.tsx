import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "./supabaseClient";
import { useAuth } from "./auth";

/** Tooltip for a write control disabled because the module is off. */
export const MODULE_READ_ONLY_HINT =
  "Inventory isn’t enabled for your store. Existing records stay viewable, but can’t be changed.";

export interface StoreModule {
  moduleCode: string;
  name: string;
  enabled: boolean;
}

interface ModulesContextValue {
  modules: StoreModule[];
  /** True until the first fetch resolves for the current staff member. */
  loading: boolean;
}

const ModulesContext = createContext<ModulesContextValue | null>(null);
const EMPTY: StoreModule[] = [];

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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    if (!userId) {
      setModules(EMPTY);
      setLoading(false);
      return;
    }

    setLoading(true);
    supabase.rpc("my_store_modules").then(({ data, error }) => {
      if (cancelled) return;
      setModules(
        error || !data
          ? EMPTY
          : data.map((row) => ({
              moduleCode: row.module_code,
              name: row.name,
              enabled: row.enabled,
            }))
      );
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [userId]);

  return <ModulesContext.Provider value={{ modules, loading }}>{children}</ModulesContext.Provider>;
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
