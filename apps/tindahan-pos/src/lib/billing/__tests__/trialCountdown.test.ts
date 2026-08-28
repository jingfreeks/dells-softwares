import { describe, it, expect } from "vitest";
import { daysUntil } from "../trialCountdown";

describe("daysUntil", () => {
  const now = new Date("2026-08-28T12:00:00Z");

  it("rounds up a same-day deadline to 1", () => {
    expect(daysUntil("2026-08-28T23:59:59Z", now)).toBe(1);
  });

  it("counts a deadline exactly 7 days out as 7", () => {
    expect(daysUntil("2026-09-04T12:00:00Z", now)).toBe(7);
  });

  it("counts a deadline 3 days out as 3", () => {
    expect(daysUntil("2026-08-31T12:00:00Z", now)).toBe(3);
  });

  it("counts a deadline 1 day out as 1", () => {
    expect(daysUntil("2026-08-29T12:00:00Z", now)).toBe(1);
  });

  it("returns 0 exactly at the deadline", () => {
    expect(daysUntil("2026-08-28T12:00:00Z", now)).toBe(0);
  });

  it("returns a negative number once the deadline has passed", () => {
    expect(daysUntil("2026-08-20T12:00:00Z", now)).toBe(-8);
  });
});
