import { describe, expect, it } from "vitest";
import { reviewPeriodFor } from "../lib";

/**
 * The clock is fixed and the assertions are Manila dates, because that is the
 * whole point of this helper: Reports' dateRangeForPreset() builds its range
 * from the BROWSER's midnight, and Review has to agree with a server that
 * bounds in Asia/Manila. #505 was the same mistake in the formatters.
 */
const EMPTY = { from: "", to: "" };

describe("reviewPeriodFor", () => {
  it("gives the whole calendar month for 'month', not month-to-date", () => {
    // Mid-month on purpose: month-to-date would end on the 15th, and then
    // review_summary() could never detect a whole month and would never
    // compare against the previous one.
    const period = reviewPeriodFor("month", EMPTY, new Date("2026-09-15T04:00:00Z"));
    expect(period).toEqual({ from: "2026-09-01", to: "2026-09-30" });
  });

  it("gives the previous whole month for 'lastMonth'", () => {
    const period = reviewPeriodFor("lastMonth", EMPTY, new Date("2026-09-15T04:00:00Z"));
    expect(period).toEqual({ from: "2026-08-01", to: "2026-08-31" });
  });

  it("rolls the year back when January asks for last month", () => {
    const period = reviewPeriodFor("lastMonth", EMPTY, new Date("2026-01-10T04:00:00Z"));
    expect(period).toEqual({ from: "2025-12-01", to: "2025-12-31" });
  });

  it("knows February's length, including a leap year", () => {
    expect(reviewPeriodFor("month", EMPTY, new Date("2028-02-10T04:00:00Z"))).toEqual({
      from: "2028-02-01",
      to: "2028-02-29",
    });
    expect(reviewPeriodFor("month", EMPTY, new Date("2026-02-10T04:00:00Z"))).toEqual({
      from: "2026-02-01",
      to: "2026-02-28",
    });
  });

  it("gives the trailing seven days for 'week', crossing a month boundary", () => {
    const period = reviewPeriodFor("week", EMPTY, new Date("2026-09-03T04:00:00Z"));
    expect(period).toEqual({ from: "2026-08-28", to: "2026-09-03" });
  });

  // The reason this file exists. 15:30 UTC is already the 6th in Manila, and a
  // helper built on the browser's midnight would answer "the 5th" for anyone
  // outside the Philippines.
  it("uses the Manila day, not the device's", () => {
    const lateUtc = new Date("2026-09-05T16:30:00Z"); // 00:30 on the 6th in Manila
    expect(reviewPeriodFor("today", EMPTY, lateUtc)).toEqual({
      from: "2026-09-06",
      to: "2026-09-06",
    });
  });

  it("passes custom dates through untouched", () => {
    const custom = { from: "2026-03-04", to: "2026-04-09" };
    expect(reviewPeriodFor("custom", custom, new Date("2026-09-15T04:00:00Z"))).toEqual(custom);
  });
});
