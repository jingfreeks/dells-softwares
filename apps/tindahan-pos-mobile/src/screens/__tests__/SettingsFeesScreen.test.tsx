import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { SettingsFeesScreen } from "../settingsfeesscreen";
import { useAuth } from "../../lib/auth";
import { loadFeesLimitsMock, saveFeesLimitsMock } from "../../lib/feesLimitsMock";
import { DEFAULT_ELOAD_FEE_BRACKETS } from "../../lib/fees";
import type { Store } from "../../lib/types";

jest.mock("../../lib/auth", () => ({ useAuth: jest.fn() }));
jest.mock("../../lib/feesLimitsMock", () => ({
  ...jest.requireActual("../../lib/feesLimitsMock"),
  loadFeesLimitsMock: jest.fn(),
  saveFeesLimitsMock: jest.fn(),
}));

const mockedUseAuth = useAuth as jest.Mock;
const mockedLoad = loadFeesLimitsMock as jest.Mock;
const mockedSave = saveFeesLimitsMock as jest.Mock;

const LIMITS = {
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

function store(overrides: Partial<Store> = {}): Store {
  return {
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
    ...overrides,
  };
}

function setup(overrides: { store?: Store; updateStore?: jest.Mock } = {}) {
  const updateStore = overrides.updateStore ?? jest.fn().mockResolvedValue({ ok: true });
  mockedUseAuth.mockReturnValue({ store: overrides.store ?? store(), updateStore });
  const onBack = jest.fn();
  render(<SettingsFeesScreen onBack={onBack} />);
  return { onBack, updateStore };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockedLoad.mockResolvedValue(LIMITS);
  mockedSave.mockResolvedValue(undefined);
});

