import { describe, expect, it } from "vitest";
import { closingBalance, groupLedgerByAccount, withRunningBalance } from "../ledger";
import type { Account, LedgerLine } from "@/lib/accounts";

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

describe("groupLedgerByAccount", () => {
  const account = (over: Partial<Account>): Account => ({
    id: over.code ?? "x",
    code: "1010",
    name: "Cash on Hand",
    type: "ASSET",
    normalBalance: "DEBIT",
    parentCode: null,
    isSystem: true,
    active: true,
    ...over,
  });

  const at = (code: string, debit: number, credit: number): LedgerLine => ({
    ...line(debit, credit),
    accountCode: code,
    accountName: code,
  });

  const chart = [
    account({ code: "1010", normalBalance: "DEBIT" }),
    account({ code: "4010", name: "Sales Revenue", type: "REVENUE", normalBalance: "CREDIT" }),
  ];

  it("gives each account its own block, ordered by code", () => {
    const groups = groupLedgerByAccount([at("4010", 0, 500), at("1010", 500, 0)], chart);
    expect(groups.map((g) => g.code)).toEqual(["1010", "4010"]);
  });

  it("runs each block in that account's own direction", () => {
    const groups = groupLedgerByAccount([at("1010", 500, 0), at("4010", 0, 500)], chart);
    expect(groups[0].closing).toBe(500);
    // Revenue is credit-normal, so a credit is an increase, not a -500.
    expect(groups[1].closing).toBe(500);
  });

  it("drops accounts with no activity rather than rendering empty headings", () => {
    const groups = groupLedgerByAccount([at("1010", 500, 0)], chart);
    expect(groups).toHaveLength(1);
  });

  it("still renders an account missing from the chart instead of crashing", () => {
    // Only reachable if an account were deleted after being posted to, which
    // the database refuses -- but a ledger that throws is worse than one that
    // shows a row.
    const groups = groupLedgerByAccount([at("9999", 100, 0)], chart);
    expect(groups[0].name).toBe("9999");
    expect(groups[0].closing).toBe(100);
  });
});
