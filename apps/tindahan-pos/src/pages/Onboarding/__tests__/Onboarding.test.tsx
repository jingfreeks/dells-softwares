import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { useAuth, useStoreData, validateAndOptimizeImage, uploadImage } from "@/lib";
import { makeAuthValue, makeStaffAccount, makeStore, makeStoreDataValue } from "../../../test/testUtils";
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

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/onboarding"]}>
      <Routes>
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/admin" element={<p>Dashboard page</p>} />
      </Routes>
    </MemoryRouter>
  );
}

async function goToStoreStep(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: "Let's get started" }));
  await user.click(screen.getByRole("button", { name: "Next: Your store" }));
}

async function goToCongratsStep(user: ReturnType<typeof userEvent.setup>) {
  await goToStoreStep(user);
  await user.click(screen.getByRole("button", { name: "Finish setup" }));
  await user.click(await screen.findByRole("button", { name: "Skip for now" }));
}

describe("Onboarding", () => {
  beforeEach(() => {
    vi.mocked(useStoreData).mockReturnValue(makeStoreDataValue());
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

  it("skips the products step and reaches congrats", async () => {
    const user = userEvent.setup();
    vi.mocked(useAuth).mockReturnValue(makeAuthValue({ user: makeStaffAccount({ name: "Aling Nena" }) }));
    renderPage();
    await goToCongratsStep(user);

    expect(await screen.findByText(/Congratulations, Aling Nena!/)).toBeInTheDocument();
  });
});
