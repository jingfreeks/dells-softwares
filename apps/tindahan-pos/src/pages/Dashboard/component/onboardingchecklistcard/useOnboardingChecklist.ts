import { useStoreData, useDrawerFloat } from "@/lib";

export interface ChecklistItem {
  label: string;
  done: boolean;
  href: string;
}

/**
 * Real completion signals, computed from already-loaded app state -- never
 * a hardcoded "N of M". Distinct from OnboardingSidebar's step-status
 * helpers (lib.ts), which track wizard *step* and unmount once onboarding
 * finishes; this reads live data instead, so it stays accurate for as long
 * as the card is shown on the real Dashboard.
 */
export function useOnboardingChecklist() {
  const { products, customers, sales } = useStoreData();
  const { balance } = useDrawerFloat();

  const items: ChecklistItem[] = [
    { label: "Add your products", done: products.length > 0, href: "/inventory" },
    { label: "Open the register", done: balance > 0, href: "/pos" },
    { label: "Enter existing utang", done: customers.length > 0, href: "/customers" },
    { label: "Make your first sale", done: sales.length > 0, href: "/pos" },
  ];

  const doneCount = items.filter((i) => i.done).length;

  return { items, doneCount, total: items.length, allDone: doneCount === items.length };
}
