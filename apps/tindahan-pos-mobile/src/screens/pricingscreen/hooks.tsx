import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useBillingState } from "../../lib/billing";
import { startTrialBestEffort } from "../../lib/startTrial";

const TRIALABLE_CODES = new Set(["BUSINESS", "PRO"]);
const MAX_VISIBLE_FEATURES = 6;

export interface PricingPlan {
  planCode: string;
  name: string;
  priceLabel: string;
  featureNames: string[];
  moreCount: number;
}

/** "₱999/month" or "Let's Talk". Shared phrasing so this screen and Settings never disagree. */
function priceLabel(pricePhp: number | null, billingInterval: string): string {
  if (pricePhp === null) return "Let's Talk";
  const formatted = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", minimumFractionDigits: 0 }).format(
    pricePhp
  );
  return `${formatted}/${billingInterval.toLowerCase()}`;
}

/**
 * Direct port of the web app's usePricingPage() (apps/tindahan-pos/src/pages/Pricing/hooks.tsx).
 * Renders every real plan from plan_prices(), never the mockup's static
 * three-tier copy -- feature bullets come from my_store_features()'s
 * catalogue, the same reconciliation-against-real-capabilities decision
 * already made on web.
 */
export function usePricingScreen() {
  const billing = useBillingState();
  const [plans, setPlans] = useState<PricingPlan[]>([]);
  const [currentPlanCode, setCurrentPlanCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [startedCode, setStartedCode] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      supabase.rpc("plan_prices"),
      supabase.rpc("my_store_plan"),
      supabase.rpc("my_store_features"),
    ]).then(([pricesRes, planRes, featuresRes]) => {
      if (cancelled) return;
      const featureNameByCode = new Map<string, string>();
      for (const row of featuresRes.data ?? []) {
        featureNameByCode.set(row.feature_code, row.name);
      }
      const rows = pricesRes.error || !pricesRes.data ? [] : pricesRes.data;
      setPlans(
        rows
          .slice()
          .sort((a, b) => a.sort_order - b.sort_order)
          .map((row) => {
            const names = row.features
              .map((code) => featureNameByCode.get(code))
              .filter((name): name is string => !!name)
              .sort((a, b) => a.localeCompare(b));
            return {
              planCode: row.plan_code,
              name: row.name,
              priceLabel: priceLabel(row.price_php, row.billing_interval),
              featureNames: names.slice(0, MAX_VISIBLE_FEATURES),
              moreCount: Math.max(0, names.length - MAX_VISIBLE_FEATURES),
            };
          })
      );
      const planRow = planRes.error || !planRes.data ? null : planRes.data[0];
      setCurrentPlanCode(planRow?.plan_code ?? null);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const hasUsedTrial = useMemo(
    () => billing?.trialEndsAt != null || billing?.subscriptionStatus === "TRIALING",
    [billing]
  );

  function choosePlan(planCode: string) {
    if (TRIALABLE_CODES.has(planCode) && !hasUsedTrial) {
      startTrialBestEffort(planCode as "BUSINESS" | "PRO");
      setStartedCode(planCode);
    }
    // A plan that's already been trialed, or isn't self-serve trialable
    // (BASIC/ENTERPRISE), has no self-serve checkout in this app -- there's
    // nothing else to do here, matching web's Pricing.tsx.
  }

  return {
    loading,
    plans,
    currentPlanCode,
    hasUsedTrial,
    startedCode,
    choosePlan,
    isTrialable: (planCode: string) => TRIALABLE_CODES.has(planCode),
  };
}
