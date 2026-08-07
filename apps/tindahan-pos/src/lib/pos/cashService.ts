export const CASH_PROVIDERS = ["GCash", "Maya"] as const;
export type CashProvider = (typeof CASH_PROVIDERS)[number];

export const CASH_IN_DENOMINATIONS = [100, 300, 500] as const;
export const CASH_OUT_DENOMINATIONS = [200, 500, 1000] as const;

export interface FeeBracket {
  max: number;
  fee: number;
}

/**
 * Placeholder fee brackets from the "Tindahan POS interface redesign"
 * review (1 Aug 2026) — plausible numbers, not researched market rates.
 * A store can override these from Settings → Fees and limits
 * (persisted on `stores.fee_config`); these remain the fallback when a
 * store hasn't set its own.
 */
export const DEFAULT_CASH_IN_FEE_BRACKETS: FeeBracket[] = [
  { max: 100, fee: 5 },
  { max: 300, fee: 10 },
  { max: 500, fee: 15 },
];

export const DEFAULT_CASH_OUT_FEE_BRACKETS: FeeBracket[] = [
  { max: 200, fee: 10 },
  { max: 500, fee: 15 },
  { max: 1000, fee: 25 },
];

export function feeFromBrackets(amount: number, brackets: FeeBracket[]): number {
  for (const bracket of brackets) {
    if (amount <= bracket.max) return bracket.fee;
  }
  return brackets[brackets.length - 1].fee;
}

/** Service fee for a given cash-in amount (customer pays amount + fee, cashier sends amount as e-money). */
export function cashInFee(amount: number, brackets: FeeBracket[] = DEFAULT_CASH_IN_FEE_BRACKETS): number {
  return feeFromBrackets(amount, brackets.length > 0 ? brackets : DEFAULT_CASH_IN_FEE_BRACKETS);
}

/** Service fee for a given cash-out amount (customer sends amount as e-money, cashier hands over amount - fee). */
export function cashOutFee(amount: number, brackets: FeeBracket[] = DEFAULT_CASH_OUT_FEE_BRACKETS): number {
  return feeFromBrackets(amount, brackets.length > 0 ? brackets : DEFAULT_CASH_OUT_FEE_BRACKETS);
}

export const PRINT_JOB_TYPES = [
  { key: "bw", label: "Print B&W", pricePerUnit: 5, unit: "page" },
  { key: "color", label: "Print colour", pricePerUnit: 12, unit: "page" },
  { key: "photocopy", label: "Photocopy", pricePerUnit: 2, unit: "page" },
  { key: "scan", label: "Scan to email", pricePerUnit: 10, unit: "job" },
] as const;

export type PrintJobKey = (typeof PRINT_JOB_TYPES)[number]["key"];

/**
 * Placeholder bulk-discount rate (also from the 1 Aug 2026 redesign
 * review) — 10% off the page subtotal once a job hits 10+ pages.
 */
const PRINT_BULK_DISCOUNT_MIN_PAGES = 10;
const PRINT_BULK_DISCOUNT_RATE = 0.1;

export function printBulkDiscount(subtotal: number, pages: number): number {
  if (pages < PRINT_BULK_DISCOUNT_MIN_PAGES) return 0;
  return Math.round(subtotal * PRINT_BULK_DISCOUNT_RATE);
}
