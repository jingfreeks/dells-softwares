import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { useAuth } from "@/lib";
import { makeAuthValue, makeStaffAccount, makeStore } from "../../../test/testUtils";
import { ReceiptsSettings } from "../ReceiptsSettings";
import { ComingSoonSettingsPage } from "../ComingSoonSettingsPage";

vi.mock("@/lib/auth", () => ({ useAuth: vi.fn() }));

// useReceiptsSettingsPage reads the store's live next-invoice-number from
// document_series (server-controlled — see checkout_sale()) on mount.
vi.mock("@/lib/supabaseClient", () => {
  const maybeSingle = vi.fn().mockResolvedValue({ data: { prefix: "", next_number: 42 } });
  const eqSeriesKey = vi.fn(() => ({ maybeSingle }));
  const eqStoreId = vi.fn(() => ({ eq: eqSeriesKey }));
  const select = vi.fn(() => ({ eq: eqStoreId }));
  const from = vi.fn(() => ({ select }));
  return { supabase: { from, __mocks: { maybeSingle, from, select } } };
});

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/settings/receipts"]}>
      <Routes>
        <Route path="/settings/receipts" element={<ReceiptsSettings />} />
        <Route
          path="/settings/profile"
          element={<ComingSoonSettingsPage heading="Your profile" subheading="How you appear across the app" />}
        />
      </Routes>
    </MemoryRouter>
  );
}

describe("ReceiptsSettings", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("shows the default toggle states and 'What to include' chips", () => {
    vi.mocked(useAuth).mockReturnValue(
      makeAuthValue({ user: makeStaffAccount({ storeId: "store-9" }) })
    );
    renderPage();

    expect(screen.getByRole("switch", { name: "Print on the thermal printer" })).toHaveAttribute(
      "aria-checked",
      "true"
    );
    expect(screen.getByRole("switch", { name: "Print automatically every sale" })).toHaveAttribute(
      "aria-checked",
      "false"
    );
    expect(screen.getByRole("button", { name: /Logo/ })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "QR to pay" })).toHaveAttribute("aria-pressed", "false");
  });

  it("shows an 'Unsaved changes' chip only after an edit, and Save changes persists it to localStorage", async () => {
    const user = userEvent.setup();
    vi.mocked(useAuth).mockReturnValue(
      makeAuthValue({ user: makeStaffAccount({ storeId: "store-9" }) })
    );
    renderPage();

    expect(screen.queryByText("Unsaved changes")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save changes" })).toBeDisabled();

    await user.click(screen.getByRole("switch", { name: "Offer SMS receipt" }));
    expect(await screen.findByText("Unsaved changes")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save changes" })).toBeEnabled();

    await user.click(screen.getByRole("button", { name: "Save changes" }));

    expect(await screen.findByRole("status")).toHaveTextContent("Receipt settings updated.");
    expect(screen.queryByText("Unsaved changes")).not.toBeInTheDocument();

    const raw = window.localStorage.getItem("tindahan-pos:receipt-settings:store-9");
    expect(JSON.parse(raw as string)).toMatchObject({ offerSmsReceipt: false });
  });

  it("discards unsaved edits", async () => {
    const user = userEvent.setup();
    vi.mocked(useAuth).mockReturnValue(
      makeAuthValue({ user: makeStaffAccount({ storeId: "store-9" }) })
    );
    renderPage();

    await user.click(screen.getByRole("switch", { name: "Offer SMS receipt" }));
    expect(await screen.findByText("Unsaved changes")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Discard" }));
    expect(screen.queryByText("Unsaved changes")).not.toBeInTheDocument();
    expect(screen.getByRole("switch", { name: "Offer SMS receipt" })).toHaveAttribute("aria-checked", "true");
  });

  it("caps the footer message length and shows characters left", async () => {
    const user = userEvent.setup();
    vi.mocked(useAuth).mockReturnValue(
      makeAuthValue({ user: makeStaffAccount({ storeId: "store-9" }) })
    );
    renderPage();

    const input = screen.getByLabelText("Footer message") as HTMLInputElement;
    await user.clear(input);
    await user.type(input, "Short note");

    expect(input).toHaveValue("Short note");
    expect(screen.getByText(/characters left/)).toHaveTextContent("58 characters left");
  });

  it("shows the live next invoice number from document_series, with no edit control", async () => {
    vi.mocked(useAuth).mockReturnValue(
      makeAuthValue({ user: makeStaffAccount({ storeId: "store-9" }) })
    );
    renderPage();

    expect(await screen.findByText(/Next: 000042/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Edit" })).not.toBeInTheDocument();
  });

  it("renders the receipt preview using real store data and mock TIN", () => {
    vi.mocked(useAuth).mockReturnValue(
      makeAuthValue({
        user: makeStaffAccount({ storeId: "store-9" }),
        store: makeStore({ name: "Dell's Store", address: "14 Sampaguita St." }),
      })
    );
    renderPage();

    const preview = screen.getByText("Preview").closest("div") as HTMLElement;
    expect(within(preview).getByText("DELL'S STORE")).toBeInTheDocument();
    expect(within(preview).getByText(/14 Sampaguita St\./)).toBeInTheDocument();
    expect(screen.getByText("Test print")).toBeInTheDocument();
    expect(screen.getByText("58mm")).toBeInTheDocument();
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
