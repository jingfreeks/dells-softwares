import type { FeeBracket } from "./types";

/**
 * Fallback fee tables, identical to the web app's
 * (lib/pos/eload.ts, lib/pos/cashService.ts). A store that has never
 * edited its own fees has `stores.fee_config` null and is charged these,
 * so the Fees screen has to seed from exactly the same numbers or it
 * would show an operator something different from what their register
 * actually charges.
 */
export const DEFAULT_ELOAD_FEE_BRACKETS: readonly FeeBracket[] = [
  { max: 20, fee: 2 },
  { max: 50, fee: 3 },
  { max: 100, fee: 5 },
  { max: 300, fee: 10 },
];

export const DEFAULT_CASH_IN_FEE_BRACKETS: readonly FeeBracket[] = [
  { max: 100, fee: 5 },
  { max: 300, fee: 10 },
  { max: 500, fee: 15 },
];

export const DEFAULT_CASH_OUT_FEE_BRACKETS: readonly FeeBracket[] = [
  { max: 200, fee: 10 },
  { max: 500, fee: 15 },
  { max: 1000, fee: 25 },
];

/**
 * The lower bound of a bracket, for display only. Brackets are an ordered
 * list of ceilings, so each one starts just past the previous ceiling and
 * the first starts at 1 -- overlaps are impossible by construction, which
 * is why there's no overlap validation to write. Same reasoning the web
 * app's FeeBracketCard uses.
 */
export function bracketMin(brackets: readonly FeeBracket[], index: number): number {
  return index === 0 ? 1 : brackets[index - 1].max + 1;
}

/**
 * Group digits so a five- or six-figure amount stays readable ("10,000",
 * not "10000"). Only for display -- the editable fields stay raw digits,
 * since that is what the number pad produces and what `toNumber` reads.
 */
export function formatAmount(value: number): string {
  return String(value).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}
