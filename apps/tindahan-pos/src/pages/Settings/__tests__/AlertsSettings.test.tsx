import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { useAuth } from "@/lib";
import { makeAuthValue, makeStaffAccount } from "../../../test/testUtils";
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

    const toggle = screen.getByRole("switch", { name: "Warn when e-load float drops below ₱500" });
    expect(toggle).toHaveAttribute("aria-checked", "false");
    await user.click(toggle);
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    const raw = window.localStorage.getItem("tindahan-pos:fees-limits:store-9");
    expect(JSON.parse(raw as string)).toMatchObject({ warnLowEloadFloat: true });
  });

  it("persists new alert-only fields (drawer variance, channels, quiet hours) to their own storage key", async () => {
    const user = userEvent.setup();
    vi.mocked(useAuth).mockReturnValue(makeAuthValue({ user: makeStaffAccount({ storeId: "store-9" }) }));
    renderPage();

    const drawerInput = screen.getByLabelText("Drawer off by more than") as HTMLInputElement;
    await user.clear(drawerInput);
    await user.type(drawerInput, "50");

    await user.click(screen.getByRole("switch", { name: "Email" }));

    await user.click(screen.getByRole("button", { name: "Save changes" }));

    const raw = window.localStorage.getItem("tindahan-pos:alerts:store-9");
    const saved = JSON.parse(raw as string);
    expect(saved.drawerVarianceThreshold).toBe(50);
    expect(saved.emailEnabled).toBe(true);
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
