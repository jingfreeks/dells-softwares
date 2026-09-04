import { describe, expect, it } from "vitest";
import {
  formatDate,
  formatDateShort,
  formatDateTime,
  formatDateTimeShort,
  formatDayLong,
  formatTime,
} from "../datetime";

// A fixed instant, so these assert the FORMAT rather than the clock.
const WHEN = new Date("2026-09-03T16:05:00+08:00");

describe("date formatting", () => {
  it("formats a date with its year", () => {
    expect(formatDate(WHEN)).toBe("Sep 3, 2026");
  });

  it("formats a short date for lists where the year is obvious", () => {
    expect(formatDateShort(WHEN)).toBe("Sep 3");
  });

  it("formats a time", () => {
    expect(formatTime(WHEN)).toBe("4:05 PM");
  });

  it("formats a timestamp", () => {
    expect(formatDateTime(WHEN)).toBe("Sep 3, 2026, 4:05 PM");
  });

  it("formats a timestamp without the year", () => {
    expect(formatDateTimeShort(WHEN)).toBe("Sep 3, 4:05 PM");
  });

  it("formats the long day used on the cashier greeting", () => {
    expect(formatDayLong(WHEN)).toBe("Thursday, September 3");
  });

  // The reason this module exists: a bare toLocaleString() renders in the
  // device's locale, so the same receipt read differently on a shop's tablet
  // and the owner's laptop. Every formatter here is pinned to en-PH.
  it("does not depend on the device locale", () => {
    const iso = "2026-09-03T16:05:00+08:00";
    expect(formatDate(iso)).toBe(formatDate(new Date(iso)));
  });

  // ...and pinning the locale was only half of it. The device's TIME ZONE is
  // the other half, and it went unnoticed for six merges because it is
  // invisible to anyone whose own machine is already on Manila time -- the CI
  // runners are UTC, and rendered this 4:05 PM sale as 8:05 AM.
  //
  // Half past midnight in Manila is still the previous afternoon in UTC, so
  // this instant lands on a different CALENDAR DAY in the two zones. That is
  // the case with teeth: the database derives the business date with
  // `at time zone 'Asia/Manila'`, so a client on device time could file a sale
  // under a different day than the Z-reading that counts it.
  it("renders in Manila time whatever the device is set to", () => {
    const justAfterMidnightManila = "2026-09-04T00:30:00+08:00"; // 2026-09-03 16:30 UTC

    expect(formatDate(justAfterMidnightManila)).toBe("Sep 4, 2026");
    expect(formatDateShort(justAfterMidnightManila)).toBe("Sep 4");
    expect(formatTime(justAfterMidnightManila)).toBe("12:30 AM");
    expect(formatDateTime(justAfterMidnightManila)).toBe("Sep 4, 2026, 12:30 AM");
    expect(formatDateTimeShort(justAfterMidnightManila)).toBe("Sep 4, 12:30 AM");
    expect(formatDayLong(justAfterMidnightManila)).toBe("Friday, September 4");
  });

  it("accepts an ISO string, a Date, or an epoch number alike", () => {
    const iso = "2026-09-03T16:05:00+08:00";
    expect(formatDateTime(iso)).toBe(formatDateTime(WHEN));
    expect(formatDateTime(new Date(iso).getTime())).toBe(formatDateTime(WHEN));
  });
});
