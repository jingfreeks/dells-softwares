import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { useAuth, validateAndOptimizeImage, uploadImage } from "@/lib";
import { makeAuthValue, makeStaffAccount, makeStore } from "../../../test/testUtils";
import { StoreDetails } from "../StoreDetails";
import { ComingSoonSettingsPage } from "../ComingSoonSettingsPage";

vi.mock("@/lib/auth", () => ({ useAuth: vi.fn() }));
vi.mock("@/lib/imageUpload", () => ({
  validateAndOptimizeImage: vi.fn(),
  uploadImage: vi.fn(),
}));

function makePhotoFile() {
  return new File([new Uint8Array([1, 2, 3])], "store.jpg", { type: "image/jpeg" });
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/settings/store"]}>
      <Routes>
        <Route path="/settings/store" element={<StoreDetails />} />
        <Route
          path="/settings/profile"
          element={<ComingSoonSettingsPage heading="Your profile" subheading="How you appear across the app" />}
        />
      </Routes>
    </MemoryRouter>
  );
}

describe("StoreDetails", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("prefills store name and address from the current store", () => {
    vi.mocked(useAuth).mockReturnValue(
      makeAuthValue({ store: makeStore({ name: "Dell's Store", address: "14 Sampaguita St." }) })
    );
    renderPage();

    expect(screen.getByLabelText("Store name")).toHaveValue("Dell's Store");
    expect(screen.getByLabelText("Address")).toHaveValue("14 Sampaguita St.");
  });

  it("shows currency and time zone as static, non-editable text", () => {
    vi.mocked(useAuth).mockReturnValue(makeAuthValue());
    renderPage();

    expect(screen.getByText("₱ PHP")).toBeInTheDocument();
    expect(screen.getByText("GMT+8")).toBeInTheDocument();
    expect(screen.queryByLabelText("Currency")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Time zone")).not.toBeInTheDocument();
  });

  it("validates that a store name is required", async () => {
    const user = userEvent.setup();
    vi.mocked(useAuth).mockReturnValue(makeAuthValue());
    renderPage();

    await user.clear(screen.getByLabelText("Store name"));
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Store name is required.");
  });

  it("saves store name and address changes", async () => {
    const user = userEvent.setup();
    const updateStore = vi.fn().mockResolvedValue({ ok: true });
    vi.mocked(useAuth).mockReturnValue(makeAuthValue({ updateStore }));
    renderPage();

    await user.clear(screen.getByLabelText("Store name"));
    await user.type(screen.getByLabelText("Store name"), "New Store Name");
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    expect(updateStore).toHaveBeenCalledWith(expect.objectContaining({ name: "New Store Name" }));
    expect(await screen.findByRole("status")).toHaveTextContent("Store details updated.");
  });

  it("shows an error when saving fails", async () => {
    const user = userEvent.setup();
    const updateStore = vi.fn().mockResolvedValue({ ok: false, error: "Something broke." });
    vi.mocked(useAuth).mockReturnValue(makeAuthValue({ updateStore }));
    renderPage();

    await user.click(screen.getByRole("button", { name: "Save changes" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Something broke.");
  });

  it("optimizes, uploads, and saves a new store photo", async () => {
    const user = userEvent.setup();
    vi.stubGlobal("URL", { ...URL, createObjectURL: vi.fn(() => "blob:preview"), revokeObjectURL: vi.fn() });
    const updateStore = vi.fn().mockResolvedValue({ ok: true });
    vi.mocked(useAuth).mockReturnValue(
      makeAuthValue({ user: makeStaffAccount({ storeId: "store-1" }), updateStore })
    );
    const blob = new Blob(["x"], { type: "image/webp" });
    vi.mocked(validateAndOptimizeImage).mockResolvedValue(blob);
    vi.mocked(uploadImage).mockResolvedValue("https://cdn.test/store-1/store-photo.webp");
    renderPage();

    const fileInput = document.getElementById("storeLogoInput") as HTMLInputElement;
    await user.upload(fileInput, makePhotoFile());
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    expect(validateAndOptimizeImage).toHaveBeenCalledWith(expect.any(File), { maxDimension: 1024 });
    expect(uploadImage).toHaveBeenCalledWith(expect.anything(), "store-photos", "store-1/store-photo.webp", blob);
    expect(updateStore).toHaveBeenCalledWith(
      expect.objectContaining({ photoUrl: "https://cdn.test/store-1/store-photo.webp" })
    );
  });

  it("shows an 'Unsaved changes' chip while editing, and clears it on discard", async () => {
    const user = userEvent.setup();
    vi.mocked(useAuth).mockReturnValue(makeAuthValue({ store: makeStore({ name: "Dell's Store" }) }));
    renderPage();

    expect(screen.queryByText("Unsaved changes")).not.toBeInTheDocument();

    await user.type(screen.getByLabelText("Store name"), " Jr.");
    expect(await screen.findByText("Unsaved changes")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Discard" }));
    expect(screen.getByLabelText("Store name")).toHaveValue("Dell's Store");
    expect(screen.queryByText("Unsaved changes")).not.toBeInTheDocument();
  });

  describe("contact details", () => {
    it("saves contact number and city as real store columns", async () => {
      const user = userEvent.setup();
      const updateStore = vi.fn().mockResolvedValue({ ok: true });
      vi.mocked(useAuth).mockReturnValue(
        makeAuthValue({ user: makeStaffAccount({ storeId: "store-9" }), updateStore })
      );
      renderPage();

      await user.type(screen.getByLabelText("Contact number"), "0917 555 0188");
      await user.type(screen.getByLabelText("City"), "Quezon City");
      await user.click(screen.getByRole("button", { name: "Save changes" }));

      expect(updateStore).toHaveBeenCalledWith(
        expect.objectContaining({ contactNumber: "0917 555 0188", city: "Quezon City" })
      );
    });
  });

  describe("opening hours", () => {
    it("shows Mon-Sun as always-on chips and persists opens/closes times", async () => {
      const user = userEvent.setup();
      vi.mocked(useAuth).mockReturnValue(
        makeAuthValue({ user: makeStaffAccount({ storeId: "store-9" }) })
      );
      renderPage();

      expect(screen.getByText("Mon")).toBeInTheDocument();
      expect(screen.getByText("Sun")).toBeInTheDocument();

      const opensInput = screen.getByLabelText("Opens") as HTMLInputElement;
      await user.clear(opensInput);
      await user.type(opensInput, "07:00");

      const raw = window.localStorage.getItem("tindahan-pos:opening-hours:store-9");
      expect(JSON.parse(raw as string)).toMatchObject({ openTime: "07:00" });
    });
  });

  describe("BIR registration", () => {
    it("toggles BIR registration and saves TIN / business permit no. as real store columns", async () => {
      const user = userEvent.setup();
      const updateStore = vi.fn().mockResolvedValue({ ok: true });
      vi.mocked(useAuth).mockReturnValue(
        makeAuthValue({ user: makeStaffAccount({ storeId: "store-9" }), updateStore })
      );
      renderPage();

      const toggle = screen.getByRole("switch", { name: "Registered with BIR" });
      expect(toggle).toHaveAttribute("aria-checked", "false");
      await user.click(toggle);
      expect(toggle).toHaveAttribute("aria-checked", "true");

      await user.type(screen.getByLabelText("TIN"), "123-456-789-000");
      await user.type(screen.getByLabelText("Business permit no."), "QC-2026-08841");
      await user.click(screen.getByRole("button", { name: "Save changes" }));

      expect(updateStore).toHaveBeenCalledWith(
        expect.objectContaining({
          birRegistered: true,
          tin: "123-456-789-000",
          businessPermitNo: "QC-2026-08841",
        })
      );
    });

    it("saves the selected VAT status and invoice type", async () => {
      const user = userEvent.setup();
      const updateStore = vi.fn().mockResolvedValue({ ok: true });
      vi.mocked(useAuth).mockReturnValue(
        makeAuthValue({ user: makeStaffAccount({ storeId: "store-9" }), updateStore })
      );
      renderPage();

      await user.selectOptions(screen.getByLabelText("VAT status"), "VAT Registered");
      await user.selectOptions(screen.getByLabelText("Invoice type"), "Service Invoice");
      await user.click(screen.getByRole("button", { name: "Save changes" }));

      expect(updateStore).toHaveBeenCalledWith(
        expect.objectContaining({ vatStatus: "vat_registered", invoiceType: "Service Invoice" })
      );
    });

    it("only shows the VAT rate field when VAT status is VAT Registered", async () => {
      const user = userEvent.setup();
      vi.mocked(useAuth).mockReturnValue(
        makeAuthValue({ user: makeStaffAccount({ storeId: "store-9" }) })
      );
      renderPage();

      expect(screen.queryByLabelText("VAT rate (%)")).not.toBeInTheDocument();

      await user.selectOptions(screen.getByLabelText("VAT status"), "VAT Registered");
      expect(screen.getByLabelText("VAT rate (%)")).toBeInTheDocument();

      await user.selectOptions(screen.getByLabelText("VAT status"), "Non-VAT");
      expect(screen.queryByLabelText("VAT rate (%)")).not.toBeInTheDocument();
    });

    it("saves a changed VAT rate", async () => {
      const user = userEvent.setup();
      const updateStore = vi.fn().mockResolvedValue({ ok: true });
      vi.mocked(useAuth).mockReturnValue(
        makeAuthValue({ user: makeStaffAccount({ storeId: "store-9" }), updateStore })
      );
      renderPage();

      await user.selectOptions(screen.getByLabelText("VAT status"), "VAT Registered");
      const rateInput = screen.getByLabelText("VAT rate (%)");
      await user.clear(rateInput);
      await user.type(rateInput, "10");
      await user.click(screen.getByRole("button", { name: "Save changes" }));

      expect(updateStore).toHaveBeenCalledWith(expect.objectContaining({ vatRate: 0.1 }));
    });
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
