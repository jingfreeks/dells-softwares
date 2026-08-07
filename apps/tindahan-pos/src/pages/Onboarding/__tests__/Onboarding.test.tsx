import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import {
  useAuth,
  useStoreData,
  validateAndOptimizeImage,
  uploadImage,
  DrawerFloatProvider,
  useDrawerFloat,
  PESO,
} from "@/lib";
import {
  makeAuthValue,
  makeStaffAccount,
  makeStore,
  makeStoreDataValue,
  makeProduct,
  makeSaleRecord,
} from "../../../test/testUtils";
import { Onboarding } from "../Onboarding";

vi.mock("@/lib/auth", () => ({ useAuth: vi.fn() }));
vi.mock("@/lib/storeData", () => ({ useStoreData: vi.fn() }));
vi.mock("@/lib/supabaseClient", () => ({ supabase: {} }));
vi.mock("@/lib/imageUpload", () => ({
  validateAndOptimizeImage: vi.fn(),
  uploadImage: vi.fn(),
}));

function makeImageFile(name = "photo.jpg") {
  return new File([new Uint8Array([1, 2, 3])], name, { type: "image/jpeg" });
}

function DrawerBalanceProbe() {
  const { balance } = useDrawerFloat();
  return <p data-testid="drawer-balance">{balance}</p>;
}

function renderPage() {
  return render(
    <DrawerFloatProvider>
      <DrawerBalanceProbe />
      <MemoryRouter initialEntries={["/onboarding"]}>
        <Routes>
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/admin" element={<p>Dashboard page</p>} />
        </Routes>
      </MemoryRouter>
    </DrawerFloatProvider>
  );
}

async function goToStoreStep(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: "Let's get started" }));
  await user.click(screen.getByRole("button", { name: "Next: Your store" }));
}

async function goToStockAlertsStep(user: ReturnType<typeof userEvent.setup>) {
  await goToStoreStep(user);
  await user.click(screen.getByRole("button", { name: "Finish setup" }));
  await user.click(await screen.findByRole("button", { name: "Skip for now" }));
}

async function goToOpenRegisterStep(user: ReturnType<typeof userEvent.setup>) {
  await goToStockAlertsStep(user);
  await user.click(await screen.findByRole("button", { name: "Use the default" }));
}

async function goToCongratsStep(user: ReturnType<typeof userEvent.setup>) {
  await goToOpenRegisterStep(user);
  await user.click(await screen.findByRole("button", { name: "Skip the count" }));
}

