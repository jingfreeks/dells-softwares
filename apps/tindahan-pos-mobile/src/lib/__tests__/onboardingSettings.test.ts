import { clearOnboardingStep, loadOnboardingStep, saveOnboardingStep } from "../onboardingSettings";

jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(),
  setItem: jest.fn().mockResolvedValue(undefined),
  removeItem: jest.fn().mockResolvedValue(undefined),
}));

const mockedAsyncStorage = jest.requireMock("@react-native-async-storage/async-storage") as {
  getItem: jest.Mock;
  setItem: jest.Mock;
  removeItem: jest.Mock;
};

describe("onboarding step persistence", () => {
  beforeEach(() => {
    mockedAsyncStorage.getItem.mockReset();
    mockedAsyncStorage.setItem.mockClear();
    mockedAsyncStorage.removeItem.mockClear();
  });

  it("returns null when nothing has been saved yet", async () => {
    mockedAsyncStorage.getItem.mockResolvedValue(null);
    expect(await loadOnboardingStep("s1")).toBeNull();
  });

  it("saves and loads a step scoped to the store id", async () => {
    await saveOnboardingStep("s1", "products");
    expect(mockedAsyncStorage.setItem).toHaveBeenCalledWith("tindahan-pos-mobile:onboarding-step:s1", "products");

    mockedAsyncStorage.getItem.mockResolvedValue("products");
    expect(await loadOnboardingStep("s1")).toBe("products");
  });

  it("clears the saved step", async () => {
    await clearOnboardingStep("s1");
    expect(mockedAsyncStorage.removeItem).toHaveBeenCalledWith("tindahan-pos-mobile:onboarding-step:s1");
  });

  it("fails open (returns null) if AsyncStorage throws", async () => {
    mockedAsyncStorage.getItem.mockRejectedValue(new Error("boom"));
    expect(await loadOnboardingStep("s1")).toBeNull();
  });
});
