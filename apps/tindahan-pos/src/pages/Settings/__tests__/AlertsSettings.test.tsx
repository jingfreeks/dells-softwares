import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { useAuth } from "@/lib";
import { makeAuthValue, makeStaffAccount, makeStore } from "../../../test/testUtils";
import { AlertsSettings } from "../AlertsSettings";
import { ComingSoonSettingsPage } from "../ComingSoonSettingsPage";

vi.mock("@/lib/auth", () => ({ useAuth: vi.fn() }));

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/settings/alerts"]}>
      <Routes>
        <Route path="/settings/alerts" element={<AlertsSettings />} />
        <Route
          path="/settings/profile"
          element={<ComingSoonSettingsPage heading="Your profile" subheading="How you appear across the app" />}
        />
      </Routes>
    </MemoryRouter>
  );
}

describe("AlertsSettings", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("shows the default stock/money/how-and-when state", () => {
    vi.mocked(useAuth).mockReturnValue(makeAuthValue({ user: makeStaffAccount({ storeId: "store-9" }) }));
    renderPage();

    expect(screen.getByText("Stock")).toBeInTheDocument();
    expect(screen.getByText("Money")).toBeInTheDocument();
    expect(screen.getByText("How and when")).toBeInTheDocument();
    expect(screen.getByRole("slider", { name: "Warn below" })).toHaveValue("3");
    expect(screen.getByRole("switch", { name: "Push" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("switch", { name: "Email" })).toHaveAttribute("aria-checked", "false");
  });

  it("moving the stock threshold slider persists to the shared Onboarding stockAlertSettings storage key", async () => {
    const user = userEvent.setup();
    vi.mocked(useAuth).mockReturnValue(makeAuthValue({ user: makeStaffAccount({ storeId: "store-9" }) }));
    renderPage();

    const slider = screen.getByRole("slider", { name: "Warn below" });
    fireEvent.change(slider, { target: { value: "5" } });

    expect(await screen.findByText("Unsaved changes")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    const raw = window.localStorage.getItem("tindahan-pos:stock-alert-settings:store-9");
    expect(JSON.parse(raw as string)).toMatchObject({ thresholdDays: 5 });
  });

  it("toggling the e-load float warning persists to the shared Fees feesLimitsMock storage key", async () => {
    const user = userEvent.setup();
    vi.mocked(useAuth).mockReturnValue(makeAuthValue({ user: makeStaffAccount({ storeId: "store-9" }) }));
    renderPage();

    const toggle = screen.getByRole("switch", { name: "Warn when e-load float drops below ₱500 (Not enforced yet)" });
    expect(toggle).toHaveAttribute("aria-checked", "false");
    await user.click(toggle);
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    const raw = window.localStorage.getItem("tindahan-pos:fees-limits:store-9");
    expect(JSON.parse(raw as string)).toMatchObject({ warnLowEloadFloat: true });
  });

  // The drawer threshold is a real store column now (20260905100000). The
  // channel toggles are still localStorage, because no push/SMS/email delivery
  // exists to configure -- so this asserts the split: one goes to the server,
  // the other does not, and both are saved by the same button.
  it("saves the drawer threshold to the store and the channel toggles locally", async () => {
    const user = userEvent.setup();
    const updateStore = vi.fn().mockResolvedValue({ ok: true });
    vi.mocked(useAuth).mockReturnValue(
      makeAuthValue({
        user: makeStaffAccount({ storeId: "store-9" }),
        store: makeStore({ id: "store-9" }),
        updateStore,
      })
    );
    renderPage();

    const drawerInput = screen.getByLabelText("Drawer off by more than") as HTMLInputElement;
    await user.clear(drawerInput);
    await user.type(drawerInput, "50");

    await user.click(screen.getByRole("switch", { name: "Email" }));

    await user.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() =>
      expect(updateStore).toHaveBeenCalledWith(
        expect.objectContaining({ drawerVarianceThreshold: 50 })
      )
    );

    const raw = window.localStorage.getItem("tindahan-pos:alerts:store-9");
    expect(JSON.parse(raw as string).emailEnabled).toBe(true);
    // ...and no longer to the device, which is what caused the disagreement.
    expect(JSON.parse(raw as string).drawerVarianceThreshold).toBeUndefined();
  });

  // If the server refuses, nothing is saved locally either -- a screen that
  // reported success while its two halves disagreed would be worse than the
  // failure it was hiding.
  it("saves nothing locally when the store write is refused", async () => {
    const user = userEvent.setup();
    const updateStore = vi.fn().mockResolvedValue({ ok: false, error: "Could not save alerts." });
    vi.mocked(useAuth).mockReturnValue(
      makeAuthValue({
        user: makeStaffAccount({ storeId: "store-9" }),
        store: makeStore({ id: "store-9" }),
        updateStore,
      })
    );
    renderPage();

    await user.click(screen.getByRole("switch", { name: "Email" }));
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    expect(await screen.findByText("Could not save alerts.")).toBeInTheDocument();
    expect(window.localStorage.getItem("tindahan-pos:alerts:store-9")).toBeNull();
  });

  // The same honesty pass #503 made on Fees & limits. Verified before marking:
  // every field left in alertsMock has zero consumers outside Settings.
  it("marks the settings that do nothing, and the ones that do nothing at all", async () => {
    vi.mocked(useAuth).mockReturnValue(
      makeAuthValue({ user: makeStaffAccount({ storeId: "store-9" }), store: makeStore({ id: "store-9" }) })
    );
    renderPage();

    expect(
      screen.getByRole("switch", { name: "Out of stock, straight away (Not enforced yet)" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("switch", { name: "Any void after payment (Not enforced yet)" })
    ).toBeInTheDocument();

    // "How and when" gets a stronger statement than a chip: there is no push,
    // SMS or email in this product, so it configures a delivery mechanism that
    // does not exist rather than a switch that is merely off.
    //
    // One note, not two — the notifications card lives on the Profile page,
    // which its own test covers.
    expect(screen.getByText("No alerts are sent yet")).toBeInTheDocument();
  });

  // The other direction, and the reason the marking means anything: the
  // threshold slider and the fast-mover boost have 55 and 13 consumers. They
  // really do change what the app shows, so marking them would empty the
  // marking of meaning.
  it("does NOT mark the stock threshold or fast-mover boost, which really work", async () => {
    vi.mocked(useAuth).mockReturnValue(
      makeAuthValue({ user: makeStaffAccount({ storeId: "store-9" }), store: makeStore({ id: "store-9" }) })
    );
    renderPage();

    expect(screen.getByRole("slider", { name: "Warn below" })).toBeInTheDocument();
    expect(
      screen.getByRole("switch", { name: "Fast movers warn earlier" })
    ).toBeInTheDocument();
  });

  // And the two that became real store columns in #514 stay clean.
  it("leaves the drawer and utang thresholds unmarked, since they are real now", async () => {
    vi.mocked(useAuth).mockReturnValue(
      makeAuthValue({ user: makeStaffAccount({ storeId: "store-9" }), store: makeStore({ id: "store-9" }) })
    );
    renderPage();

    expect(screen.getByLabelText("Drawer off by more than")).toBeInTheDocument();
    expect(screen.getByLabelText("Utang older than")).toBeInTheDocument();
  });

  it("discards unsaved edits across all three underlying settings", async () => {
    const user = userEvent.setup();
    vi.mocked(useAuth).mockReturnValue(makeAuthValue({ user: makeStaffAccount({ storeId: "store-9" }) }));
    renderPage();

    await user.click(screen.getByRole("switch", { name: "Email" }));
    expect(await screen.findByText("Unsaved changes")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Discard" }));
    expect(screen.queryByText("Unsaved changes")).not.toBeInTheDocument();
    expect(screen.getByRole("switch", { name: "Email" })).toHaveAttribute("aria-checked", "false");
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
