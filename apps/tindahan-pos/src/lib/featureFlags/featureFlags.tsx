import { useCallback, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/lib/supabaseClient";
import { FeatureFlagsContext, resolveFlag, useFeatureFlag } from "./featureFlagsContext";

/**
 * Feature flags — a kill switch for shipped features. Flip a row's
 * `enabled` to false (via the Supabase dashboard or a SQL update; there's
 * no in-app admin UI by design, see migration 0007) to turn a feature off
 * for every store instantly, without a deploy.
 *
 * Usage:
 *   const packPricingEnabled = useFeatureFlag("pack_pricing");
 *   if (!packPricingEnabled) { ... fall back to regular pricing ... }
 *
 * or, to hide a whole chunk of UI:
 *   <FeatureFlag flag="pack_pricing"><PackPricingFields /></FeatureFlag>
 *
 * A flag key with no row in the database is treated as enabled (fail-open)
 * — you only need to add a row when you actually want to turn something
 * off, not pre-register every feature ahead of time.
 */
export function FeatureFlagsProvider({ children }: { children: ReactNode }) {
  const [flags, setFlags] = useState<Map<string, boolean>>(new Map());
  const [loading, setLoading] = useState(true);

  const isEnabled = useCallback((key: string) => resolveFlag(flags, key), [flags]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const { data, error } = await supabase.from("feature_flags").select("key, enabled");
      if (cancelled) return;
      if (error) {
        // Fail-open: if flags can't be loaded (offline, RLS misconfigured,
        // whatever), every feature stays on rather than the app looking
        // broken because of the flag system itself.
        console.error("Failed to load feature flags, defaulting everything to enabled:", error);
      }
      setFlags(new Map((data ?? []).map((f) => [f.key, f.enabled])));
      setLoading(false);
    }
    load();

    // A kill switch needs to take effect immediately for anyone already
    // using the app — not just on their next page load — so subscribe to
    // changes instead of only fetching once.
    const channel = supabase
      .channel("feature_flags_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "feature_flags" },
        (payload) => {
          setFlags((prev) => {
            const next = new Map(prev);
            if (payload.eventType === "DELETE") {
              const old = payload.old as { key?: string };
              if (old.key) next.delete(old.key);
            } else {
              const row = payload.new as { key: string; enabled: boolean };
              next.set(row.key, row.enabled);
            }
            return next;
          });
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <FeatureFlagsContext.Provider value={{ isEnabled, loading }}>
      {children}
    </FeatureFlagsContext.Provider>
  );
}

/** Renders its children only while the given feature flag is enabled. */
export function FeatureFlag({ flag, children }: { flag: string; children: ReactNode }) {
  return useFeatureFlag(flag) ? <>{children}</> : null;
}
