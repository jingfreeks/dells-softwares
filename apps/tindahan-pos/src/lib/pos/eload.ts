import { feeFromBrackets, type FeeBracket } from "./cashService";

export const NETWORKS = ["Globe", "Smart", "TNT", "TM", "DITO"] as const;
export type Network = (typeof NETWORKS)[number];

/**
 * Best-effort PH mobile prefix → network map, for auto-selecting a
 * network when the cashier types a number. Number portability and the
 * fact that TM/TNT ride on Globe's/Smart's own network (not a separate
 * one) make this inherently a guess, not authoritative — the cashier
 * can always tap a different network button to override it.
 */
const PREFIX_NETWORK: Record<string, Network> = {
  "817": "Globe",
  "904": "Globe",
  "905": "Globe",
  "906": "Globe",
  "915": "Globe",
  "916": "Globe",
  "917": "Globe",
  "926": "Globe",
  "927": "Globe",
  "935": "Globe",
  "936": "Globe",
  "945": "Globe",
  "953": "Globe",
  "954": "Globe",
  "955": "Globe",
  "956": "Globe",
  "957": "Globe",
  "958": "Globe",
  "959": "Globe",
  "965": "Globe",
  "966": "Globe",
  "967": "Globe",
  "975": "Globe",
  "976": "Globe",
  "977": "Globe",
  "978": "Globe",
  "979": "Globe",
  "994": "Globe",
  "995": "Globe",
  "996": "Globe",
  "997": "Globe",
  "813": "Smart",
  "908": "Smart",
  "909": "Smart",
  "910": "Smart",
  "912": "Smart",
  "918": "Smart",
  "919": "Smart",
  "920": "Smart",
  "921": "Smart",
  "928": "Smart",
  "929": "Smart",
  "930": "Smart",
  "931": "Smart",
  "932": "Smart",
  "938": "Smart",
  "939": "Smart",
  "946": "Smart",
  "947": "Smart",
  "948": "Smart",
  "949": "Smart",
  "951": "Smart",
  "961": "Smart",
  "968": "Smart",
  "969": "Smart",
  "970": "Smart",
  "981": "Smart",
  "989": "Smart",
  "998": "Smart",
  "999": "Smart",
  "907": "DITO",
  "991": "DITO",
  "992": "DITO",
  "993": "DITO",
};

/** Normalizes "0917 555 0142", "+639175550142", etc. to a plain "09XXXXXXXXX" string, or null if it isn't PH-mobile-shaped. */
function normalizeMobileNumber(mobileNumber: string): string | null {
  const digits = mobileNumber.replace(/\D/g, "");
  const local = digits.startsWith("63") ? `0${digits.slice(2)}` : digits;
  return /^0\d{10}$/.test(local) ? local : null;
}

export function isValidMobileNumber(mobileNumber: string): boolean {
  return normalizeMobileNumber(mobileNumber) !== null;
}

/** Best-effort network guess from the number's prefix — null while the number is incomplete or unrecognized. */
export function detectNetwork(mobileNumber: string): Network | null {
  const local = normalizeMobileNumber(mobileNumber);
  if (!local) return null;
  return PREFIX_NETWORK[local.slice(1, 4)] ?? null;
}

export const ELOAD_DENOMINATIONS = [10, 20, 50, 100, 300] as const;

/**
 * Placeholder fee brackets from the "Tindahan POS interface redesign"
 * review (1 Aug 2026) — plausible numbers, not researched market rates.
 * A store can override these from Settings → Fees and limits
 * (persisted on `stores.fee_config`); these remain the fallback when a
 * store hasn't set its own.
 */
export const DEFAULT_ELOAD_FEE_BRACKETS: FeeBracket[] = [
  { max: 20, fee: 2 },
  { max: 50, fee: 3 },
  { max: 100, fee: 5 },
  { max: 300, fee: 10 },
];

/** Service fee for a given load amount, resolved from the bracket table (amounts above the top bracket use its fee). */
export function eloadFee(amount: number, brackets: FeeBracket[] = DEFAULT_ELOAD_FEE_BRACKETS): number {
  return feeFromBrackets(amount, brackets.length > 0 ? brackets : DEFAULT_ELOAD_FEE_BRACKETS);
}

/** Quick-cash tender tiles for a given sale total: the exact amount, the next round ₱50 and ₱100, and a round ₱500 (or ₱500 above the total, once the total itself exceeds ₱500). */
export function suggestedCashAmounts(total: number): number[] {
  if (total <= 0) return [];
  const ceilTo = (step: number) => Math.ceil(total / step) * step;
  const candidates = [total, ceilTo(50), ceilTo(100), total < 500 ? 500 : ceilTo(500)];
  return Array.from(new Set(candidates));
}
