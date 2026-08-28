import { useState } from "react";

export type BillingInterval = "MONTHLY" | "ANNUAL";

/** Monthly/Annual display toggle for the pricing grid -- PricingSection.tsx stays presentational. */
export function usePricingSection() {
  const [interval, setInterval] = useState<BillingInterval>("MONTHLY");
  return { interval, setInterval };
}
