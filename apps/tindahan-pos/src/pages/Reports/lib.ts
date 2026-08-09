export type DateRangePreset = "today" | "week" | "month" | "custom";

function startOfDay(d: Date): Date {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function endOfDay(d: Date): Date {
  const copy = new Date(d);
  copy.setHours(23, 59, 59, 999);
  return copy;
}

/**
 * Resolves a preset (or custom start/end) to a concrete [startDate, endDate]
 * ISO range for the `fetchSalesInRange` query. "This week" is a trailing
 * 7-day window ending today (not a calendar week) and "This month" is
 * month-to-date — both avoid ambiguity over which day a week/month starts
 * on, and match "how have the last N days gone" better than a calendar
 * boundary that could be just 1 day old.
 *
 * `maxLookbackDays` clamps the resolved `startDate` to no earlier than
 * `now - maxLookbackDays` — the client-side mirror of the Tindahan-plan
 * RLS cap on `sales`/`sale_items` (see migration 0029), so the UI's
 * request matches what the server will actually return instead of the
 * two silently disagreeing.
 */
export function dateRangeForPreset(
  preset: DateRangePreset,
  customStart: string,
  customEnd: string,
  now: Date = new Date(),
  maxLookbackDays?: number
): { startDate: string; endDate: string } {
  let start: Date;
  const end = endOfDay(now);

  if (preset === "custom") {
    start = customStart ? startOfDay(new Date(customStart)) : startOfDay(now);
  } else if (preset === "week") {
    start = startOfDay(now);
    start.setDate(start.getDate() - 6);
  } else if (preset === "month") {
    start = new Date(now.getFullYear(), now.getMonth(), 1);
  } else {
    start = startOfDay(now);
  }

  const resolvedEnd = preset === "custom" && customEnd ? endOfDay(new Date(customEnd)) : end;

  if (maxLookbackDays !== undefined) {
    const earliestAllowed = startOfDay(now);
    earliestAllowed.setDate(earliestAllowed.getDate() - (maxLookbackDays - 1));
    if (start.getTime() < earliestAllowed.getTime()) start = earliestAllowed;
  }

  return { startDate: start.toISOString(), endDate: resolvedEnd.toISOString() };
}

/** yyyy-mm-dd, for CSV filenames and <input type="date"> defaults. */
export function toDateInputValue(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** yyyy-mm-dd for the custom-range date inputs' `min` attribute under a lookback cap. */
export function earliestAllowedDateInputValue(maxLookbackDays: number, now: Date = new Date()): string {
  const earliest = startOfDay(now);
  earliest.setDate(earliest.getDate() - (maxLookbackDays - 1));
  return toDateInputValue(earliest);
}
