import { describe, expect, it } from "vitest";
import {
  wouldExceedCreditLimit,
  creditOverageAmount,
  isOverdueDebt,
  creditUsageVariant,
  buildDebtAgingSummary,
  computeOldestDebtDays,
} from "../customers";
import type { Customer, SaleRecord } from "../../types";

function makeCustomer(overrides: Partial<Customer> = {}): Customer {
  return {
    id: "c1",
    name: "Aling Nena",
    phone: null,
    creditLimit: null,
    balance: 0,
    ...overrides,
  };
}

describe("wouldExceedCreditLimit (server-enforced by checkout_sale)", () => {
  it("is false when the customer has no credit limit set", () => {
    const customer = makeCustomer({ creditLimit: null, balance: 500 });
    expect(wouldExceedCreditLimit(customer, 1000)).toBe(false);
  });

  it("is false when balance + sale stays at or under the limit", () => {
    const customer = makeCustomer({ creditLimit: 500, balance: 300 });
    expect(wouldExceedCreditLimit(customer, 200)).toBe(false);
  });

  it("is true when balance + sale would exceed the limit", () => {
    const customer = makeCustomer({ creditLimit: 500, balance: 300 });
    expect(wouldExceedCreditLimit(customer, 201)).toBe(true);
  });

  it("is false for a brand-new customer (zero balance) whose sale stays under their limit", () => {
    const customer = makeCustomer({ creditLimit: 1000, balance: 0 });
    expect(wouldExceedCreditLimit(customer, 999)).toBe(false);
  });
});

describe("creditOverageAmount", () => {
  it("is 0 when the customer has no credit limit set", () => {
    const customer = makeCustomer({ creditLimit: null, balance: 500 });
    expect(creditOverageAmount(customer, 1000)).toBe(0);
  });

  it("is 0 when balance + sale stays at or under the limit", () => {
    const customer = makeCustomer({ creditLimit: 500, balance: 300 });
    expect(creditOverageAmount(customer, 200)).toBe(0);
  });

  it("returns the exact amount over the limit", () => {
    const customer = makeCustomer({ creditLimit: 1000, balance: 1132 });
    expect(creditOverageAmount(customer, 69)).toBe(201);
  });
});

function makeSale(overrides: Partial<SaleRecord> = {}): SaleRecord {
  return {
    id: "s1",
    timestamp: "2026-07-01T10:00:00Z",
    total: 0,
    cashierName: "Cashier",
    cashierId: "staff-1",
    items: [],
    paymentType: "credit",
    customerId: "c1",
    referenceNo: null,
    ...overrides,
  };
}

describe("computeOldestDebtDays", () => {
  const now = new Date("2026-08-01T00:00:00Z");

  it("is null when the customer has no balance", () => {
    const customer = makeCustomer({ balance: 0 });
    expect(computeOldestDebtDays([], customer, now)).toBeNull();
  });

  it("is the number of days since the earliest credit sale for that customer", () => {
    const customer = makeCustomer({ id: "c1", balance: 100 });
    const sales = [
      makeSale({ customerId: "c1", timestamp: "2026-07-01T00:00:00Z" }),
      makeSale({ customerId: "c1", timestamp: "2026-07-20T00:00:00Z" }),
      makeSale({ customerId: "other", timestamp: "2026-01-01T00:00:00Z" }),
    ];
    expect(computeOldestDebtDays(sales, customer, now)).toBe(31);
  });
});

describe("isOverdueDebt", () => {
  it("defaults to a 30-day threshold when none is given", () => {
    expect(isOverdueDebt(31)).toBe(true);
    expect(isOverdueDebt(30)).toBe(false);
  });

  it("respects a custom threshold from Settings → Alerts", () => {
    expect(isOverdueDebt(15, 14)).toBe(true);
    expect(isOverdueDebt(14, 14)).toBe(false);
    expect(isOverdueDebt(60, 90)).toBe(false);
  });

  it("is false for null (no unpaid debt)", () => {
    expect(isOverdueDebt(null, 14)).toBe(false);
  });
});

describe("creditUsageVariant", () => {
  it("is danger when over the credit limit regardless of age", () => {
    const customer = makeCustomer({ creditLimit: 100, balance: 150 });
    expect(creditUsageVariant(customer, 1, 30)).toBe("danger");
  });

  it("is warn when overdue by the given threshold but within limit", () => {
    const customer = makeCustomer({ creditLimit: 1000, balance: 100 });
    expect(creditUsageVariant(customer, 20, 14)).toBe("warn");
  });

  it("is default when within limit and not overdue", () => {
    const customer = makeCustomer({ creditLimit: 1000, balance: 100 });
    expect(creditUsageVariant(customer, 5, 14)).toBe("default");
  });
});

describe("buildDebtAgingSummary", () => {
  it("buckets balances using the default 30-day threshold (0-15/16-30/Over 30)", () => {
    const customers = [
      makeCustomer({ id: "a", balance: 100 }),
      makeCustomer({ id: "b", balance: 200 }),
      makeCustomer({ id: "c", balance: 300 }),
    ];
    const days = new Map([
      ["a", 10],
      ["b", 20],
      ["c", 45],
    ]);
    const summary = buildDebtAgingSummary(customers, days);
    expect(summary).toEqual({
      bucket0to14: 100,
      bucket15to30: 200,
      bucketOver30: 300,
      total: 600,
      overThirtyPercent: 50,
    });
  });

  it("shifts bucket boundaries for a custom threshold", () => {
    const customers = [makeCustomer({ id: "a", balance: 100 }), makeCustomer({ id: "b", balance: 100 })];
    const days = new Map([
      ["a", 8], // <= midpoint(7)? midpoint = floor(14/2) = 7, so 8 falls in the middle bucket
      ["b", 20],
    ]);
    const summary = buildDebtAgingSummary(customers, days, 14);
    expect(summary.bucket0to14).toBe(0);
    expect(summary.bucket15to30).toBe(100);
    expect(summary.bucketOver30).toBe(100);
  });

  it("ignores customers with a zero or negative balance", () => {
    const customers = [makeCustomer({ id: "a", balance: 0 }), makeCustomer({ id: "b", balance: 50 })];
    const days = new Map([
      ["a", 5],
      ["b", 5],
    ]);
    const summary = buildDebtAgingSummary(customers, days);
    expect(summary.total).toBe(50);
  });
});
