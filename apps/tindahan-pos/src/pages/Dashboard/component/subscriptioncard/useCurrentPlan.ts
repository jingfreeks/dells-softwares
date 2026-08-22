import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { priceLabel, type PlanPrice } from "@/lib/plan/plan";

interface CurrentPlan {
  name: string;
  priceLabel: string;
}

/**
 * The dashboard's "what am I on today" -- my_store_plan() rather than
 * plan_prices() (which lists every plan, not which one is this store's).
 * One-shot fetch scoped to this widget, same shape as usePlanPage's own
 * plan_prices() fetch -- no app-wide Context, since nothing else needs this
 * on every page.
 */
export function useCurrentPlan() {
  const [plan, setPlan] = useState<CurrentPlan | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    supabase.rpc("my_store_plan").then(({ data, error }) => {
      if (cancelled) return;
      const row = !error && data && data.length > 0 ? data[0] : null;
      if (row) {
        const priced: PlanPrice = {
          planCode: row.plan_code,
          name: row.name,
          pricePhp: row.price_php,
          billingInterval: row.billing_interval,
          features: new Set(row.features),
          sortOrder: 0,
        };
        setPlan({ name: priced.name, priceLabel: priceLabel(priced) });
      } else {
        setPlan(null);
      }
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return { plan, loading };
}
