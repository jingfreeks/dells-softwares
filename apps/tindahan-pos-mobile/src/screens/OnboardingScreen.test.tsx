import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { OnboardingScreen } from "./OnboardingScreen";
import { useAuth } from "../lib/auth";
import { useStoreData } from "../lib/storeData";
import { pickAndOptimizeImage, uploadImage } from "../lib/imageUpload";

jest.mock("../lib/auth", () => ({ useAuth: jest.fn() }));
jest.mock("../lib/storeData", () => ({ useStoreData: jest.fn() }));
jest.mock("../lib/imageUpload", () => ({
  pickAndOptimizeImage: jest.fn().mockResolvedValue(null),
  uploadImage: jest.fn().mockResolvedValue("https://example.com/image.jpg"),
}));
jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
  removeItem: jest.fn().mockResolvedValue(undefined),
}));

const mockedUseAuth = useAuth as jest.Mock;
const mockedUseStoreData = useStoreData as jest.Mock;
const mockedPickAndOptimizeImage = pickAndOptimizeImage as jest.Mock;
const mockedUploadImage = uploadImage as jest.Mock;
const mockedAsyncStorage = jest.requireMock("@react-native-async-storage/async-storage") as {
  getItem: jest.Mock;
  setItem: jest.Mock;
  removeItem: jest.Mock;
};

function setup(overrides: { updateProfile?: jest.Mock; updateStore?: jest.Mock; completeOnboarding?: jest.Mock } = {}) {
  const updateProfile = overrides.updateProfile ?? jest.fn().mockResolvedValue({ ok: true });
  const updateStore = overrides.updateStore ?? jest.fn().mockResolvedValue({ ok: true });
  const completeOnboarding = overrides.completeOnboarding ?? jest.fn().mockResolvedValue({ ok: true });

  mockedUseAuth.mockReturnValue({
    user: { id: "u1", storeId: "s1", name: "Lyndell", email: "a@b.com", role: "admin", avatarUrl: null, phone: null, address: null, onboardedAt: null },
    store: { id: "s1", name: "Dell's Store", address: null, photoUrl: null },
    updateProfile,
    updateStore,
    completeOnboarding,
  });
  mockedUseStoreData.mockReturnValue({
    products: [],
    categories: [],
    sales: [],
    customers: [],
    loading: false,
    error: null,
    addProduct: jest.fn().mockResolvedValue({}),
    addCategory: jest.fn().mockResolvedValue({ id: "c1", name: "Grocery" }),
  });

  render(<OnboardingScreen />);
  return { updateProfile, updateStore, completeOnboarding };
}

