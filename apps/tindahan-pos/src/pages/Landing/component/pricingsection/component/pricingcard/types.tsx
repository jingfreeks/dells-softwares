import type { ReactNode } from "react";

export interface PricingCardProps {
  name: string;
  tag?: string;
  amount: ReactNode;
  description: string;
  features: string[];
  featured?: boolean;
  cta: ReactNode;
}