describe("SettingsFeesScreen", () => {
  it("seeds from the same defaults the register charges when the store has never set fees", async () => {
    setup();
    await waitFor(() => expect(mockedLoad).toHaveBeenCalledWith("st1"));
    // Showing anything else here would tell the operator a number their
    // own register doesn't actually use.
    expect(screen.getByLabelText("E-load fee bracket 1 up to").props.value).toBe(
      String(DEFAULT_ELOAD_FEE_BRACKETS[0].max)
    );
    expect(screen.getByLabelText("E-load fee bracket 1 fee").props.value).toBe(
      `₱${DEFAULT_ELOAD_FEE_BRACKETS[0].fee}`
    );
  });

  it("prefers the store's own saved brackets over the defaults", async () => {
    setup({ store: store({ feeConfig: { eload: [{ max: 25, fee: 4 }] } }) });
    await waitFor(() => expect(mockedLoad).toHaveBeenCalled());
    expect(screen.getByLabelText("E-load fee bracket 1 up to").props.value).toBe("25");
    expect(screen.getByLabelText("E-load fee bracket 1 fee").props.value).toBe("₱4");
  });

  it("saves edited brackets to the real fee_config column", async () => {
    const { updateStore } = setup({ store: store({ feeConfig: { eload: [{ max: 20, fee: 2 }] } }) });
    await waitFor(() => expect(mockedLoad).toHaveBeenCalled());

    fireEvent.changeText(screen.getByLabelText("E-load fee bracket 1 fee"), "₱7");
    fireEvent.press(screen.getByText("Save changes"));

    await waitFor(() =>
      expect(updateStore).toHaveBeenCalledWith(
        expect.objectContaining({
          feeConfig: expect.objectContaining({ eload: [{ max: 20, fee: 7 }] }),
        })
      )
    );
    expect(mockedSave).toHaveBeenCalledWith("st1", LIMITS);
  });

  it("rejects a table whose ceilings don't ascend, without calling updateStore", async () => {
    // feeFromBrackets walks the list in order and returns the first match,
    // so an unordered table would silently misprice every service sale.
    const { updateStore } = setup({
      store: store({ feeConfig: { eload: [{ max: 100, fee: 5 }, { max: 200, fee: 8 }] } }),
    });
    await waitFor(() => expect(mockedLoad).toHaveBeenCalled());

    fireEvent.changeText(screen.getByLabelText("E-load fee bracket 2 up to"), "50");
    fireEvent.press(screen.getByText("Save changes"));

    expect(await screen.findByText("Each bracket must end higher than the one above it.")).toBeTruthy();
    expect(updateStore).not.toHaveBeenCalled();
    expect(mockedSave).not.toHaveBeenCalled();
  });

  it("rejects a zero ceiling", async () => {
    const { updateStore } = setup({ store: store({ feeConfig: { eload: [{ max: 20, fee: 2 }] } }) });
    await waitFor(() => expect(mockedLoad).toHaveBeenCalled());

    fireEvent.changeText(screen.getByLabelText("E-load fee bracket 1 up to"), "0");
    fireEvent.press(screen.getByText("Save changes"));

    expect(await screen.findByText("Fees and amounts must be positive.")).toBeTruthy();
    expect(updateStore).not.toHaveBeenCalled();
  });

  it("adds a bracket above the current top one", async () => {
    setup({ store: store({ feeConfig: { eload: [{ max: 20, fee: 2 }] } }) });
    await waitFor(() => expect(mockedLoad).toHaveBeenCalled());

    fireEvent.press(screen.getByLabelText("Add E-load fee bracket"));

    expect(screen.getByLabelText("E-load fee bracket 2 up to").props.value).toBe("120");
  });

  it("refuses to remove the last bracket, since an empty table silently reverts to defaults", async () => {
    setup({ store: store({ feeConfig: { eload: [{ max: 20, fee: 2 }] } }) });
    await waitFor(() => expect(mockedLoad).toHaveBeenCalled());

    fireEvent.press(screen.getByLabelText("Remove E-load fee bracket 1"));

    expect(screen.getByLabelText("E-load fee bracket 1 up to")).toBeTruthy();
  });

  it("keeps the operator's edits and skips the mock write when the real save is refused", async () => {
    const updateStore = jest
      .fn()
      .mockResolvedValue({ ok: false, error: "You don't have permission to update store settings." });
    setup({ store: store({ feeConfig: { eload: [{ max: 20, fee: 2 }] } }), updateStore });
    await waitFor(() => expect(mockedLoad).toHaveBeenCalled());

    fireEvent.changeText(screen.getByLabelText("E-load fee bracket 1 fee"), "₱9");
    fireEvent.press(screen.getByText("Save changes"));

    expect(await screen.findByText("You don't have permission to update store settings.")).toBeTruthy();
    expect(screen.getByLabelText("E-load fee bracket 1 fee").props.value).toBe("₱9");
    expect(mockedSave).not.toHaveBeenCalled();
  });

  it("persists the mock-only limits alongside the real brackets", async () => {
    setup();
    await waitFor(() => expect(mockedLoad).toHaveBeenCalled());

    fireEvent.press(screen.getByLabelText("Voiding a paid sale needs your PIN"));
    fireEvent.press(screen.getByText("Save changes"));

    await waitFor(() =>
      expect(mockedSave).toHaveBeenCalledWith("st1", expect.objectContaining({ voidNeedsPin: true }))
    );
  });

  it("takes five-figure ceilings and groups the derived lower bound", async () => {
    // Cash-in and cash-out routinely run into the tens of thousands, so
    // the row has to hold the digits, not clip them.
    const { updateStore } = setup({
      store: store({ feeConfig: { cashOut: [{ max: 1000, fee: 25 }, { max: 5000, fee: 50 }] } }),
    });
    await waitFor(() => expect(mockedLoad).toHaveBeenCalled());

    fireEvent.changeText(screen.getByLabelText("Cash-out fee bracket 2 up to"), "25000");
    fireEvent.press(screen.getByText("Save changes"));

    await waitFor(() =>
      expect(updateStore).toHaveBeenCalledWith(
        expect.objectContaining({
          feeConfig: expect.objectContaining({
            cashOut: [{ max: 1000, fee: 25 }, { max: 25000, fee: 50 }],
          }),
        })
      )
    );
    expect(screen.getByText("₱1,001")).toBeTruthy();
    expect(screen.getByText("Anything above ₱25,000 is charged the last fee.")).toBeTruthy();
  });

  it("goes back", async () => {
    const { onBack } = setup();
    await waitFor(() => expect(mockedLoad).toHaveBeenCalled());
    fireEvent.press(screen.getByLabelText("Back"));
    expect(onBack).toHaveBeenCalled();
  });
});
