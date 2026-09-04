import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { useAuth } from "@/lib";
import { makeAuthValue, makeStaffAccount, makeStore } from "../../../test/testUtils";
import { FeesLimits } from "../FeesLimits";
import { ComingSoonSettingsPage } from "../ComingSoonSettingsPage";

vi.mock("@/lib/auth", () => ({ useAuth: vi.fn() }));

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/settings/fees"]}>
      <Routes>
        <Route path="/settings/fees" element={<FeesLimits />} />
        <Route
          path="/settings/profile"
          element={<ComingSoonSettingsPage heading="Your profile" subheading="How you appear across the app" />}
        />
      </Routes>
    </MemoryRouter>
  );
}

describe("FeesLimits", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("shows the default e-load and cash fee brackets", () => {
    vi.mocked(useAuth).mockReturnValue(
      makeAuthValue({ user: makeStaffAccount({ storeId: "store-9" }), store: makeStore({ id: "store-9" }) })
    );
    renderPage();

    expect(screen.getByText("E-load fee")).toBeInTheDocument();
    expect(screen.getByText("Cash-in fee")).toBeInTheDocument();
    expect(screen.getByText("Cash-out fee")).toBeInTheDocument();
    expect(screen.getAllByRole("spinbutton").length).toBeGreaterThan(0);
  });

  it("marks the unenforced controls, and leaves the server-enforced ones unmarked", () => {
    vi.mocked(useAuth).mockReturnValue(
      makeAuthValue({ user: makeStaffAccount({ storeId: "store-9" }), store: makeStore({ id: "store-9" }) })
    );
    renderPage();

    // Issue #470: these four save to localStorage and nothing reads them.
    expect(screen.getByLabelText(/^Keep in drawer/)).toBeInTheDocument();
    expect(screen.getByText("Keep in drawer").parentElement).toHaveTextContent("Not enforced yet");
    expect(screen.getByText("Default credit limit").parentElement).toHaveTextContent("Not enforced yet");
    expect(
      screen.getByRole("switch", { name: "Block utang past the customer's limit (Not enforced yet)" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("switch", { name: "Warn when e-load float drops below ₱500 (Not enforced yet)" })
    ).toBeInTheDocument();

    // These two are real store columns, enforced server-side. They must not
    // pick up the marking, or it stops meaning anything.
    expect(screen.getByRole("switch", { name: "Voiding a paid sale needs your PIN" })).toBeInTheDocument();
    expect(screen.getByText("Cashier cash-out cap").parentElement).not.toHaveTextContent("Not enforced yet");
  });

  it("says on the print card that the till does not use these prices", () => {
    vi.mocked(useAuth).mockReturnValue(
      makeAuthValue({ user: makeStaffAccount({ storeId: "store-9" }), store: makeStore({ id: "store-9" }) })
    );
    renderPage();

    expect(screen.getAllByText("Saved, but not applied yet").length).toBeGreaterThan(0);
    expect(screen.getByText(/still charges its own built-in prices/)).toBeInTheDocument();
  });

  it("edits a fee bracket amount and saves it via updateStore", async () => {
    const user = userEvent.setup();
    const updateStore = vi.fn().mockResolvedValue({ ok: true });
    vi.mocked(useAuth).mockReturnValue(
      makeAuthValue({ user: makeStaffAccount({ storeId: "store-9" }), store: makeStore({ id: "store-9" }), updateStore })
    );
    renderPage();

    // Index 0 is the first bracket's editable "max" input; index 1 is its fee.
    const firstEloadFeeInput = screen.getAllByRole("spinbutton")[1];
    await user.clear(firstEloadFeeInput);
    await user.type(firstEloadFeeInput, "9");

    expect(await screen.findByText("Unsaved changes")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    expect(updateStore).toHaveBeenCalledWith(
      expect.objectContaining({
        feeConfig: expect.objectContaining({
          eload: expect.arrayContaining([expect.objectContaining({ fee: 9 })]),
        }),
      })
    );
    expect(await screen.findByRole("status")).toHaveTextContent("Fees and limits updated.");
  });

  it("adds and removes a fee bracket", async () => {
    const user = userEvent.setup();
    vi.mocked(useAuth).mockReturnValue(
      makeAuthValue({ user: makeStaffAccount({ storeId: "store-9" }), store: makeStore({ id: "store-9" }) })
    );
    renderPage();

    const addBracketButtons = screen.getAllByRole("button", { name: "Add bracket" });
    const eloadFeeCountBefore = screen.getAllByRole("spinbutton").length;

    await user.click(addBracketButtons[0]);
    // The new bracket adds a fee input, and the bracket before it (now no
    // longer the last, open-ended one) gains an editable "max" input too.
    expect(screen.getAllByRole("spinbutton").length).toBe(eloadFeeCountBefore + 2);

    const removeButtons = screen.getAllByRole("button", { name: /^Remove/ });
    await user.click(removeButtons[removeButtons.length - 1]);
    expect(screen.getAllByRole("spinbutton").length).toBe(eloadFeeCountBefore);
  });

  it("edits a fee bracket's range (max) amount and saves it via updateStore", async () => {
    const user = userEvent.setup();
    const updateStore = vi.fn().mockResolvedValue({ ok: true });
    vi.mocked(useAuth).mockReturnValue(
      makeAuthValue({ user: makeStaffAccount({ storeId: "store-9" }), store: makeStore({ id: "store-9" }), updateStore })
    );
    renderPage();

    // Index 0 is the first e-load bracket's editable "max" input.
    const firstEloadMaxInput = screen.getAllByRole("spinbutton")[0];
    await user.clear(firstEloadMaxInput);
    await user.type(firstEloadMaxInput, "25");

    expect(await screen.findByText("Unsaved changes")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    expect(updateStore).toHaveBeenCalledWith(
      expect.objectContaining({
        feeConfig: expect.objectContaining({
          eload: expect.arrayContaining([expect.objectContaining({ max: 25 })]),
        }),
      })
    );
  });

  it("shows an error when saving fails", async () => {
    const user = userEvent.setup();
    const updateStore = vi.fn().mockResolvedValue({ ok: false, error: "Something broke." });
    vi.mocked(useAuth).mockReturnValue(
      makeAuthValue({ user: makeStaffAccount({ storeId: "store-9" }), store: makeStore({ id: "store-9" }), updateStore })
    );
    renderPage();

    const firstEloadFeeInput = screen.getAllByRole("spinbutton")[1];
    await user.clear(firstEloadFeeInput);
    await user.type(firstEloadFeeInput, "9");
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Something broke.");
  });

  it("persists print/photocopy prices to localStorage on save", async () => {
    const user = userEvent.setup();
    const updateStore = vi.fn().mockResolvedValue({ ok: true });
    vi.mocked(useAuth).mockReturnValue(
      makeAuthValue({ user: makeStaffAccount({ storeId: "store-9" }), store: makeStore({ id: "store-9" }), updateStore })
    );
    renderPage();

    const printBwInput = screen.getByLabelText("Print B&W") as HTMLInputElement;
    await user.clear(printBwInput);
    await user.type(printBwInput, "4");

    await user.click(screen.getByRole("button", { name: "Save changes" }));
    await screen.findByRole("status");

    const raw = window.localStorage.getItem("tindahan-pos:fees-limits:store-9");
    const saved = JSON.parse(raw as string);
    expect(saved.printBw).toBe(4);
  });

  // Void-needs-PIN and the cash-out cap are real, server-enforced store
  // columns (20260903190000/20260903200000), not part of the localStorage
  // mock -- they go through updateStore() like feeConfig does, and read
  // their starting value from `store`, not a default.
  it("saves void-needs-PIN and the cashier cash-out cap through updateStore, sourced from the store", async () => {
    const user = userEvent.setup();
    const updateStore = vi.fn().mockResolvedValue({ ok: true });
    vi.mocked(useAuth).mockReturnValue(
      makeAuthValue({
        user: makeStaffAccount({ storeId: "store-9" }),
        store: makeStore({ id: "store-9", voidRequiresPin: false, cashierCashOutCap: null }),
        updateStore,
      })
    );
    renderPage();

    const toggle = screen.getByRole("switch", { name: "Voiding a paid sale needs your PIN" });
    expect(toggle).toHaveAttribute("aria-checked", "false");
    await user.click(toggle);

    const capInput = screen.getByLabelText("Cashier cash-out cap") as HTMLInputElement;
    await user.clear(capInput);
    await user.type(capInput, "1500");

    await user.click(screen.getByRole("button", { name: "Save changes" }));
    await screen.findByRole("status");

    expect(updateStore).toHaveBeenCalledWith(
      expect.objectContaining({ voidRequiresPin: true, cashierCashOutCap: 1500 })
    );
  });

  it("submits a 0 cash-out cap as null -- 0 means unlimited, not a P0 cap", async () => {
    const user = userEvent.setup();
    const updateStore = vi.fn().mockResolvedValue({ ok: true });
    vi.mocked(useAuth).mockReturnValue(
      makeAuthValue({
        user: makeStaffAccount({ storeId: "store-9" }),
        store: makeStore({ id: "store-9", cashierCashOutCap: 1000 }),
        updateStore,
      })
    );
    renderPage();

    const capInput = screen.getByLabelText("Cashier cash-out cap") as HTMLInputElement;
    await user.clear(capInput);
    await user.type(capInput, "0");

    await user.click(screen.getByRole("button", { name: "Save changes" }));
    await screen.findByRole("status");

    expect(updateStore).toHaveBeenCalledWith(expect.objectContaining({ cashierCashOutCap: null }));
  });

  it("discards unsaved edits", async () => {
    const user = userEvent.setup();
    vi.mocked(useAuth).mockReturnValue(
      makeAuthValue({ user: makeStaffAccount({ storeId: "store-9" }), store: makeStore({ id: "store-9" }) })
    );
    renderPage();

    const firstEloadFeeInput = screen.getAllByRole("spinbutton")[1] as HTMLInputElement;
    await user.clear(firstEloadFeeInput);
    await user.type(firstEloadFeeInput, "9");
    expect(await screen.findByText("Unsaved changes")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Discard" }));
    expect(screen.queryByText("Unsaved changes")).not.toBeInTheDocument();
    expect(firstEloadFeeInput).toHaveValue(2);
  });

  describe("settings sidebar", () => {
    it("navigates to the other settings sub-pages", async () => {
      const user = userEvent.setup();
      vi.mocked(useAuth).mockReturnValue(makeAuthValue());
      renderPage();

      await user.click(screen.getByRole("link", { name: /Your profile/ }));
      expect(await screen.findByText("Coming soon")).toBeInTheDocument();
    });
  });
});
