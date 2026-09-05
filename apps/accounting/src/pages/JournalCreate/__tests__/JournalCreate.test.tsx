import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { JournalCreate } from "../JournalCreate";
import type { Account, AccountingPeriod } from "@/lib";

const accounts: Account[] = [
  { id: "a", code: "1010", name: "Cash on Hand", type: "ASSET", normalBalance: "DEBIT", parentCode: "1000", isSystem: true, active: true },
  { id: "b", code: "4010", name: "Sales Revenue", type: "REVENUE", normalBalance: "CREDIT", parentCode: "4000", isSystem: true, active: true },
];

// A period that always contains today, so the test does not start failing on
// a date the fixture did not anticipate.
const periods: AccountingPeriod[] = [
  { id: "p", code: "OPEN-NOW", startsOn: "2000-01-01", endsOn: "2100-12-31", status: "OPEN" },
];

// Partial, via importOriginal. Replacing "@/lib" wholesale would silently
// remove `amount` and `formatDate` too, and the screen would render ₱undefined
// while the test still passed -- which is exactly how BillingBanner's test in
// the POS ended up asserting nothing (#533).
vi.mock("@/lib", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  useSession: () => ({ session: null, access: "ready", refresh: vi.fn(), signOut: vi.fn() }),
}));

const save = vi.fn();
vi.mock("../hooks", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  useJournalForm: () => ({ accounts, periods, loading: false, saving: false, error: null, save }),
}));

function renderForm() {
  return render(
    <MemoryRouter>
      <JournalCreate />
    </MemoryRouter>
  );
}

describe("JournalCreate", () => {
  it("keeps Save as draft available while the entry is unbalanced", async () => {
    // The design is explicit: Post and Validate are disabled while unbalanced,
    // Save as draft is not. An unfinished entry must still be keepable.
    renderForm();
    expect(screen.getByRole("button", { name: /save as draft/i })).toBeEnabled();
    expect(screen.getByRole("button", { name: /post entry/i })).toBeDisabled();
  });

  it("names the shortfall and which side is short, not just 'invalid'", async () => {
    const user = userEvent.setup();
    renderForm();
    await user.selectOptions(screen.getByLabelText(/account for line 1/i), "1010");
    await user.type(screen.getByLabelText(/debit for line 1/i), "500");
    await user.selectOptions(screen.getByLabelText(/account for line 2/i), "4010");
    await user.type(screen.getByLabelText(/credit for line 2/i), "300");

    expect(screen.getByText(/credit total is .*200.00.* short of the debit total/i)).toBeInTheDocument();
  });

  it("enables Post once the two sides agree and a description exists", async () => {
    const user = userEvent.setup();
    renderForm();
    // Anchored: "Description for line 1" also starts with "Description".
    await user.type(screen.getByLabelText(/^description \*$/i), "Cash sale");
    await user.selectOptions(screen.getByLabelText(/account for line 1/i), "1010");
    await user.type(screen.getByLabelText(/debit for line 1/i), "500");
    await user.selectOptions(screen.getByLabelText(/account for line 2/i), "4010");
    await user.type(screen.getByLabelText(/credit for line 2/i), "500");

    expect(screen.getByText(/balanced/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /post entry/i })).toBeEnabled();
  });

  it("clears the other side when an amount is typed, because a line is one or the other", async () => {
    const user = userEvent.setup();
    renderForm();
    const debit = screen.getByLabelText(/debit for line 1/i);
    const credit = screen.getByLabelText(/credit for line 1/i);
    await user.type(debit, "500");
    await user.type(credit, "300");
    expect(debit).toHaveValue("");
    expect(credit).toHaveValue("300");
  });
});
