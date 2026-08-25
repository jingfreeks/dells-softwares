import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { OnboardingScreen } from "./OnboardingScreen";
import { useAuth } from "../lib/auth";
import { useStoreData } from "../lib/storeData";

jest.mock("../lib/auth", () => ({ useAuth: jest.fn() }));
jest.mock("../lib/storeData", () => ({ useStoreData: jest.fn() }));
jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
}));

const mockedUseAuth = useAuth as jest.Mock;
const mockedUseStoreData = useStoreData as jest.Mock;

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
