import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AccountsTable } from "../AccountsTable";
import type { Account } from "@/lib";

const account = (over: Partial<Account>): Account => ({
  id: over.code ?? "x",
  code: "1010",
  name: "Cash on Hand",
  type: "ASSET",
  normalBalance: "DEBIT",
  parentCode: "1000",
  isSystem: false,
  active: true,
  ...over,
});

function renderTable(accounts: Account[]) {
  return render(
    <MemoryRouter>
      <AccountsTable accounts={accounts} />
    </MemoryRouter>
  );
}

describe("AccountsTable", () => {
  it("says which side increases the account, in words", () => {
    // §47: never colour alone. A DR/CR that is only a colour is unreadable in
    // print and to a colour-blind reader.
    renderTable([
      account({ code: "1010", normalBalance: "DEBIT" }),
      account({ code: "4010", name: "Sales Revenue", type: "REVENUE", normalBalance: "CREDIT" }),
    ]);
    expect(screen.getByText("Debit")).toBeInTheDocument();
    expect(screen.getByText("Credit")).toBeInTheDocument();
  });

  it("marks an account the integrations post to", () => {
    renderTable([account({ code: "1030", name: "Accounts Receivable", isSystem: true })]);
    expect(screen.getByText("System account")).toBeInTheDocument();
  });

  it("says Inactive rather than relying on the dimming alone", () => {
    renderTable([account({ code: "6050", active: false })]);
    expect(screen.getByText("Inactive")).toBeInTheDocument();
  });

  it("renders a missing parent as an em dash, not an empty cell", () => {
    renderTable([account({ code: "1000", parentCode: null })]);
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("links each account to its detail screen by code", () => {
    renderTable([account({ code: "1040", name: "Inventory" })]);
    expect(screen.getByRole("link", { name: "Inventory" })).toHaveAttribute("href", "/accounts/1040");
  });

  it("gives the table a caption and scoped headers, which the design's §47 asks for", () => {
    renderTable([account({})]);
    const table = screen.getByRole("table");
    expect(within(table).getByText(/grouped by account type/i)).toBeInTheDocument();
    expect(screen.getAllByRole("columnheader").length).toBe(6);
  });
});
