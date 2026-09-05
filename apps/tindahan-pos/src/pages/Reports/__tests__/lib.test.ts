import { describe, expect, it } from "vitest";
import { dateRangeForPreset, shiftDateInputValue, toDateInputValue } from "../lib";

/**
 * Every assertion here is on an absolute instant or a date string, never on
 * Date#getDate() or a local-time constructor. That is deliberate: the old
 * versions of these tests read the machine's calendar, so they agreed with
 * the code on a Manila laptop and would have agreed with it just as happily
 * had the code been wrong -- which it was. CI runs UTC; a shop runs Manila.
 */

/** 2026-09-15 10:00 in Manila. */
const MID_MONTH = new Date("2026-09-15T02:00:00Z");
/** 2026-09-01 10:00 in Manila. */
const FIRST_OF_MONTH = new Date("2026-09-01T02:00:00Z");

describe("toDateInputValue", () => {
  it("names the Manila day, not the device's and not UTC's", () => {
    // 2026-09-05 03:30 in Manila is still 2026-09-04 in UTC. Reading the UTC
    // date here is what made the Dashboard open on yesterday and call it
    // today before 8am -- and what made useZReadingReport default to the
    // wrong business day for a BIR artefact.
    expect(toDateInputValue(new Date("2026-09-04T19:30:00Z"))).toBe("2026-09-05");
  });

  it("holds at both ends of the Manila day", () => {
    expect(toDateInputValue(new Date("2026-09-04T16:00:00Z"))).toBe("2026-09-05");
    expect(toDateInputValue(new Date("2026-09-05T15:59:59Z"))).toBe("2026-09-05");
    expect(toDateInputValue(new Date("2026-09-05T16:00:00Z"))).toBe("2026-09-06");
  });
});

describe("shiftDateInputValue", () => {
  it("steps back exactly one day", () => {
    // The Dashboard's own copy of this went through a Date and a UTC
    // round-trip, so on a UTC+8 machine "yesterday" came back as two days
    // ago: the sales card compared today against the wrong day entirely and
    // reported 215% where the honest figure was 24%.
    expect(shiftDateInputValue("2026-09-05", -1)).toBe("2026-09-04");
  });

  it("crosses a year boundary", () => {
    expect(shiftDateInputValue("2026-01-01", -1)).toBe("2025-12-31");
  });

  it("crosses a leap day", () => {
    expect(shiftDateInputValue("2028-03-01", -1)).toBe("2028-02-29");
  });

  it("steps forward too", () => {
    expect(shiftDateInputValue("2026-09-05", 1)).toBe("2026-09-06");
  });
});

describe("dateRangeForPreset", () => {
  it("bounds 'today' to the Manila day, whatever the device says", () => {
    const { startDate, endDate } = dateRangeForPreset("today", "", "", MID_MONTH);
    expect(startDate).toBe("2026-09-14T16:00:00.000Z"); // 2026-09-15 00:00 +08:00
    expect(endDate).toBe("2026-09-15T15:59:59.999Z"); //   2026-09-15 23:59:59.999 +08:00
  });

  it("bounds a custom day the same way", () => {
    const { startDate, endDate } = dateRangeForPreset("custom", "2026-09-04", "2026-09-04", MID_MONTH);
    expect(startDate).toBe("2026-09-03T16:00:00.000Z");
    expect(endDate).toBe("2026-09-04T15:59:59.999Z");
  });

  it("covers seven Manila days including today for 'this week'", () => {
    const { startDate, endDate } = dateRangeForPreset("week", "", "", MID_MONTH);
    expect(startDate).toBe("2026-09-08T16:00:00.000Z"); // 2026-09-09 00:00 +08:00
    expect(endDate).toBe("2026-09-15T15:59:59.999Z");
  });

  it("runs 'this month' from the first Manila day of the month", () => {
    const { startDate } = dateRangeForPreset("month", "", "", MID_MONTH);
    expect(startDate).toBe("2026-08-31T16:00:00.000Z"); // 2026-09-01 00:00 +08:00
  });

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

  it("spans the month even when today is the last day", () => {
    const last = new Date("2026-09-30T02:00:00Z"); // 2026-09-30 10:00 Manila
    const { startDate, endDate } = dateRangeForPreset("month", "", "", last);
    expect(startDate).toBe("2026-08-31T16:00:00.000Z");
    expect(endDate).toBe("2026-09-30T15:59:59.999Z");
  });

  it("falls back to today when a custom bound is blank", () => {
    const { startDate, endDate } = dateRangeForPreset("custom", "", "", MID_MONTH);
    expect(startDate).toBe("2026-09-14T16:00:00.000Z");
    expect(endDate).toBe("2026-09-15T15:59:59.999Z");
  });
});
