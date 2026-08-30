import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useBillingState } from "@/lib/billing/billingContext";
import { useFeatures } from "@/lib/features/featuresContext";
import { startTrialBestEffort } from "@/lib/billing/startTrial";
import { type PlanPrice, priceLabel } from "@/lib/plan/plan";

const TRIALABLE_CODES = new Set(["BUSINESS", "PRO"]);

export function usePricingPage() {
  const billing = useBillingState();
  // my_store_features() is the single source of truth for what a feature
  // code is actually called -- reusing its catalogue here means every
  // bullet on this page is a real, currently-shipped capability's real
  // name, not marketing copy that can drift from what the app supports.
  const { catalogue, loading: catalogueLoading } = useFeatures();
  const featureNameByCode = useMemo(() => {
    const map = new Map<string, string>();
    for (const f of catalogue) map.set(f.code, f.name);
    return map;
  }, [catalogue]);
  const [plans, setPlans] = useState<PlanPrice[]>([]);
  const [currentPlanCode, setCurrentPlanCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [startedCode, setStartedCode] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([supabase.rpc("plan_prices"), supabase.rpc("my_store_plan")]).then(
      ([pricesRes, planRes]) => {
        if (cancelled) return;
        const rows = pricesRes.error || !pricesRes.data ? [] : pricesRes.data;
        setPlans(
          rows
            .slice()
            .sort((a: { sort_order: number }, b: { sort_order: number }) => a.sort_order - b.sort_order)
            .map((row: { plan_code: string; name: string; price_php: number | null; billing_interval: string; features: string[]; sort_order: number }) => ({
              planCode: row.plan_code,
              name: row.name,
              pricePhp: row.price_php,
              billingInterval: row.billing_interval,
              features: new Set(row.features),
              sortOrder: row.sort_order,
            }))
        );
        const planRow = planRes.error || !planRes.data ? null : planRes.data[0];
        setCurrentPlanCode(planRow?.plan_code ?? null);
        setLoading(false);
      }
    );
    return () => {
      cancelled = true;
    };
  }, []);

  const hasUsedTrial = billing?.trialEndsAt != null || billing?.subscriptionStatus === "TRIALING";

  function choosePlan(planCode: string) {
    if (TRIALABLE_CODES.has(planCode) && !hasUsedTrial) {
      startTrialBestEffort(planCode as "BUSINESS" | "PRO");
      setStartedCode(planCode);
    }
    // A plan that's already been trialed, or isn't self-serve trialable
    // (BASIC/ENTERPRISE), has no checkout in this app -- request_addon()/
    // request_plan_upgrade() and UpgradeModal's "Compare plans" pattern
    // already cover "ask a human", nothing new is invented here.
  }

  return {
    loading: loading || catalogueLoading,
    plans: plans.map((p) => ({
      ...p,
      priceLabel: priceLabel(p),
      // Unknown codes (a plan referencing a feature the catalogue hasn't
      // caught up on) are skipped rather than shown as a blank bullet --
      // same "an unknown answer is not a wrong answer" discipline as
      // usePlanPage's lockedByPlan.
      featureNames: [...p.features]
        .map((code) => featureNameByCode.get(code))
        .filter((name): name is string => !!name)
        .sort((a, b) => a.localeCompare(b)),
    })),
    currentPlanCode,
    hasUsedTrial,
    startedCode,
    choosePlan,
  };
}
