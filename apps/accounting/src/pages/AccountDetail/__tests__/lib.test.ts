import { describe, expect, it } from "vitest";
import { closingBalance, withRunningBalance } from "../lib";
import type { LedgerLine } from "@/lib";

const line = (debit: number, credit: number): LedgerLine => ({
  accountCode: "1010",
  accountName: "Cash on Hand",
  entryDate: "2026-09-15",
  entryNo: "JE-000001",
  description: "Cash sale",
  sourceType: "SALE",
  debit,
  credit,
});

describe("withRunningBalance", () => {
  it("grows a debit-normal account on a debit", () => {
    const rows = withRunningBalance([line(500, 0), line(0, 200)], "DEBIT");
    expect(rows.map((r) => r.balance)).toEqual([500, 300]);
  });

  it("grows a credit-normal account on a credit", () => {
    // The point of the helper. Revenue is credit-normal, so a sale INCREASES
    // it. Subtracting debits from credits in a fixed order would show revenue
    // as a growing negative number -- defensible arithmetic, useless to read.
    const rows = withRunningBalance([line(0, 500), line(0, 250)], "CREDIT");
    expect(rows.map((r) => r.balance)).toEqual([500, 750]);
  });

  it("lets a debit reduce a credit-normal account", () => {
    const rows = withRunningBalance([line(0, 500), line(100, 0)], "CREDIT");
    expect(rows.map((r) => r.balance)).toEqual([500, 400]);
  });

  it("goes negative rather than clamping, because a contra balance is real", () => {
    const rows = withRunningBalance([line(0, 100)], "DEBIT");
    expect(rows[0].balance).toBe(-100);
  });

  it("leaves the original lines untouched", () => {
    const original = [line(500, 0)];
    withRunningBalance(original, "DEBIT");
    expect(original[0]).not.toHaveProperty("balance");
  });
});

describe("closingBalance", () => {
  it("is the last running balance", () => {
    expect(closingBalance(withRunningBalance([line(500, 0), line(0, 200)], "DEBIT"))).toBe(300);
  });

  it("is zero for an account with nothing posted to it", () => {
    expect(closingBalance([])).toBe(0);
  });
});
