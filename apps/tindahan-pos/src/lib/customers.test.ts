import { describe, expect, it } from "vitest";
import { wouldExceedCreditLimit } from "./customers";
import type { Customer } from "./types";

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

describe("wouldExceedCreditLimit (advisory only, per product decision)", () => {
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
