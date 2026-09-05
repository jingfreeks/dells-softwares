import type { AccountingPeriod, DraftLine } from "@/lib";

export interface Totals {
  debit: number;
  credit: number;
  /** debit − credit. Signed, so the banner can say which side is short. */
  difference: number;
  balanced: boolean;
}

/**
 * A blank amount is zero, not NaN.
 *
 * Every row starts empty and one side of every row stays empty for good --
 * a line is a debit or a credit, never both. Number("") is 0 but
 * Number("abc") is NaN, and one NaN makes the whole total NaN, which renders
 * as "₱NaN" and tells the user nothing.
 */
export function toAmount(value: string): number {
  const n = Number(value.trim());
  return Number.isFinite(n) ? n : 0;
}

export function totals(lines: DraftLine[]): Totals {
  const debit = lines.reduce((sum, l) => sum + toAmount(l.debit), 0);
  const credit = lines.reduce((sum, l) => sum + toAmount(l.credit), 0);
  const difference = round2(debit - credit);
  return { debit: round2(debit), credit: round2(credit), difference, balanced: difference === 0 };
}

/**
 * Centavos, and only centavos.
 *
 * 0.1 + 0.2 is 0.30000000000000004 in binary floating point, so a form that
 * looks balanced can differ by 4e-17 and be refused by the database with no
 * visible reason. Rounding to two places is what the money actually is.
 */
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** A line the database would accept: an account, and exactly one side filled. */
export function isUsableLine(line: DraftLine): boolean {
  if (line.accountCode.trim() === "") return false;
  const debit = toAmount(line.debit);
  const credit = toAmount(line.credit);
  return (debit > 0 && credit === 0) || (credit > 0 && debit === 0);
}

export function usableLines(lines: DraftLine[]): DraftLine[] {
  return lines.filter(isUsableLine);
}

export type PostBlocker =
  | "no-description"
  | "needs-two-lines"
  | "not-balanced"
  | "period-not-open";

/**
 * Why Post is disabled, or null when it is not.
 *
 * One reason at a time, in the order someone fixes them, because a form that
 * lists four problems at once is a form nobody reads. Each maps to a sentence
 * naming the fix rather than the rule -- the design's §5: "Credit total is
 * ₱500.00 short of the debit total", not "Invalid entry".
 */
export function postBlocker(
  lines: DraftLine[],
  description: string,
  entryDate: string,
  periods: AccountingPeriod[]
): PostBlocker | null {
  if (description.trim() === "") return "no-description";
  if (usableLines(lines).length < 2) return "needs-two-lines";
  if (!totals(lines).balanced) return "not-balanced";
  if (!isDateInOpenPeriod(entryDate, periods)) return "period-not-open";
  return null;
}

/**
 * The same question B1's posting_allowed() answers, asked in the browser so
 * the ribbon can warn before the form is filled in.
 *
 * String comparison, not Date: these are yyyy-mm-dd business days and
 * lexicographic order is calendar order for that format. Parsing them into
 * Dates is how a month-end entry lands in the wrong month on a device west
 * of UTC.
 */
export function isDateInOpenPeriod(entryDate: string, periods: AccountingPeriod[]): boolean {
  return periods.some(
    (p) => p.status === "OPEN" && entryDate >= p.startsOn && entryDate <= p.endsOn
  );
}

export function periodFor(entryDate: string, periods: AccountingPeriod[]): AccountingPeriod | null {
  return periods.find((p) => entryDate >= p.startsOn && entryDate <= p.endsOn) ?? null;
}
