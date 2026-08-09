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
 */
export function dateRangeForPreset(
  preset: DateRangePreset,
  customStart: string,
  customEnd: string,
  now: Date = new Date()
): { startDate: string; endDate: string } {
  if (preset === "custom") {
    const start = customStart ? startOfDay(new Date(customStart)) : startOfDay(now);
    const end = customEnd ? endOfDay(new Date(customEnd)) : endOfDay(now);
    return { startDate: start.toISOString(), endDate: end.toISOString() };
  }

  const end = endOfDay(now);
  if (preset === "week") {
    const start = startOfDay(now);
    start.setDate(start.getDate() - 6);
    return { startDate: start.toISOString(), endDate: end.toISOString() };
  }
  if (preset === "month") {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    return { startDate: start.toISOString(), endDate: end.toISOString() };
  }
  return { startDate: startOfDay(now).toISOString(), endDate: end.toISOString() };
}

/** yyyy-mm-dd, for CSV filenames and <input type="date"> defaults. */
export function toDateInputValue(d: Date): string {
  return d.toISOString().slice(0, 10);
}
