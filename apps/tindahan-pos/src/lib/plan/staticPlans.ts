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
 * Business — ₱599/monthly"), reached via a landing-page CTA carrying
 * ?plan=CODE. Deliberately not fetched from plan_prices() -- that RPC is
 * authenticated-only on purpose (this session spent three PRs closing an
 * anon/service_role overgrant across every RPC in this app), and Register
 * itself renders before any session exists. These numbers match what's
 * actually shipped in core.subscription_plans -- keep them in sync with
 * that table, the same way any other copy about a real product fact would
 * need updating.
 */
export const STATIC_PLANS: StaticPlan[] = [
  { code: "BASIC", name: "Basic", pricePhp: 299, billingInterval: "MONTHLY" },
  { code: "BUSINESS", name: "Business", pricePhp: 599, billingInterval: "MONTHLY" },
  { code: "PRO", name: "Pro", pricePhp: 999, billingInterval: "MONTHLY" },
  { code: "ENTERPRISE", name: "Enterprise", pricePhp: null, billingInterval: "MONTHLY" },
];

export function staticPlanPriceLabel(plan: Pick<StaticPlan, "pricePhp" | "billingInterval">): string {
  return priceLabel({ pricePhp: plan.pricePhp, billingInterval: plan.billingInterval, planCode: "", name: "", features: new Set(), sortOrder: 0 });
}