describe("Onboarding", () => {
  beforeEach(() => {
    vi.mocked(useStoreData).mockReturnValue(makeStoreDataValue());
    window.localStorage.clear();
  });

  it("shows the welcome step first", () => {
    vi.mocked(useAuth).mockReturnValue(makeAuthValue());
    renderPage();
    expect(screen.getByText("Welcome to Tindahan POS!")).toBeInTheDocument();
  });

  it("moves to the profile step, prefilled from the signed-in user", async () => {
    const user = userEvent.setup();
    vi.mocked(useAuth).mockReturnValue(
      makeAuthValue({ user: makeStaffAccount({ name: "Aling Nena", phone: "0917", address: "1 Rizal St" }) })
    );
    renderPage();

    await user.click(screen.getByRole("button", { name: "Let's get started" }));
    expect(screen.getByLabelText("Your name")).toHaveValue("Aling Nena");
    expect(screen.getByLabelText("Phone (optional)")).toHaveValue("0917");
    expect(screen.getByLabelText("Your address (optional)")).toHaveValue("1 Rizal St");
  });

  it("validates that a name is required on the profile step", async () => {
    const user = userEvent.setup();
    vi.mocked(useAuth).mockReturnValue(makeAuthValue());
    renderPage();

    await user.click(screen.getByRole("button", { name: "Let's get started" }));
    await user.clear(screen.getByLabelText("Your name"));
    await user.click(screen.getByRole("button", { name: "Next: Your store" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Name is required.");
  });

  it("saves the profile step and advances to the store step", async () => {
    const user = userEvent.setup();
    const updateProfile = vi.fn().mockResolvedValue({ ok: true });
    vi.mocked(useAuth).mockReturnValue(makeAuthValue({ user: makeStaffAccount({ name: "" }), updateProfile }));
    renderPage();

    await user.click(screen.getByRole("button", { name: "Let's get started" }));
    await user.type(screen.getByLabelText("Your name"), "Aling Nena");
    await user.type(screen.getByLabelText("Phone (optional)"), "0917");
    await user.type(screen.getByLabelText("Your address (optional)"), "1 Rizal St");
    await user.click(screen.getByRole("button", { name: "Next: Your store" }));

    expect(updateProfile).toHaveBeenCalledWith({
      name: "Aling Nena",
      phone: "0917",
      address: "1 Rizal St",
    });
    expect(await screen.findByText("Tell us about your store")).toBeInTheDocument();
  });

  it("shows an error when saving the profile step fails", async () => {
    const user = userEvent.setup();
    const updateProfile = vi.fn().mockResolvedValue({ ok: false, error: "Something broke." });
    vi.mocked(useAuth).mockReturnValue(makeAuthValue({ updateProfile }));
    renderPage();

    await user.click(screen.getByRole("button", { name: "Let's get started" }));
    await user.click(screen.getByRole("button", { name: "Next: Your store" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Something broke.");
  });

  it("optimizes, uploads, and includes the avatar when advancing from the profile step", async () => {
    const user = userEvent.setup();
    const updateProfile = vi.fn().mockResolvedValue({ ok: true });
    vi.mocked(useAuth).mockReturnValue(
      makeAuthValue({ user: makeStaffAccount({ id: "staff-1", storeId: "store-1" }), updateProfile })
    );
    const blob = new Blob(["x"], { type: "image/webp" });
    vi.mocked(validateAndOptimizeImage).mockResolvedValue(blob);
    vi.mocked(uploadImage).mockResolvedValue("https://cdn.test/store-1/staff-1/avatar.webp");
    renderPage();

    await user.click(screen.getByRole("button", { name: "Let's get started" }));
    const fileInput = document.getElementById("onboardAvatarInput") as HTMLInputElement;
    await user.upload(fileInput, makeImageFile());
    await screen.findByAltText("");

    await user.click(screen.getByRole("button", { name: "Next: Your store" }));

    expect(validateAndOptimizeImage).toHaveBeenCalledWith(expect.any(File), { maxDimension: 512 });
    expect(uploadImage).toHaveBeenCalledWith(expect.anything(), "avatars", "store-1/staff-1/avatar.webp", blob);
    expect(updateProfile).toHaveBeenCalledWith(
      expect.objectContaining({ avatarUrl: "https://cdn.test/store-1/staff-1/avatar.webp" })
    );
  });

  it("shows an error when the selected avatar isn't a valid image", async () => {
    const user = userEvent.setup();
    vi.mocked(useAuth).mockReturnValue(makeAuthValue());
    vi.mocked(validateAndOptimizeImage).mockRejectedValue(new Error("That file doesn't look like a valid image."));
    renderPage();

    await user.click(screen.getByRole("button", { name: "Let's get started" }));
    const fileInput = document.getElementById("onboardAvatarInput") as HTMLInputElement;
    await user.upload(fileInput, makeImageFile());

    expect(await screen.findByRole("alert")).toHaveTextContent("That file doesn't look like a valid image.");
  });

  it("prefills the store step from the store and can navigate back to the profile step", async () => {
    const user = userEvent.setup();
    vi.mocked(useAuth).mockReturnValue(
      makeAuthValue({ store: makeStore({ name: "Dell's Store", address: "2 Bonifacio Ave" }) })
    );
    renderPage();
    await goToStoreStep(user);

    expect(screen.getByLabelText("Store name")).toHaveValue("Dell's Store");
    expect(screen.getByLabelText("Store address")).toHaveValue("2 Bonifacio Ave");

    await user.click(screen.getByRole("button", { name: "Back" }));
    expect(screen.getByText("Tell us about you")).toBeInTheDocument();
  });

  it("validates that a store name is required", async () => {
    const user = userEvent.setup();
    vi.mocked(useAuth).mockReturnValue(makeAuthValue({ store: makeStore({ name: "" }) }));
    renderPage();
    await goToStoreStep(user);

    await user.clear(screen.getByLabelText("Store name"));
    await user.click(screen.getByRole("button", { name: "Finish setup" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Store name is required.");
  });

  it("copies the profile address into the store address when 'Same as my address' is checked", async () => {
    const user = userEvent.setup();
    vi.mocked(useAuth).mockReturnValue(
      makeAuthValue({
        user: makeStaffAccount({ address: "1 Rizal St" }),
        store: makeStore({ address: "Old store address" }),
      })
    );
    renderPage();
    await user.click(screen.getByRole("button", { name: "Let's get started" }));
    await user.click(screen.getByRole("button", { name: "Next: Your store" }));

    const storeAddressInput = screen.getByLabelText("Store address") as HTMLInputElement;
    expect(storeAddressInput).toHaveValue("Old store address");

    await user.click(screen.getByRole("checkbox", { name: "Same as my address" }));
    expect(storeAddressInput).toHaveValue("1 Rizal St");
    expect(storeAddressInput).toBeDisabled();
  });

  it("saves the store step and shows the congrats step, without marking onboarding complete yet", async () => {
    const user = userEvent.setup();
    const updateStore = vi.fn().mockResolvedValue({ ok: true });
    const completeOnboarding = vi.fn().mockResolvedValue({ ok: true });
    vi.mocked(useAuth).mockReturnValue(
      makeAuthValue({
        user: makeStaffAccount({ name: "Aling Nena" }),
        store: makeStore({ name: "Dell's Store", address: "2 Bonifacio Ave" }),
        updateStore,
        completeOnboarding,
      })
    );
    renderPage();
    await goToStoreStep(user);
    await user.click(screen.getByRole("button", { name: "Finish setup" }));

    expect(updateStore).toHaveBeenCalledWith({ name: "Dell's Store", address: "2 Bonifacio Ave" });
    expect(await screen.findByText("What do you sell?")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Skip for now" }));
    expect(await screen.findByText("When should we warn you?")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Use the default" }));
    expect(await screen.findByText("Count your starting cash")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Skip the count" }));
    expect(await screen.findByText(/Congratulations, Aling Nena!/)).toBeInTheDocument();
    expect(screen.getByText(/Dell's Store is all set up/)).toBeInTheDocument();
    // Marking onboardedAt here would make OnboardingRoute redirect away
    // before the user ever sees this screen — it's deferred to "Go to
    // dashboard" instead.
    expect(completeOnboarding).not.toHaveBeenCalled();
  });

  it("uploads a store photo and passes its URL through to updateStore", async () => {
    const user = userEvent.setup();
    const updateStore = vi.fn().mockResolvedValue({ ok: true });
    vi.mocked(useAuth).mockReturnValue(
      makeAuthValue({
        user: makeStaffAccount({ storeId: "store-1" }),
        store: makeStore({ id: "store-1" }),
        updateStore,
      })
    );
    const blob = new Blob(["x"], { type: "image/webp" });
    vi.mocked(validateAndOptimizeImage).mockResolvedValue(blob);
    vi.mocked(uploadImage).mockResolvedValue("https://cdn.test/store-1/store-photo.webp");
    renderPage();
    await goToStoreStep(user);

    const fileInput = document.getElementById("onboardStorePhotoInput") as HTMLInputElement;
    await user.upload(fileInput, makeImageFile("store.jpg"));
    await screen.findByAltText("");
    await user.click(screen.getByRole("button", { name: "Finish setup" }));

    expect(uploadImage).toHaveBeenCalledWith(
      expect.anything(),
      "store-photos",
      "store-1/store-photo.webp",
      blob
    );
    expect(updateStore).toHaveBeenCalledWith(
      expect.objectContaining({ photoUrl: "https://cdn.test/store-1/store-photo.webp" })
    );
  });

  it("shows an error when saving the store step fails", async () => {
    const user = userEvent.setup();
    const updateStore = vi.fn().mockResolvedValue({ ok: false, error: "Store save failed." });
    vi.mocked(useAuth).mockReturnValue(makeAuthValue({ updateStore }));
    renderPage();
    await goToStoreStep(user);
    await user.click(screen.getByRole("button", { name: "Finish setup" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Store save failed.");
  });

  it("shows an error on the congrats step when completing onboarding fails", async () => {
    const user = userEvent.setup();
    const completeOnboarding = vi.fn().mockResolvedValue({ ok: false, error: "Could not finish onboarding." });
    vi.mocked(useAuth).mockReturnValue(makeAuthValue({ completeOnboarding }));
    renderPage();
    await goToCongratsStep(user);
    await user.click(await screen.findByRole("button", { name: "Go to dashboard" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Could not finish onboarding.");
  });

  it("navigates to the dashboard from the congrats step", async () => {
    const user = userEvent.setup();
    const completeOnboarding = vi.fn().mockResolvedValue({ ok: true });
    vi.mocked(useAuth).mockReturnValue(makeAuthValue({ completeOnboarding }));
    renderPage();
    await goToCongratsStep(user);
    await user.click(await screen.findByRole("button", { name: "Go to dashboard" }));

    expect(completeOnboarding).toHaveBeenCalled();
    expect(screen.getByText("Dashboard page")).toBeInTheDocument();
  });

  it("shows the added-so-far count and imports the starter catalog on the products step", async () => {
    const user = userEvent.setup();
    const addProduct = vi.fn().mockResolvedValue({});
    const addCategory = vi.fn().mockResolvedValue({ id: "cat-1", name: "Noodles" });
    vi.mocked(useStoreData).mockReturnValue(makeStoreDataValue({ addProduct, addCategory }));
    renderPage();
    await goToStoreStep(user);
    await user.click(screen.getByRole("button", { name: "Finish setup" }));

    expect(await screen.findByText("What do you sell?")).toBeInTheDocument();
    expect(screen.getByText("0 products")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Add \d+ items/ }));
    expect(addProduct).toHaveBeenCalled();
  });

  it("skips through products, stock alerts, and register count to reach congrats", async () => {
    const user = userEvent.setup();
    vi.mocked(useAuth).mockReturnValue(makeAuthValue({ user: makeStaffAccount({ name: "Aling Nena" }) }));
    renderPage();
    await goToCongratsStep(user);

    expect(await screen.findByText(/Congratulations, Aling Nena!/)).toBeInTheDocument();
  });

  describe("stock alerts step", () => {
    it("selects a strategy and toggles smart settings", async () => {
      const user = userEvent.setup();
      vi.mocked(useAuth).mockReturnValue(makeAuthValue({ user: makeStaffAccount({ storeId: "store-1" }) }));
      renderPage();
      await goToStockAlertsStep(user);

      const daysOfCover = screen.getByRole("radio", { name: "By days of cover" });
      const fixedQuantity = screen.getByRole("radio", { name: "By fixed quantity" });
      expect(daysOfCover).toHaveAttribute("aria-checked", "true");
      expect(fixedQuantity).toHaveAttribute("aria-checked", "false");

      await user.click(fixedQuantity);
      expect(fixedQuantity).toHaveAttribute("aria-checked", "true");
      expect(daysOfCover).toHaveAttribute("aria-checked", "false");

      const fastMovers = screen.getByRole("switch", { name: "Fast movers get a longer warning" });
      expect(fastMovers).toHaveAttribute("aria-checked", "true");
      await user.click(fastMovers);
      expect(fastMovers).toHaveAttribute("aria-checked", "false");

      const dailySummary = screen.getByRole("switch", { name: "Send the list every morning at 7 AM" });
      expect(dailySummary).toHaveAttribute("aria-checked", "true");
      await user.click(dailySummary);
      expect(dailySummary).toHaveAttribute("aria-checked", "false");
    });

    it("updates the threshold slider and live preview", async () => {
      const user = userEvent.setup();
      const now = new Date().toISOString();
      const products = [
        makeProduct({ id: "prod-1", name: "Sardines", stock: 6 }),
        makeProduct({ id: "prod-2", name: "Skyflakes", stock: 20 }),
      ];
      const sales = [
        makeSaleRecord({
          id: "sale-1",
          timestamp: now,
          items: [{ productId: "prod-1", name: "Sardines", quantity: 2, price: 25, itemType: "product", fee: 0, lineTotal: 50 }],
        }),
      ];
      vi.mocked(useStoreData).mockReturnValue(makeStoreDataValue({ products, sales }));
      vi.mocked(useAuth).mockReturnValue(makeAuthValue({ user: makeStaffAccount({ storeId: "store-1" }) }));
      renderPage();
      await goToStockAlertsStep(user);

      // Sardines: stock 6, sells 2/day -> 3 days of cover, within the default 3-day threshold.
      const previewCard = screen
        .getByText("With that rule, today you'd be warned about")
        .closest(".tpl-card") as HTMLElement;
      expect(within(previewCard).getByText("1 items")).toBeInTheDocument();
      expect(within(previewCard).getByText(/Sardines/)).toBeInTheDocument();

      const slider = screen.getByRole("slider", { name: "Warn me when less than" }) as HTMLInputElement;
      fireEvent.change(slider, { target: { value: "1" } });

      expect(slider).toHaveValue("1");
      expect(within(previewCard).getByText("0 items")).toBeInTheDocument();
    });

    it("persists settings to localStorage and reloads them", async () => {
      const user = userEvent.setup();
      vi.mocked(useAuth).mockReturnValue(makeAuthValue({ user: makeStaffAccount({ storeId: "store-42" }) }));
      renderPage();
      await goToStockAlertsStep(user);

      await user.click(screen.getByRole("radio", { name: "By fixed quantity" }));
      await user.click(screen.getByRole("switch", { name: "Fast movers get a longer warning" }));

      const raw = window.localStorage.getItem("tindahan-pos:stock-alert-settings:store-42");
      expect(raw).not.toBeNull();
      const saved = JSON.parse(raw as string);
      expect(saved).toMatchObject({ strategy: "fixedQuantity", fastMoverBoost: false });
    });

    it("continues to the open register step", async () => {
      const user = userEvent.setup();
      vi.mocked(useAuth).mockReturnValue(makeAuthValue({ user: makeStaffAccount({ name: "Aling Nena" }) }));
      renderPage();
      await goToStockAlertsStep(user);

      await user.click(screen.getByRole("button", { name: "Continue" }));
      expect(await screen.findByText("Count your starting cash")).toBeInTheDocument();
    });
  });

  describe("open register step", () => {
    it("computes denomination subtotals and the starting float in real time", async () => {
      const user = userEvent.setup();
      vi.mocked(useAuth).mockReturnValue(makeAuthValue({ user: makeStaffAccount({ storeId: "store-1" }) }));
      renderPage();
      await goToOpenRegisterStep(user);

      await user.type(screen.getByRole("spinbutton", { name: "₱1,000" }), "1");
      await user.type(screen.getByRole("spinbutton", { name: "₱100" }), "4");

      expect(screen.getByText(PESO.format(1400))).toBeInTheDocument(); // starting float
      expect(screen.getByText(PESO.format(1000))).toBeInTheDocument(); // ₱1,000 row subtotal
      expect(screen.getByText(PESO.format(400))).toBeInTheDocument(); // ₱100 row subtotal
    });

    it("shows a low-cash-health warning when the count is mostly big bills", async () => {
      const user = userEvent.setup();
      vi.mocked(useAuth).mockReturnValue(makeAuthValue({ user: makeStaffAccount({ storeId: "store-1" }) }));
      renderPage();
      await goToOpenRegisterStep(user);

      await user.type(screen.getByRole("spinbutton", { name: "₱1,000" }), "2");
      expect(await screen.findByText("Mostly big bills")).toBeInTheDocument();

      await user.clear(screen.getByRole("spinbutton", { name: "₱1,000" }));
      await user.type(screen.getByRole("spinbutton", { name: "₱1,000" }), "1");
      await user.type(screen.getByRole("spinbutton", { name: "₱100" }), "4");
      await user.type(screen.getByRole("spinbutton", { name: "Coins" }), "600");
      expect(await screen.findByText("Plenty of small notes and coins")).toBeInTheDocument();
    });

    it("shows the signed-in admin as who's on the register", async () => {
      const user = userEvent.setup();
      vi.mocked(useAuth).mockReturnValue(makeAuthValue({ user: makeStaffAccount({ name: "Aling Nena" }) }));
      renderPage();
      await goToOpenRegisterStep(user);

      expect(screen.getByText(/Aling Nena/)).toBeInTheDocument();
      expect(screen.getByText(/\(you\)/)).toBeInTheDocument();
    });

    it("persists the denomination count to localStorage", async () => {
      const user = userEvent.setup();
      vi.mocked(useAuth).mockReturnValue(makeAuthValue({ user: makeStaffAccount({ storeId: "store-42" }) }));
      renderPage();
      await goToOpenRegisterStep(user);

      await user.type(screen.getByRole("spinbutton", { name: "₱500" }), "3");

      const raw = window.localStorage.getItem("tindahan-pos:open-register-settings:store-42");
      expect(raw).not.toBeNull();
      const saved = JSON.parse(raw as string);
      expect(saved.denominationCounts).toMatchObject({ d500: 3 });
    });

    it("opening the register sets the real drawer balance and reaches congrats", async () => {
      const user = userEvent.setup();
      vi.mocked(useAuth).mockReturnValue(makeAuthValue({ user: makeStaffAccount({ name: "Aling Nena" }) }));
      renderPage();
      await goToOpenRegisterStep(user);

      await user.type(screen.getByRole("spinbutton", { name: "₱1,000" }), "3");
      await user.click(screen.getByRole("button", { name: "Open the register" }));

      expect(await screen.findByText(/Congratulations, Aling Nena!/)).toBeInTheDocument();
      expect(screen.getByTestId("drawer-balance")).toHaveTextContent("3000");
    });

    it("skipping the count leaves the drawer balance untouched and reaches congrats", async () => {
      const user = userEvent.setup();
      vi.mocked(useAuth).mockReturnValue(makeAuthValue({ user: makeStaffAccount({ name: "Aling Nena" }) }));
      renderPage();
      await goToOpenRegisterStep(user);

      const balanceBefore = screen.getByTestId("drawer-balance").textContent;
      await user.click(screen.getByRole("button", { name: "Skip the count" }));

      expect(await screen.findByText(/Congratulations, Aling Nena!/)).toBeInTheDocument();
      expect(screen.getByTestId("drawer-balance")).toHaveTextContent(balanceBefore as string);
    });
  });
});
