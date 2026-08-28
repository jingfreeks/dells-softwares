import { priceLabel } from "./plan";

export type StaticPlanCode = "BASIC" | "BUSINESS" | "PRO" | "ENTERPRISE";

export interface StaticPlan {
  code: StaticPlanCode;
  name: string;
  pricePhp: number | null;
  billingInterval: string;
}

/**
 * Static pricing for Register.tsx's plan acknowledgment ("Starting on
 * Growth — ₱599/monthly"), reached via a landing-page CTA carrying
 * ?plan=CODE. Deliberately not fetched from plan_prices() -- that RPC is
 * authenticated-only on purpose (this session spent three PRs closing an
 * anon/service_role overgrant across every RPC in this app), and Register
 * itself renders before any session exists. `code` matches what's actually
 * shipped in core.subscription_plans -- keep those in sync with that
 * table. `name` is the landing page's marketing label (Starter/Growth/
 * Business), independent of `code` -- renaming a display label here never
 * needs a matching change in the database, RPCs, or the ?plan=CODE URLs.
 */
export const STATIC_PLANS: StaticPlan[] = [
  { code: "BASIC", name: "Starter", pricePhp: 299, billingInterval: "MONTHLY" },
  { code: "BUSINESS", name: "Growth", pricePhp: 599, billingInterval: "MONTHLY" },
  { code: "PRO", name: "Pro", pricePhp: 999, billingInterval: "MONTHLY" },
  { code: "ENTERPRISE", name: "Business", pricePhp: null, billingInterval: "MONTHLY" },
];

export function staticPlanPriceLabel(plan: Pick<StaticPlan, "pricePhp" | "billingInterval">): string {
  return priceLabel({ pricePhp: plan.pricePhp, billingInterval: plan.billingInterval, planCode: "", name: "", features: new Set(), sortOrder: 0 });
}
