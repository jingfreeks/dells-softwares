import { useEffect, useMemo, useState } from "react";
import { useFeatures, type StoreFeature } from "@/lib/features/featuresContext";
import { useBillingState } from "@/lib/billing/billingContext";
import { supabase } from "@/lib/supabaseClient";
import {
  MODULE_LABEL_POS,
  MODULE_LABEL_INVENTORY,
  MODULE_LABEL_ACCOUNTING,
  TEXT_PLAN_CONTACT_US,
} from "@/lib";

const MODULE_LABELS: Record<string, string> = {
  POS: MODULE_LABEL_POS,
  INVENTORY: MODULE_LABEL_INVENTORY,
  ACCOUNTING: MODULE_LABEL_ACCOUNTING,
};

export interface PlanGroup {
  moduleCode: string;
  label: string;
  features: StoreFeature[];
}

/** One plan from plan_prices() -- what upgrading to it costs and includes. */
export interface PlanPrice {
  planCode: string;
  name: string;
  /** null means custom/contact us (ENTERPRISE today), never "unset". */
  pricePhp: number | null;
  billingInterval: string;
  features: Set<string>;
}

/** A locked capability, with the cheapest plan that would unlock it. */
export interface LockedByPlan {
  plan: PlanPrice;
  /** How the price reads on screen -- "₱999/month" or "Contact us". */
  priceLabel: string;
  features: StoreFeature[];
}

const PESO = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  minimumFractionDigits: 0,
});

function priceLabel(plan: PlanPrice): string {
  return plan.pricePhp === null
    ? TEXT_PLAN_CONTACT_US
    : `${PESO.format(plan.pricePhp)}/${plan.billingInterval.toLowerCase()}`;
}

/**
 * The store's capabilities, split into what it holds and what it does not --
 * plus, for what it does not, what it would actually cost to get it.
 *
 * HELD stays grouped by module: "you have Selling" is the sentence that
 * matters once something is already yours.
 *
 * LOCKED groups by the cheapest plan that unlocks it instead. A shopkeeper
 * reading "Purchase orders — not in your plan" has no next step; "Purchase
 * orders — upgrade to Pro, ₱999/month" is something they can actually decide
 * on. "Cheapest plan" rather than "the plan that introduced it": the ladder is
 * cumulative (250_tier_split pins this), so a feature never appears twice —
 * whichever plan is reached first going up the ladder is the one that grants
 * it, and every plan above also includes it.
 */
export function usePlanPage() {
  const { catalogue, loading: featuresLoading } = useFeatures();
  const billing = useBillingState();

  const [plans, setPlans] = useState<PlanPrice[]>([]);
  const [plansLoading, setPlansLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    supabase.rpc("plan_prices").then(({ data, error }) => {
      if (cancelled) return;
      setPlans(
        error || !data
          ? []
          : data
              .slice()
              .sort((a, b) => a.sort_order - b.sort_order)
              .map((row) => ({
                planCode: row.plan_code,
                name: row.name,
                pricePhp: row.price_php,
                billingInterval: row.billing_interval,
                features: new Set(row.features),
              }))
      );
      setPlansLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const loading = featuresLoading || plansLoading;

  const held = useMemo(() => {
    const byModule = new Map<string, StoreFeature[]>();
    for (const f of catalogue.filter((f) => f.held)) {
      const list = byModule.get(f.moduleCode);
      if (list) list.push(f);
      else byModule.set(f.moduleCode, [f]);
    }
    return [...byModule.entries()].map(([moduleCode, features]) => ({
      moduleCode,
      label: MODULE_LABELS[moduleCode] ?? moduleCode,
      features,
    }));
  }, [catalogue]);

  const lockedByPlan = useMemo((): LockedByPlan[] => {
    const lockedFeatures = catalogue.filter((f) => !f.held);
    if (lockedFeatures.length === 0 || plans.length === 0) return [];

    const groups = new Map<string, LockedByPlan>();
    for (const feature of lockedFeatures) {
      // The cheapest plan (by ladder position) that includes this feature.
      // A code plan_prices() has never heard of is skipped rather than
      // crashing the page -- the same "an unknown answer is not a wrong
      // answer" discipline as useFeature().
      const target = plans.find((p) => p.features.has(feature.code));
      if (!target) continue;
      const existing = groups.get(target.planCode);
      if (existing) existing.features.push(feature);
      else groups.set(target.planCode, { plan: target, priceLabel: priceLabel(target), features: [feature] });
    }
    return [...groups.values()];
  }, [catalogue, plans]);

  return {
    loading,
    held,
    lockedByPlan,
    /** Nothing is withheld — say so plainly rather than showing an empty panel. */
    holdsEverything: !loading && catalogue.length > 0 && lockedByPlan.length === 0,
    /** §08: writes can be paused, but nothing is ever taken away or hidden. */
    writesPaused: billing ? !billing.writesAllowed : false,
  };
}
