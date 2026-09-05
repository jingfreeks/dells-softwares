import { describe, expect, it } from "vitest";
import { amount, formatDate } from "../money";

describe("amount", () => {
  it("formats pesos with two decimals", () => {
    expect(amount(45280)).toBe("₱45,280.00");
  });

  it("puts a negative in parentheses, not just in red", () => {
    // §47: colour is never the only signal. A printout and a colour-blind
    // reader both have to see the sign.
    expect(amount(-4310)).toBe("(₱4,310.00)");
  });

  it("renders a missing value as an em dash rather than a misleading zero", () => {
    expect(amount(null)).toBe("—");
    expect(amount(undefined)).toBe("—");
  });

  it("renders a real zero as zero", () => {
    expect(amount(0)).toBe("₱0.00");
  });
});

describe("formatDate", () => {
  it("reads a Postgres date as the business day it names", () => {
    expect(formatDate("2026-09-30")).toBe("Sep 30, 2026");
  });

  it("does not slide to the previous day in a negative-offset zone", () => {
    // The whole reason this helper exists. Run this file under
    // TZ=America/New_York and a naive implementation returns Sep 29.
    expect(formatDate("2026-01-01")).toBe("Jan 1, 2026");
  });
});