describe("OnboardingScreen", () => {
  beforeEach(() => {
    mockedAsyncStorage.getItem.mockResolvedValue(null);
    mockedAsyncStorage.setItem.mockClear();
    mockedAsyncStorage.removeItem.mockClear();
    mockedPickAndOptimizeImage.mockReset().mockResolvedValue(null);
    mockedUploadImage.mockReset().mockResolvedValue("https://example.com/image.jpg");
  });

  it("uploads a picked avatar and store photo and forwards their URLs to updateProfile/updateStore", async () => {
    mockedPickAndOptimizeImage.mockResolvedValue({ uri: "file:///tmp/pic.jpg", base64: "abc", contentType: "image/jpeg" });
    const { updateProfile, updateStore } = setup();

    fireEvent.press(screen.getByRole("button", { name: "Start setup" }));
    await screen.findByText("Tell us about you and your shop");

    fireEvent.press(screen.getByRole("button", { name: "Add your photo" }));
    fireEvent.press(screen.getByRole("button", { name: "Add store logo" }));
    await waitFor(() => expect(mockedPickAndOptimizeImage).toHaveBeenCalledTimes(2));

    fireEvent.press(screen.getByRole("button", { name: "Continue" }));

    await waitFor(() =>
      expect(mockedUploadImage).toHaveBeenCalledWith("avatars", "s1/u1/avatar.jpg", expect.objectContaining({ uri: "file:///tmp/pic.jpg" }))
    );
    expect(mockedUploadImage).toHaveBeenCalledWith("store-photos", "s1/store-photo.jpg", expect.objectContaining({ uri: "file:///tmp/pic.jpg" }));
    await waitFor(() =>
      expect(updateProfile).toHaveBeenCalledWith(expect.objectContaining({ avatarUrl: "https://example.com/image.jpg" }))
    );
    expect(updateStore).toHaveBeenCalledWith(expect.objectContaining({ photoUrl: "https://example.com/image.jpg" }));
  });

  it("shows a friendly error and does not block the rest of the form when picking a photo fails", async () => {
    mockedPickAndOptimizeImage.mockRejectedValue(new Error("That image is too large (max 8MB)."));
    setup();

    fireEvent.press(screen.getByRole("button", { name: "Start setup" }));
    await screen.findByText("Tell us about you and your shop");
    fireEvent.press(screen.getByRole("button", { name: "Add your photo" }));

    expect(await screen.findByText("That image is too large (max 8MB).")).toBeTruthy();
  });

  it("resumes at the saved step instead of restarting at Welcome", async () => {
    mockedAsyncStorage.getItem.mockImplementation((key: string) =>
      Promise.resolve(key.startsWith("tindahan-pos-mobile:onboarding-step:") ? "stockAlerts" : null)
    );
    setup();

    expect(await screen.findByText("When should we warn you?")).toBeTruthy();
  });

  it("clears the saved step once onboarding actually finishes", async () => {
    const { completeOnboarding } = setup({ completeOnboarding: jest.fn().mockResolvedValue({ ok: true }) });

    fireEvent.press(screen.getByRole("button", { name: "Start setup" }));
    await screen.findByText("Tell us about you and your shop");
    fireEvent.press(screen.getByRole("button", { name: "Continue" }));
    await screen.findByText("What do you sell?");
    fireEvent.press(screen.getByRole("button", { name: "Skip" }));
    await screen.findByText("When should we warn you?");
    fireEvent.press(screen.getByRole("button", { name: "Skip" }));
    await screen.findByText("Count your starting cash");
    fireEvent.press(screen.getByText("Skip the count"));
    await screen.findByText(/The register is open/);
    fireEvent.press(screen.getByRole("button", { name: "Start selling" }));

    await waitFor(() => expect(completeOnboarding).toHaveBeenCalledTimes(1));
    await waitFor(() =>
      expect(mockedAsyncStorage.removeItem).toHaveBeenCalledWith("tindahan-pos-mobile:onboarding-step:s1")
    );
  });

  it("walks Welcome -> Profile -> skip through to Done and finishes", async () => {
    const { updateProfile, updateStore, completeOnboarding } = setup();

    fireEvent.press(screen.getByRole("button", { name: "Start setup" }));
    expect(await screen.findByText("Tell us about you and your shop")).toBeTruthy();

    fireEvent.press(screen.getByRole("button", { name: "Continue" }));

    await waitFor(() => expect(updateProfile).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Lyndell" })
    ));
    expect(updateStore).toHaveBeenCalledWith(expect.objectContaining({ name: "Dell's Store" }));

    expect(await screen.findByText("What do you sell?")).toBeTruthy();
    fireEvent.press(screen.getByRole("button", { name: "Skip" }));

    expect(await screen.findByText("When should we warn you?")).toBeTruthy();
    fireEvent.press(screen.getByRole("button", { name: "Skip" }));

    expect(await screen.findByText("Count your starting cash")).toBeTruthy();
    fireEvent.press(screen.getByText("Skip the count"));

    expect(await screen.findByText(/The register is open/)).toBeTruthy();
    fireEvent.press(screen.getByRole("button", { name: "Start selling" }));

    await waitFor(() => expect(completeOnboarding).toHaveBeenCalledTimes(1));
  });

  it("shows a profile error and does not advance when the name is missing", async () => {
    setup();
    fireEvent.press(screen.getByRole("button", { name: "Start setup" }));
    await screen.findByText("Tell us about you and your shop");

    fireEvent.changeText(screen.getByLabelText("Your name"), "");
    fireEvent.press(screen.getByRole("button", { name: "Continue" }));

    expect(await screen.findByText("Your name is required.")).toBeTruthy();
  });
});
