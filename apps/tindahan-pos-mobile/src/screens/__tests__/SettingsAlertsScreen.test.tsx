import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { SettingsAlertsScreen } from "../settingsalertsscreen";
import { useAuth } from "../../lib/auth";
import { loadAlertsMock, saveAlertsMock } from "../../lib/alertsMock";
import { loadFeesLimitsMock, saveFeesLimitsMock } from "../../lib/feesLimitsMock";
import { loadStockAlertSettings, saveStockAlertSettings } from "../../lib/onboardingSettings";
import type { Store } from "../../lib/types";

jest.mock("../../lib/auth", () => ({ useAuth: jest.fn() }));
jest.mock("../../lib/alertsMock", () => ({
  ...jest.requireActual("../../lib/alertsMock"),
  loadAlertsMock: jest.fn(),
  saveAlertsMock: jest.fn(),
}));
jest.mock("../../lib/feesLimitsMock", () => ({
  ...jest.requireActual("../../lib/feesLimitsMock"),
  loadFeesLimitsMock: jest.fn(),
  saveFeesLimitsMock: jest.fn(),
}));
jest.mock("../../lib/onboardingSettings", () => ({
  ...jest.requireActual("../../lib/onboardingSettings"),
  loadStockAlertSettings: jest.fn(),
  saveStockAlertSettings: jest.fn(),
}));

const mockedUseAuth = useAuth as jest.Mock;
const mockedLoadAlerts = loadAlertsMock as jest.Mock;
const mockedSaveAlerts = saveAlertsMock as jest.Mock;
const mockedLoadFees = loadFeesLimitsMock as jest.Mock;
const mockedSaveFees = saveFeesLimitsMock as jest.Mock;
const mockedLoadStock = loadStockAlertSettings as jest.Mock;
const mockedSaveStock = saveStockAlertSettings as jest.Mock;

const ALERTS = {
  warnOutOfStockImmediately: true,
  drawerVarianceThreshold: 20,
  utangAgingThresholdDays: 30,
  alertOnVoidAfterPayment: true,
  pushEnabled: true,
  smsEnabled: true,
  emailEnabled: false,
  dailySummaryTime: "07:00",
  quietHoursStart: "21:00",
  quietHoursEnd: "06:00",
};
const STOCK = { thresholdDays: 3, fastMoverBoost: true, dailySummary: true };
const FEES = {
  printBw: 3,
  printColour: 12,
  photocopy: 2,
  bulkFromPages: 10,
  keepInDrawer: 2000,
  defaultCreditLimit: 500,
  cashierCashOutCap: 1000,
  blockUtangPastLimit: false,
  voidNeedsPin: false,
  warnLowEloadFloat: false,
};

const store: Store = {
  id: "st1",
  name: "Dell's Sari-Sari Store",
  address: null,
  photoUrl: null,
  contactNumber: null,
  city: null,
  tin: null,
  businessPermitNo: null,
  birRegistered: false,
  feeConfig: null,
};

function setup() {
  mockedUseAuth.mockReturnValue({ store });
  const onBack = jest.fn();
  render(<SettingsAlertsScreen onBack={onBack} />);
  return { onBack };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockedLoadAlerts.mockResolvedValue(ALERTS);
  mockedLoadStock.mockResolvedValue(STOCK);
  mockedLoadFees.mockResolvedValue(FEES);
  mockedSaveAlerts.mockResolvedValue(undefined);
  mockedSaveStock.mockResolvedValue(undefined);
  mockedSaveFees.mockResolvedValue(undefined);
});

describe("SettingsAlertsScreen", () => {
  it("loads all three stores this screen stitches together", async () => {
    setup();
    await waitFor(() => {
      expect(mockedLoadAlerts).toHaveBeenCalledWith("st1");
      expect(mockedLoadStock).toHaveBeenCalledWith("st1");
      expect(mockedLoadFees).toHaveBeenCalledWith("st1");
    });
    expect(screen.getByText("3 days of cover")).toBeTruthy();
  });

  it("writes the stock threshold back to the same store the onboarding wizard uses", async () => {
    setup();
    await waitFor(() => expect(mockedLoadStock).toHaveBeenCalled());

    fireEvent.press(screen.getByLabelText("5 days of cover"));
    expect(screen.getByText("5 days of cover")).toBeTruthy();

    fireEvent.press(screen.getByText("Save changes"));
    await waitFor(() =>
      expect(mockedSaveStock).toHaveBeenCalledWith("st1", expect.objectContaining({ thresholdDays: 5 }))
    );
  });

  it("writes the e-load float warning back to the fees store, not the alerts one", async () => {
    setup();
    await waitFor(() => expect(mockedLoadFees).toHaveBeenCalled());

    fireEvent.press(screen.getByLabelText("E-load float running low"));
    fireEvent.press(screen.getByText("Save changes"));

    await waitFor(() =>
      expect(mockedSaveFees).toHaveBeenCalledWith("st1", expect.objectContaining({ warnLowEloadFloat: true }))
    );
    // It must not leak into the alerts store -- the two keys stay separate,
    // matching how the web app splits these same settings.
    expect(mockedSaveAlerts.mock.calls[0][1]).not.toHaveProperty("warnLowEloadFloat");
  });

  it("persists a money threshold as a number, ignoring the currency prefix", async () => {
    setup();
    await waitFor(() => expect(mockedLoadAlerts).toHaveBeenCalled());

    fireEvent.changeText(screen.getByLabelText("Drawer off by more than"), "₱50");
    fireEvent.press(screen.getByText("Save changes"));

    await waitFor(() =>
      expect(mockedSaveAlerts).toHaveBeenCalledWith("st1", expect.objectContaining({ drawerVarianceThreshold: 50 }))
    );
  });

  it("keeps a cleared numeric field as 0 rather than NaN", async () => {
    setup();
    await waitFor(() => expect(mockedLoadAlerts).toHaveBeenCalled());

    fireEvent.changeText(screen.getByLabelText("Utang older than"), "");
    fireEvent.press(screen.getByText("Save changes"));

    await waitFor(() =>
      expect(mockedSaveAlerts).toHaveBeenCalledWith("st1", expect.objectContaining({ utangAgingThresholdDays: 0 }))
    );
  });

  it("toggles a notification channel", async () => {
    setup();
    await waitFor(() => expect(mockedLoadAlerts).toHaveBeenCalled());

    fireEvent.press(screen.getByLabelText("Email"));
    fireEvent.press(screen.getByText("Save changes"));

    await waitFor(() =>
      expect(mockedSaveAlerts).toHaveBeenCalledWith("st1", expect.objectContaining({ emailEnabled: true }))
    );
  });

  it("reverts changes across all three stores on discard", async () => {
    setup();
    await waitFor(() => expect(mockedLoadStock).toHaveBeenCalled());

    fireEvent.press(screen.getByLabelText("6 days of cover"));
    fireEvent.press(screen.getByLabelText("E-load float running low"));
    fireEvent.press(screen.getByText("Discard"));

    expect(screen.getByText("3 days of cover")).toBeTruthy();
    expect(mockedSaveStock).not.toHaveBeenCalled();
    expect(mockedSaveFees).not.toHaveBeenCalled();
  });

  it("goes back", async () => {
    const { onBack } = setup();
    await waitFor(() => expect(mockedLoadAlerts).toHaveBeenCalled());
    fireEvent.press(screen.getByLabelText("Back"));
    expect(onBack).toHaveBeenCalled();
  });
});
