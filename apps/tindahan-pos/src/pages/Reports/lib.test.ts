import { describe, expect, it } from "vitest";
import { dateRangeForPreset, earliestAllowedDateInputValue, toDateInputValue } from "./lib";

// Local Date constructor (not a UTC ISO string), so "today" always matches
// this machine's local calendar day regardless of timezone offset.
const now = new Date(2026, 7, 15, 12, 0, 0); // August 15, 2026, local noon

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Whole calendar days between `now`'s local midnight and `startDate`'s local midnight. */
function daysBeforeNow(startDate: string): number {
  const start = new Date(startDate);
  const nowMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startMidnight = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  return Math.round((nowMidnight.getTime() - startMidnight.getTime()) / MS_PER_DAY);
}

describe("dateRangeForPreset", () => {
  it("resolves 'today' to just today, unaffected by maxLookbackDays", () => {
    const { startDate } = dateRangeForPreset("today", "", "", now, 7);
    expect(daysBeforeNow(startDate)).toBe(0);
  });

  it("resolves 'month' to month-to-date when no lookback cap is set", () => {
    const { startDate } = dateRangeForPreset("month", "", "", now);
    expect(new Date(startDate).getDate()).toBe(1);
  });

  it("clamps 'month' to the lookback cap when one is set", () => {
    const { startDate } = dateRangeForPreset("month", "", "", now, 7);
    expect(daysBeforeNow(startDate)).toBe(6);
  });

  it("clamps a custom range that starts earlier than the lookback cap", () => {
    const { startDate } = dateRangeForPreset("custom", "2026-01-01", "2026-08-15", now, 7);
    expect(daysBeforeNow(startDate)).toBe(6);
  });

  it("leaves a custom range within the lookback cap untouched", () => {
    const { startDate } = dateRangeForPreset("custom", "2026-08-12", "2026-08-15", now, 7);
    expect(daysBeforeNow(startDate)).toBe(3);
  });
});

describe("earliestAllowedDateInputValue", () => {
  it("is exactly maxLookbackDays - 1 days before now, consistent with dateRangeForPreset's own clamp", () => {
    // Compares against dateRangeForPreset's clamp (not a hand-built date
    // string) since both go through the same toDateInputValue conversion —
    // see the spawned follow-up task for that helper's UTC-slice rounding
    // in positive-offset timezones (e.g. Philippines, UTC+8).
    const { startDate } = dateRangeForPreset("custom", "2020-01-01", "2026-08-15", now, 7);
    expect(earliestAllowedDateInputValue(7, now)).toBe(toDateInputValue(new Date(startDate)));
  });
});
