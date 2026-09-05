import { describe, expect, it } from "vitest";
import { overdueTotal, shareOf } from "@/components";
import { bucketsFor, daysLate, totalsFor } from "../lib";
import { termsLabel, type Payable } from "@/lib";

const row = (over: Partial<Payable> = {}): Payable => ({
  supplierId: "s",
  supplierName: "Aling Nena Trading",
  paymentTerms: "15_days",
  outstanding: 0,
  notYetDue: 0,
  d1_30: 0,
  d31_60: 0,
  d61_90: 0,
  d90Plus: 0,
  oldestDue: null,
  deliveries: 0,
  ...over,
});

describe("bucketsFor", () => {
  it("calls the first bucket 'Not yet due', not 'Current'", () => {
    // A payable inside its terms is not merely recent -- it is money the
    // supplier agreed to wait for. "Current" invites paying it early for no
    // reason.
    expect(bucketsFor(row())[0].label).toBe("Not yet due");
    expect(bucketsFor(row())[0].overdue).toBe(false);
  });

  it("has five buckets, with no 'unknown' among them", () => {
    // Receivables needs a sixth because the POS cannot say which charge a
    // payment settled. A delivery always carries its own date and its
    // supplier's terms, so every peso here can be aged.
    const buckets = bucketsFor(row());
    expect(buckets).toHaveLength(5);
    expect(buckets.some((b) => /unknown/i.test(b.label))).toBe(false);
  });
});

describe("totalsFor", () => {
  const rows = [
    row({ outstanding: 1500, notYetDue: 500, d1_30: 1000, deliveries: 2 }),
    row({ supplierId: "t", outstanding: 200, d90Plus: 200, deliveries: 1 }),
  ];

  it("sums the book and counts both suppliers and deliveries", () => {
    const t = totalsFor(rows);
    expect(t.outstanding).toBe(1700);
    expect(t.suppliers).toBe(2);
    expect(t.deliveries).toBe(3);
  });

  it("splits the whole book between not-yet-due and overdue", () => {
    const t = totalsFor(rows);
    expect(t.notYetDue).toBe(500);
    expect(t.overdue).toBe(1200);
    // Unlike receivables there is no third category, so these two must
    // account for everything.
    expect(t.notYetDue + t.overdue).toBe(t.outstanding);
  });

  it("does not accumulate floating-point dust", () => {
    const pennies = Array.from({ length: 3 }, () => row({ outstanding: 0.1, d1_30: 0.1 }));
    expect(totalsFor(pennies).outstanding).toBe(0.3);
  });

  it("is all zeroes for an empty book", () => {
    expect(totalsFor([]).outstanding).toBe(0);
  });
});

describe("overdueTotal", () => {
  it("counts only the buckets flagged overdue", () => {
    expect(overdueTotal(bucketsFor(row({ notYetDue: 500, d31_60: 300 })))).toBe(300);
  });
});

describe("shareOf", () => {
  it("is zero on an empty book rather than NaN", () => {
    expect(shareOf(0, 0)).toBe(0);
  });
});

describe("termsLabel", () => {
  it("names the terms the shop agreed to", () => {
    expect(termsLabel("cash")).toBe("Cash on delivery");
    expect(termsLabel("15_days")).toBe("15 days");
  });

  it("states the assumption when a supplier has no terms recorded", () => {
    // my_payables() treats no terms as due on receipt, so the screen has to
    // say that rather than shrug at the reader.
    expect(termsLabel(null)).toMatch(/due on delivery/i);
  });
});

describe("daysLate", () => {
  const today = new Date(Date.UTC(2026, 8, 15));

  it("counts days past the due date", () => {
    expect(daysLate("2026-09-05", today)).toBe(10);
  });

  it("is null when nothing is overdue", () => {
    expect(daysLate(null, today)).toBeNull();
  });

  it("never goes negative for something due today or later", () => {
    expect(daysLate("2026-09-20", today)).toBe(0);
  });
});
