import { describe, expect, it } from "vitest";
import { dateRangeForPreset } from "../lib";

/**
 * dateRangeForPreset takes `now` as an argument, so the calendar edges can
 * be tested directly instead of being discovered on the day they break.
 */
describe("dateRangeForPreset", () => {
  const MID_MONTH = new Date(2026, 8, 15, 10, 0, 0);
  const FIRST_OF_MONTH = new Date(2026, 8, 1, 10, 0, 0);

  it("gives 'this month' a wider window than 'today' during the month", () => {
    const today = dateRangeForPreset("today", "", "", MID_MONTH);
    const month = dateRangeForPreset("month", "", "", MID_MONTH);
    expect(new Date(month.startDate).getTime()).toBeLessThan(new Date(today.startDate).getTime());
  });

  it("collapses 'this month' onto 'today' on the first of the month", () => {
    // Not a defect: the month starts today, so the two ranges are the same
    // range. Written down because a test that assumed otherwise failed
    // once a month for no reason anyone could reproduce the next day.
    const today = dateRangeForPreset("today", "", "", FIRST_OF_MONTH);
    const month = dateRangeForPreset("month", "", "", FIRST_OF_MONTH);
    expect(month.startDate).toBe(today.startDate);
    expect(month.endDate).toBe(today.endDate);
  });

  it("covers seven days including today for 'this week'", () => {
    const { startDate, endDate } = dateRangeForPreset("week", "", "", MID_MONTH);
    expect(new Date(startDate).getDate()).toBe(9);
    expect(new Date(endDate).getDate()).toBe(15);
  });

  it("spans the month even when today is the last day", () => {
    const last = new Date(2026, 8, 30, 10, 0, 0);
    const { startDate, endDate } = dateRangeForPreset("month", "", "", last);
    expect(new Date(startDate).getDate()).toBe(1);
    expect(new Date(endDate).getDate()).toBe(30);
  });
});
