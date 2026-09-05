/**
 * Review's reporting period.
 *
 * NOT src/pages/Reports/lib.ts's dateRangeForPreset(), and the difference is
 * deliberate rather than duplication:
 *
 *   * That one returns ISO TIMESTAMPS built from the browser's local midnight.
 *     review_summary() takes DATES and bounds them in Asia/Manila, because
 *     take_reading() derives a business date the same way. Handing it a range
 *     computed at the device's midnight is exactly the bug #505 fixed in the
 *     formatters -- right words, wrong day, and only visible to someone whose
 *     machine is not on Manila time.
 *
 *   * Review needs "Last month", which Reports' preset set does not have. The
 *     comparison window in review_summary() detects a WHOLE calendar month and
 *     compares against the previous one, so "This month" here means the whole
 *     month rather than month-to-date -- otherwise every period would fall
 *     through to the same-length-window fallback and the card could never
 *     honestly say "vs last month".
 *
 * One period for the whole page. The brief is explicit that sales, inventory
 * and utang must not each answer for a different range.
 */

export type ReviewPeriodPreset = "today" | "week" | "month" | "lastMonth" | "custom";

export interface ReviewPeriod {
  from: string;
  to: string;
}

/** Today in Manila, as {year, month, day} — the device's clock, the shop's calendar. */
function manilaToday(now: Date): { year: number; month: number; day: number } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  const [year, month, day] = parts.split("-").map(Number);
  return { year, month, day };
}

const pad = (n: number) => String(n).padStart(2, "0");
const iso = (y: number, m: number, d: number) => `${y}-${pad(m)}-${pad(d)}`;

/** Last day of a 1-indexed month, leap years included. */
function lastDayOf(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function reviewPeriodFor(
  preset: ReviewPeriodPreset,
  custom: ReviewPeriod,
  now: Date = new Date()
): ReviewPeriod {
  if (preset === "custom") return custom;

  const { year, month, day } = manilaToday(now);
  const today = iso(year, month, day);

  if (preset === "today") return { from: today, to: today };

  if (preset === "week") {
    // Trailing seven days including today, matching Reports' "This week".
    // UTC arithmetic on a date-only value: no clock, so no DST or offset to
    // get wrong.
    const start = new Date(Date.UTC(year, month - 1, day - 6));
    return {
      from: iso(start.getUTCFullYear(), start.getUTCMonth() + 1, start.getUTCDate()),
      to: today,
    };
  }

  if (preset === "lastMonth") {
    const prevYear = month === 1 ? year - 1 : year;
    const prevMonth = month === 1 ? 12 : month - 1;
    return {
      from: iso(prevYear, prevMonth, 1),
      to: iso(prevYear, prevMonth, lastDayOf(prevYear, prevMonth)),
    };
  }

  // "This month" is the WHOLE month, not month-to-date — see the header.
  return { from: iso(year, month, 1), to: iso(year, month, lastDayOf(year, month)) };
}
