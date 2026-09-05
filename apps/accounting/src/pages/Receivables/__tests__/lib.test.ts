import { describe, expect, it } from "vitest";
import { bucketsFor, daysOverdue, shareOf, totalsFor } from "../lib";
import type { Receivable } from "@/lib";

const row = (over: Partial<Receivable> = {}): Receivable => ({
  customerId: "c",
  customerName: "Aling Rosa",
  outstanding: 0,
  current: 0,
  d1_30: 0,
  d31_60: 0,
  d61_90: 0,
  d90Plus: 0,
  unaged: 0,
  oldestUnpaid: null,
  lastPaymentAt: null,
  ...over,
});

describe("bucketsFor", () => {
  it("treats everything past Current as overdue, and 'age unknown' as neither", () => {
    // Unaged money is owed but its age is not known. Counting it as Current
    // would be a guess in the shop's favour; counting it as overdue would be a
    // guess against the customer.
    const flags = bucketsFor(row()).map((b) => [b.key, b.overdue]);
    expect(flags).toEqual([
      ["current", false],
      ["d1_30", true],
      ["d31_60", true],
      ["d61_90", true],
      ["d90Plus", true],
      ["unaged", false],
    ]);
  });
});

describe("totalsFor", () => {
  const rows = [
    row({ outstanding: 600, d1_30: 300, d31_60: 200, d90Plus: 100 }),
    row({ customerId: "d", outstanding: 250, unaged: 250 }),
  ];

  it("sums the book", () => {
    const t = totalsFor(rows);
    expect(t.outstanding).toBe(850);
    expect(t.customers).toBe(2);
  });

  it("keeps unaged out of both current and overdue", () => {
    const t = totalsFor(rows);
    expect(t.overdue).toBe(600);
    expect(t.current).toBe(0);
    expect(t.unaged).toBe(250);
    // The three must still account for the whole book, or the screen is
    // quietly losing money somewhere.
    expect(t.current + t.overdue + t.unaged).toBe(t.outstanding);
  });

  it("does not accumulate floating-point dust across many customers", () => {
    const pennies = Array.from({ length: 3 }, () => row({ outstanding: 0.1, current: 0.1 }));
    expect(totalsFor(pennies).outstanding).toBe(0.3);
  });

  it("is all zeroes for an empty book rather than throwing", () => {
    const t = totalsFor([]);
    expect(t.outstanding).toBe(0);
    expect(t.buckets.every((b) => b.amount === 0)).toBe(true);
  });
});

describe("shareOf", () => {
  it("is a percentage of the total", () => {
    expect(shareOf(250, 1000)).toBe(25);
  });

  it("is zero when there is nothing to divide by", () => {
    // 0/0 is NaN, which renders as "NaN%" and, as a CSS width, silently
    // becomes the full bar -- an empty book showing a full meter.
    expect(shareOf(0, 0)).toBe(0);
  });
});

describe("daysOverdue", () => {
  const today = new Date(Date.UTC(2026, 8, 15));

  it("counts days from the oldest unpaid charge", () => {
    expect(daysOverdue("2026-09-05", today)).toBe(10);
  });

  it("is null when nothing is aged", () => {
    expect(daysOverdue(null, today)).toBeNull();
  });

  it("never goes negative for a charge dated today or ahead", () => {
    expect(daysOverdue("2026-09-15", today)).toBe(0);
    expect(daysOverdue("2026-09-20", today)).toBe(0);
  });

  it("counts across a month boundary", () => {
    expect(daysOverdue("2026-08-31", today)).toBe(15);
  });
});
