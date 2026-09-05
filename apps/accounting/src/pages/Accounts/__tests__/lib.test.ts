import { describe, expect, it } from "vitest";
import { filterAccounts, groupAccounts, matchesSearch } from "../lib";
import type { Account } from "@/lib";

const account = (over: Partial<Account>): Account => ({
  id: over.code ?? "x",
  code: "1010",
  name: "Cash on Hand",
  type: "ASSET",
  normalBalance: "DEBIT",
  parentCode: "1000",
  isSystem: true,
  active: true,
  ...over,
});

describe("groupAccounts", () => {
  it("orders the groups the way the design does, not alphabetically", () => {
    const groups = groupAccounts([
      account({ code: "6010", type: "EXPENSE" }),
      account({ code: "1010", type: "ASSET" }),
      account({ code: "4010", type: "REVENUE" }),
    ]);
    expect(groups.map((g) => g.label)).toEqual(["Assets", "Revenue", "Expenses"]);
  });

  it("drops an empty group rather than rendering a heading with nothing under it", () => {
    const groups = groupAccounts([account({ code: "1010", type: "ASSET" })]);
    expect(groups).toHaveLength(1);
  });

  it("sorts within a group by code, which is what puts 1010 under 1000", () => {
    const groups = groupAccounts([
      account({ code: "1040", type: "ASSET" }),
      account({ code: "1000", type: "ASSET" }),
      account({ code: "1010", type: "ASSET" }),
    ]);
    expect(groups[0].accounts.map((a) => a.code)).toEqual(["1000", "1010", "1040"]);
  });
});

describe("matchesSearch", () => {
  it("matches on code", () => {
    expect(matchesSearch(account({ code: "1030" }), "103")).toBe(true);
  });

  it("matches on name, case-insensitively", () => {
    expect(matchesSearch(account({ name: "Accounts Receivable" }), "receivable")).toBe(true);
  });

  it("treats a blank search as no filter at all", () => {
    expect(matchesSearch(account({}), "   ")).toBe(true);
  });
});

describe("filterAccounts", () => {
  const chart = [
    account({ code: "1010", type: "ASSET", active: true }),
    account({ code: "6050", type: "EXPENSE", name: "Other Expenses", active: false }),
  ];

  it("hides inactive accounts only when asked", () => {
    expect(filterAccounts(chart, { search: "", type: "ALL", activeOnly: false })).toHaveLength(2);
    expect(filterAccounts(chart, { search: "", type: "ALL", activeOnly: true })).toHaveLength(1);
  });

  it("combines search, type and active filters", () => {
    expect(
      filterAccounts(chart, { search: "other", type: "EXPENSE", activeOnly: false })
    ).toHaveLength(1);
    expect(
      filterAccounts(chart, { search: "other", type: "ASSET", activeOnly: false })
    ).toHaveLength(0);
  });
});
