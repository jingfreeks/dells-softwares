export type DateRangePreset = "today" | "week" | "month" | "custom";

/**
 * Manila is UTC+08:00, with no DST since 1978 and none scheduled.
 *
 * Every boundary in this file is built from that constant rather than from
 * the device clock. It used to be device-local, which was wrong twice over.
 *
 * The visible failure was on the Dashboard: toDateInputValue returned the UTC
 * calendar date, so a local midnight was still the previous day in UTC, and
 * "yesterday" resolved to two days ago. The card compared ₱173 against a ₱55
 * day and reported "▲ 215% vs yesterday" when the honest figure was 24%.
 *
 * The quieter failure was that these are BUSINESS days. take_reading() derives
 * its date with `at time zone 'Asia/Manila'`, so a client working in device
 * time can ask for a different day than the function that issues the reading
 * -- and useXReadings and useZReadingReport both default their date from here.
 * A Z-reading is a BIR artefact; which day it covers is not a preference.
 *
 * Fixed offset rather than Intl, matching what the mobile app's dayBounds()
 * does and for the same reason: no locale data, nothing to get wrong on a
 * device, exact as long as the Philippines observes no DST. It would be the
 * wrong technique anywhere that does.
 */
const MANILA_OFFSET_MS = 8 * 60 * 60 * 1000;

/** Start of the named Manila day, as an instant. */
function manilaStartOfDay(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00.000+08:00`);
}

/** End of the named Manila day, as an instant. */
function manilaEndOfDay(dateStr: string): Date {
  return new Date(`${dateStr}T23:59:59.999+08:00`);
}

/**
 * yyyy-mm-dd for the MANILA day containing `d` -- for CSV filenames and
 * <input type="date"> values, both of which name a business day.
 */
export function toDateInputValue(d: Date): string {
  return new Date(d.getTime() + MANILA_OFFSET_MS).toISOString().slice(0, 10);
}

/**
 * The Manila day `days` before (or after, if positive) the named one.
 *
 * Arithmetic on the date string, not on a Date, so it cannot pick the device's
 * zone back up on the way through -- which is exactly how the Dashboard's own
 * copy of this used to lose a day.
 */
export function shiftDateInputValue(dateStr: string, days: number): string {
  const shifted = new Date(`${dateStr}T00:00:00.000Z`);
  shifted.setUTCDate(shifted.getUTCDate() + days);
  return shifted.toISOString().slice(0, 10);
}

/**
 * Resolves a preset (or custom start/end) to a concrete [startDate, endDate]
 * ISO range for the `fetchSalesInRange` query. "This week" is a trailing
 * 7-day window ending today (not a calendar week) and "This month" is
 * month-to-date — both avoid ambiguity over which day a week/month starts
 * on, and match "how have the last N days gone" better than a calendar
 * boundary that could be just 1 day old.
 *
 * "Today" means today in Manila, not on the device — see the note above.
 */
export function dateRangeForPreset(
  preset: DateRangePreset,
  customStart: string,
  customEnd: string,
  now: Date = new Date()
): { startDate: string; endDate: string } {
  const today = toDateInputValue(now);

  if (preset === "custom") {
    const start = manilaStartOfDay(customStart || today);
    const end = manilaEndOfDay(customEnd || today);
    return { startDate: start.toISOString(), endDate: end.toISOString() };
  }

  const endDate = manilaEndOfDay(today).toISOString();
  if (preset === "week") {
    return { startDate: manilaStartOfDay(shiftDateInputValue(today, -6)).toISOString(), endDate };
  }
  if (preset === "month") {
    return { startDate: manilaStartOfDay(`${today.slice(0, 7)}-01`).toISOString(), endDate };
  }
  return { startDate: manilaStartOfDay(today).toISOString(), endDate };
}
