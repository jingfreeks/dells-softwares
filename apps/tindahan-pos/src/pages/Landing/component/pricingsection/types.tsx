import type { StaticPlanCode } from "@/lib/plan/staticPlans";

export interface PricingTier {
  code: StaticPlanCode;
  displayName: string;
  description: string;
  features: string[];
  featured?: boolean;
  ctaLabel: string;
}
