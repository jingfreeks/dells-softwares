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

  it("edits a fee bracket amount and saves it via updateStore", async () => {
    const user = userEvent.setup();
    const updateStore = vi.fn().mockResolvedValue({ ok: true });
    vi.mocked(useAuth).mockReturnValue(
      makeAuthValue({ user: makeStaffAccount({ storeId: "store-9" }), store: makeStore({ id: "store-9" }), updateStore })
    );
    renderPage();

    const firstEloadFeeInput = screen.getAllByRole("spinbutton")[0];
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
    expect(screen.getAllByRole("spinbutton").length).toBe(eloadFeeCountBefore + 1);

    const removeButtons = screen.getAllByRole("button", { name: /^Remove/ });
    await user.click(removeButtons[removeButtons.length - 1]);
    expect(screen.getAllByRole("spinbutton").length).toBe(eloadFeeCountBefore);
  });

  it("shows an error when saving fails", async () => {
    const user = userEvent.setup();
    const updateStore = vi.fn().mockResolvedValue({ ok: false, error: "Something broke." });
    vi.mocked(useAuth).mockReturnValue(
      makeAuthValue({ user: makeStaffAccount({ storeId: "store-9" }), store: makeStore({ id: "store-9" }), updateStore })
    );
    renderPage();

    const firstEloadFeeInput = screen.getAllByRole("spinbutton")[0];
    await user.clear(firstEloadFeeInput);
    await user.type(firstEloadFeeInput, "9");
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Something broke.");
  });

  it("persists print/photocopy prices and cash-and-credit limits to localStorage on save", async () => {
    const user = userEvent.setup();
    const updateStore = vi.fn().mockResolvedValue({ ok: true });
    vi.mocked(useAuth).mockReturnValue(
      makeAuthValue({ user: makeStaffAccount({ storeId: "store-9" }), store: makeStore({ id: "store-9" }), updateStore })
    );
    renderPage();

    const printBwInput = screen.getByLabelText("Print B&W") as HTMLInputElement;
    await user.clear(printBwInput);
    await user.type(printBwInput, "4");

    const toggle = screen.getByRole("switch", { name: "Voiding a paid sale needs your PIN" });
    await user.click(toggle);

    await user.click(screen.getByRole("button", { name: "Save changes" }));
    await screen.findByRole("status");

    const raw = window.localStorage.getItem("tindahan-pos:fees-limits:store-9");
    const saved = JSON.parse(raw as string);
    expect(saved.printBw).toBe(4);
    expect(saved.voidNeedsPin).toBe(true);
  });

  it("discards unsaved edits", async () => {
    const user = userEvent.setup();
    vi.mocked(useAuth).mockReturnValue(
      makeAuthValue({ user: makeStaffAccount({ storeId: "store-9" }), store: makeStore({ id: "store-9" }) })
    );
    renderPage();

    const firstEloadFeeInput = screen.getAllByRole("spinbutton")[0] as HTMLInputElement;
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
