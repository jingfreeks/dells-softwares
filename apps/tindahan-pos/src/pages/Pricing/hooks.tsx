import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useBillingState } from "@/lib/billing/billingContext";
import { startTrialBestEffort } from "@/lib/billing/startTrial";
import { type PlanPrice, priceLabel } from "@/lib/plan/plan";

const TRIALABLE_CODES = new Set(["BUSINESS", "PRO"]);

export function usePricingPage() {
  const billing = useBillingState();
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
    loading,
    plans: plans.map((p) => ({ ...p, priceLabel: priceLabel(p) })),
    currentPlanCode,
    hasUsedTrial,
    startedCode,
    choosePlan,
  };
}
