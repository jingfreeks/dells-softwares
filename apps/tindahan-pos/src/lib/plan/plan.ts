import type { StoreFeature } from "@/lib/features/featuresContext";
import { TEXT_PLAN_CONTACT_US } from "@/lib/textLabels/textLabels";

/** One plan from plan_prices() -- what upgrading to it costs and includes. */
export interface PlanPrice {
  planCode: string;
  name: string;
  /** null means custom/contact us (ENTERPRISE today), never "unset". */
  pricePhp: number | null;
  billingInterval: string;
  features: Set<string>;
  /** The ladder position -- lets a caller find "the very next tier" among several locked plans, not just "a" locked plan. */
  sortOrder: number;
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

/**
 * "₱999/month" or "Contact us". Shared by the plan page, the dashboard
 * widget, and the upgrade modal, so the three never drift -- this is the one
 * place a plan's price becomes on-screen text.
 */
export function priceLabel(plan: PlanPrice): string {
  return plan.pricePhp === null
    ? TEXT_PLAN_CONTACT_US
    : `${PESO.format(plan.pricePhp)}/${plan.billingInterval.toLowerCase()}`;
}
