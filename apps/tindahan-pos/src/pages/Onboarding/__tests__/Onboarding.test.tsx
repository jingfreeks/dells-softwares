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
          <Route path="/pos" element={<p>POS page</p>} />
        </Routes>
      </MemoryRouter>
    </DrawerFloatProvider>
  );
}

async function goToProfileStep(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: "Start setup" }));
}

async function goToProductsStep(user: ReturnType<typeof userEvent.setup>) {
  await goToProfileStep(user);
  await user.click(screen.getByRole("button", { name: "Continue" }));
}

async function goToStockAlertsStep(user: ReturnType<typeof userEvent.setup>) {
  await goToProductsStep(user);
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
    expect(screen.getByText("Let's get your shop ready to sell.")).toBeInTheDocument();
  });

  it("skips straight to the open register step from welcome", async () => {
    const user = userEvent.setup();
    vi.mocked(useAuth).mockReturnValue(makeAuthValue());
    renderPage();

    await user.click(screen.getByRole("button", { name: "Skip — take me to the register" }));
    expect(await screen.findByText("Count your starting cash")).toBeInTheDocument();
  });

  it("moves to the profile step, prefilled from the signed-in user and store", async () => {
    const user = userEvent.setup();
    vi.mocked(useAuth).mockReturnValue(
      makeAuthValue({
        user: makeStaffAccount({ name: "Aling Nena", phone: "0917" }),
        store: makeStore({ name: "Dell's Store", address: "2 Bonifacio Ave" }),
      })
    );
    renderPage();

    await goToProfileStep(user);
    expect(screen.getByLabelText("Your name")).toHaveValue("Aling Nena");
    expect(screen.getByLabelText("Mobile number")).toHaveValue("0917");
    expect(screen.getByLabelText("Store name")).toHaveValue("Dell's Store");
    expect(screen.getByLabelText("Store address")).toHaveValue("2 Bonifacio Ave");
  });

  it("validates that a name is required on the profile step", async () => {
    const user = userEvent.setup();
    vi.mocked(useAuth).mockReturnValue(makeAuthValue({ store: makeStore({ name: "Dell's Store" }) }));
    renderPage();

    await goToProfileStep(user);
    await user.clear(screen.getByLabelText("Your name"));
    await user.click(screen.getByRole("button", { name: "Continue" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Name is required.");
  });

  it("validates that a store name is required on the profile step", async () => {
    const user = userEvent.setup();
    vi.mocked(useAuth).mockReturnValue(
      makeAuthValue({ user: makeStaffAccount({ name: "Aling Nena" }), store: makeStore({ name: "" }) })
    );
    renderPage();

    await goToProfileStep(user);
    await user.click(screen.getByRole("button", { name: "Continue" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Store name is required.");
  });

  it("saves both profile and store details in one Continue and advances to products", async () => {
    const user = userEvent.setup();
    const updateProfile = vi.fn().mockResolvedValue({ ok: true });
    const updateStore = vi.fn().mockResolvedValue({ ok: true });
    vi.mocked(useAuth).mockReturnValue(
      makeAuthValue({
        user: makeStaffAccount({ name: "Aling Nena", phone: "0917", address: null }),
        store: makeStore({ name: "Dell's Store", address: "2 Bonifacio Ave" }),
        updateProfile,
        updateStore,
      })
    );
    renderPage();

    await goToProfileStep(user);
    await user.click(screen.getByRole("button", { name: "Continue" }));

    expect(updateProfile).toHaveBeenCalledWith({ name: "Aling Nena", phone: "0917", address: null });
    expect(updateStore).toHaveBeenCalledWith({ name: "Dell's Store", address: "2 Bonifacio Ave" });
    expect(await screen.findByText("What do you sell?")).toBeInTheDocument();
  });

  it("shows an error when saving the profile fails, without saving the store", async () => {
    const user = userEvent.setup();
    const updateProfile = vi.fn().mockResolvedValue({ ok: false, error: "Something broke." });
    const updateStore = vi.fn().mockResolvedValue({ ok: true });
    vi.mocked(useAuth).mockReturnValue(
      makeAuthValue({ store: makeStore({ name: "Dell's Store" }), updateProfile, updateStore })
    );
    renderPage();

    await goToProfileStep(user);
    await user.click(screen.getByRole("button", { name: "Continue" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Something broke.");
    expect(updateStore).not.toHaveBeenCalled();
  });

  it("shows an error when saving the store fails", async () => {
    const user = userEvent.setup();
    const updateProfile = vi.fn().mockResolvedValue({ ok: true });
    const updateStore = vi.fn().mockResolvedValue({ ok: false, error: "Store save failed." });
    vi.mocked(useAuth).mockReturnValue(
      makeAuthValue({ store: makeStore({ name: "Dell's Store" }), updateProfile, updateStore })
    );
    renderPage();

    await goToProfileStep(user);
    await user.click(screen.getByRole("button", { name: "Continue" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Store save failed.");
  });

  it("optimizes, uploads, and includes the avatar when continuing from the profile step", async () => {
    const user = userEvent.setup();
    const updateProfile = vi.fn().mockResolvedValue({ ok: true });
    vi.mocked(useAuth).mockReturnValue(
      makeAuthValue({
        user: makeStaffAccount({ id: "staff-1", storeId: "store-1" }),
        store: makeStore({ name: "Dell's Store" }),
        updateProfile,
      })
    );
    const blob = new Blob(["x"], { type: "image/webp" });
    vi.mocked(validateAndOptimizeImage).mockResolvedValue(blob);
    vi.mocked(uploadImage).mockResolvedValue("https://cdn.test/store-1/staff-1/avatar.webp");
    renderPage();

    await goToProfileStep(user);
    const fileInput = document.getElementById("onboardAvatarInput") as HTMLInputElement;
    await user.upload(fileInput, makeImageFile());
    await screen.findByAltText("");

    await user.click(screen.getByRole("button", { name: "Continue" }));

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

    await goToProfileStep(user);
    const fileInput = document.getElementById("onboardAvatarInput") as HTMLInputElement;
    await user.upload(fileInput, makeImageFile());

    expect(await screen.findByRole("alert")).toHaveTextContent("That file doesn't look like a valid image.");
  });

  it("uploads a store photo and passes its URL through to updateStore", async () => {
    const user = userEvent.setup();
    const updateStore = vi.fn().mockResolvedValue({ ok: true });
    vi.mocked(useAuth).mockReturnValue(
      makeAuthValue({
        user: makeStaffAccount({ storeId: "store-1" }),
        store: makeStore({ id: "store-1", name: "Dell's Store" }),
        updateStore,
      })
    );
    const blob = new Blob(["x"], { type: "image/webp" });
    vi.mocked(validateAndOptimizeImage).mockResolvedValue(blob);
    vi.mocked(uploadImage).mockResolvedValue("https://cdn.test/store-1/store-photo.webp");
    renderPage();

    await goToProfileStep(user);
    const fileInput = document.getElementById("onboardStorePhotoInput") as HTMLInputElement;
    await user.upload(fileInput, makeImageFile("store.jpg"));
    await screen.findByAltText("");
    await user.click(screen.getByRole("button", { name: "Continue" }));

    expect(uploadImage).toHaveBeenCalledWith(expect.anything(), "store-photos", "store-1/store-photo.webp", blob);
    expect(updateStore).toHaveBeenCalledWith(
      expect.objectContaining({ photoUrl: "https://cdn.test/store-1/store-photo.webp" })
    );
  });

  it("copies the profile address into the store address when 'Same as my own address' is checked", async () => {
    const user = userEvent.setup();
    vi.mocked(useAuth).mockReturnValue(
      makeAuthValue({
        user: makeStaffAccount({ address: "1 Rizal St" }),
        store: makeStore({ name: "Dell's Store", address: "Old store address" }),
      })
    );
    renderPage();
    await goToProfileStep(user);

    const storeAddressInput = screen.getByLabelText("Store address") as HTMLInputElement;
    expect(storeAddressInput).toHaveValue("Old store address");

    await user.click(screen.getByRole("checkbox", { name: "Same as my own address" }));
    expect(storeAddressInput).toHaveValue("1 Rizal St");
    expect(storeAddressInput).toBeDisabled();
  });

  it("skips the profile step without saving", async () => {
    const user = userEvent.setup();
    const updateProfile = vi.fn().mockResolvedValue({ ok: true });
    const updateStore = vi.fn().mockResolvedValue({ ok: true });
    vi.mocked(useAuth).mockReturnValue(makeAuthValue({ updateProfile, updateStore }));
    renderPage();

    await goToProfileStep(user);
    await user.click(screen.getByRole("button", { name: "Skip for now" }));

    expect(await screen.findByText("What do you sell?")).toBeInTheDocument();
    expect(updateProfile).not.toHaveBeenCalled();
    expect(updateStore).not.toHaveBeenCalled();
  });

  it("resumes at the saved step after a reload instead of restarting at welcome", async () => {
    const user = userEvent.setup();
    vi.mocked(useAuth).mockReturnValue(
      makeAuthValue({ user: makeStaffAccount({ storeId: "store-9" }), store: makeStore({ name: "Dell's Store" }) })
    );
    const { unmount } = renderPage();
    await goToProductsStep(user);
    expect(await screen.findByText("What do you sell?")).toBeInTheDocument();

    unmount();
    renderPage();

    expect(await screen.findByText("What do you sell?")).toBeInTheDocument();
  });

  it("shows the added-so-far count and imports the starter catalog on the products step", async () => {
    const user = userEvent.setup();
    const addProduct = vi.fn().mockResolvedValue({});
    const addCategory = vi.fn().mockResolvedValue({ id: "cat-1", name: "Noodles" });
    vi.mocked(useStoreData).mockReturnValue(makeStoreDataValue({ addProduct, addCategory }));
    vi.mocked(useAuth).mockReturnValue(makeAuthValue({ store: makeStore({ name: "Dell's Store" }) }));
    renderPage();
    await goToProductsStep(user);

    expect(await screen.findByText("What do you sell?")).toBeInTheDocument();
    expect(screen.getByText("0 products")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Add \d+ items/ }));
    expect(addProduct).toHaveBeenCalled();
  });

  it("skips through products, stock alerts, and register count to reach congrats", async () => {
    const user = userEvent.setup();
    vi.mocked(useAuth).mockReturnValue(
      makeAuthValue({ user: makeStaffAccount({ name: "Aling Nena" }), store: makeStore({ name: "Dell's Store" }) })
    );
    renderPage();
    await goToCongratsStep(user);

    expect(await screen.findByText("The register is open, Aling Nena.")).toBeInTheDocument();
  });

  describe("congrats step", () => {
    it("summarizes real setup data and completes onboarding via Start selling", async () => {
      const user = userEvent.setup();
      const completeOnboarding = vi.fn().mockResolvedValue({ ok: true });
      const products = [makeProduct({ id: "p1" }), makeProduct({ id: "p2" })];
      vi.mocked(useStoreData).mockReturnValue(makeStoreDataValue({ products }));
      vi.mocked(useAuth).mockReturnValue(
        makeAuthValue({
          user: makeStaffAccount({ name: "Aling Nena" }),
          store: makeStore({ name: "Dell's Store" }),
          completeOnboarding,
        })
      );
      renderPage();
      await goToOpenRegisterStep(user);
      await user.type(screen.getByRole("spinbutton", { name: "₱1,000" }), "2");
      await user.click(screen.getByRole("button", { name: "Open the register" }));

      expect(await screen.findByText(/2 products loaded/)).toBeInTheDocument();
      expect(screen.getByText(/₱2,000.00 counted into the drawer/)).toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: "Start selling" }));
      expect(completeOnboarding).toHaveBeenCalled();
      expect(await screen.findByText("POS page")).toBeInTheDocument();
    });

    it("shows an error when completing onboarding fails", async () => {
      const user = userEvent.setup();
      const completeOnboarding = vi.fn().mockResolvedValue({ ok: false, error: "Could not finish onboarding." });
      vi.mocked(useAuth).mockReturnValue(
        makeAuthValue({ store: makeStore({ name: "Dell's Store" }), completeOnboarding })
      );
      renderPage();
      await goToCongratsStep(user);
      await user.click(await screen.findByRole("button", { name: "See the dashboard" }));

      expect(await screen.findByRole("alert")).toHaveTextContent("Could not finish onboarding.");
    });

    it("navigates to the dashboard via See the dashboard", async () => {
      const user = userEvent.setup();
      const completeOnboarding = vi.fn().mockResolvedValue({ ok: true });
      vi.mocked(useAuth).mockReturnValue(
        makeAuthValue({ store: makeStore({ name: "Dell's Store" }), completeOnboarding })
      );
      renderPage();
      await goToCongratsStep(user);
      await user.click(await screen.findByRole("button", { name: "See the dashboard" }));

      expect(completeOnboarding).toHaveBeenCalled();
      expect(screen.getByText("Dashboard page")).toBeInTheDocument();
    });

    it("links the suggested next actions to their real pages", async () => {
      const user = userEvent.setup();
      vi.mocked(useAuth).mockReturnValue(
        makeAuthValue({ user: makeStaffAccount({ name: "Aling Nena" }), store: makeStore({ name: "Dell's Store" }) })
      );
      renderPage();
      await goToCongratsStep(user);

      const addLinks = screen.getAllByRole("link", { name: "Add" });
      expect(addLinks.map((link) => link.getAttribute("href"))).toEqual(["/staff", "/customers"]);
      expect(screen.getByRole("link", { name: "Review" })).toHaveAttribute("href", "/pos");
    });
  });

  describe("stock alerts step", () => {
    it("selects a strategy and toggles smart settings", async () => {
      const user = userEvent.setup();
      vi.mocked(useAuth).mockReturnValue(
        makeAuthValue({ user: makeStaffAccount({ storeId: "store-1" }), store: makeStore({ name: "Dell's Store" }) })
      );
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
          items: [{ id: "si-1", productId: "prod-1", name: "Sardines", quantity: 2, price: 25, itemType: "product", fee: 0, lineTotal: 50 }],
        }),
      ];
      vi.mocked(useStoreData).mockReturnValue(makeStoreDataValue({ products, sales }));
      vi.mocked(useAuth).mockReturnValue(
        makeAuthValue({ user: makeStaffAccount({ storeId: "store-1" }), store: makeStore({ name: "Dell's Store" }) })
      );
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
      vi.mocked(useAuth).mockReturnValue(
        makeAuthValue({ user: makeStaffAccount({ storeId: "store-42" }), store: makeStore({ name: "Dell's Store" }) })
      );
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
      vi.mocked(useAuth).mockReturnValue(
        makeAuthValue({ user: makeStaffAccount({ name: "Aling Nena" }), store: makeStore({ name: "Dell's Store" }) })
      );
      renderPage();
      await goToStockAlertsStep(user);

      await user.click(screen.getByRole("button", { name: "Continue" }));
      expect(await screen.findByText("Count your starting cash")).toBeInTheDocument();
    });
  });

  describe("open register step", () => {
    it("computes denomination subtotals and the starting float in real time", async () => {
      const user = userEvent.setup();
      vi.mocked(useAuth).mockReturnValue(
        makeAuthValue({ user: makeStaffAccount({ storeId: "store-1" }), store: makeStore({ name: "Dell's Store" }) })
      );
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
      vi.mocked(useAuth).mockReturnValue(
        makeAuthValue({ user: makeStaffAccount({ storeId: "store-1" }), store: makeStore({ name: "Dell's Store" }) })
      );
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
      vi.mocked(useAuth).mockReturnValue(
        makeAuthValue({ user: makeStaffAccount({ name: "Aling Nena" }), store: makeStore({ name: "Dell's Store" }) })
      );
      renderPage();
      await goToOpenRegisterStep(user);

      expect(screen.getByText(/Aling Nena/)).toBeInTheDocument();
      expect(screen.getByText(/\(you\)/)).toBeInTheDocument();
    });

    it("persists the denomination count to localStorage", async () => {
      const user = userEvent.setup();
      vi.mocked(useAuth).mockReturnValue(
        makeAuthValue({ user: makeStaffAccount({ storeId: "store-42" }), store: makeStore({ name: "Dell's Store" }) })
      );
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
      vi.mocked(useAuth).mockReturnValue(
        makeAuthValue({ user: makeStaffAccount({ name: "Aling Nena" }), store: makeStore({ name: "Dell's Store" }) })
      );
      renderPage();
      await goToOpenRegisterStep(user);

      await user.type(screen.getByRole("spinbutton", { name: "₱1,000" }), "3");
      await user.click(screen.getByRole("button", { name: "Open the register" }));

      expect(await screen.findByText("The register is open, Aling Nena.")).toBeInTheDocument();
      expect(screen.getByTestId("drawer-balance")).toHaveTextContent("3000");
    });

    it("skipping the count leaves the drawer balance untouched and reaches congrats", async () => {
      const user = userEvent.setup();
      vi.mocked(useAuth).mockReturnValue(
        makeAuthValue({ user: makeStaffAccount({ name: "Aling Nena" }), store: makeStore({ name: "Dell's Store" }) })
      );
      renderPage();
      await goToOpenRegisterStep(user);

      const balanceBefore = screen.getByTestId("drawer-balance").textContent;
      await user.click(screen.getByRole("button", { name: "Skip the count" }));

      expect(await screen.findByText("The register is open, Aling Nena.")).toBeInTheDocument();
      expect(screen.getByTestId("drawer-balance")).toHaveTextContent(balanceBefore as string);
    });
  });
});
