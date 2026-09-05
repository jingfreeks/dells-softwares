/**
 * One peso formatter, so no screen invents its own.
 *
 * Pinned to en-PH deliberately. A formatter without an explicit locale renders
 * in whatever the device is set to, and ₱1,234.56 becomes ₱1.234,56 on a
 * machine in Europe. The POS learned that the expensive way in #505.
 */
export const PESO = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  minimumFractionDigits: 2,
});

const DATE = new Intl.DateTimeFormat("en-PH", {
  year: "numeric",
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});

/**
 * Financial formatting, per the design's §5: negatives take parentheses AND
 * colour, never colour alone (§47), and a not-applicable value is an em dash
 * rather than a misleading 0.00.
 */
export function amount(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  if (value < 0) return `(${PESO.format(Math.abs(value))})`;
  return PESO.format(value);
}

/**
 * A Postgres `date` is yyyy-mm-dd and names a business day, not an instant.
 *
 * Built from UTC parts and formatted in UTC on purpose: `new Date("2026-09-30")`
 * parses as UTC midnight, which in a negative-offset zone renders as the 29th
 * -- which is how a month-end entry ends up displayed under the wrong month.
 */
export function formatDate(isoDate: string): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  return DATE.format(new Date(Date.UTC(y, m - 1, d)));
}
