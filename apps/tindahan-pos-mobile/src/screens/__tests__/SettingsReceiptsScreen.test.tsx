import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { SettingsReceiptsScreen } from "../settingsreceiptsscreen";
import { useAuth } from "../../lib/auth";
import { loadReceiptSettingsMock, saveReceiptSettingsMock } from "../../lib/receiptSettingsMock";
import { supabase } from "../../lib/supabaseClient";
import type { Store } from "../../lib/types";

jest.mock("../../lib/auth", () => ({ useAuth: jest.fn() }));
jest.mock("../../lib/receiptSettingsMock", () => ({
  ...jest.requireActual("../../lib/receiptSettingsMock"),
  loadReceiptSettingsMock: jest.fn(),
  saveReceiptSettingsMock: jest.fn(),
}));
jest.mock("../../lib/supabaseClient", () => ({ supabase: { from: jest.fn() } }));

const mockedUseAuth = useAuth as jest.Mock;
const mockedLoad = loadReceiptSettingsMock as jest.Mock;
const mockedSave = saveReceiptSettingsMock as jest.Mock;
const mockedFrom = supabase.from as unknown as jest.Mock;

const SETTINGS = {
  printOnThermal: true,
  offerSmsReceipt: true,
  autoPrintEverySale: false,
  includeLogo: true,
  includeTinAndPermit: true,
  includeCashierName: true,
  includeUtangBalance: true,
  includeQrToPay: false,
  footerMessage: "Salamat po! Balik kayo ulit.",
};

const store: Store = {
  id: "st1",
  name: "Dell's Sari-Sari Store",
  address: "14 Sampaguita St.",
  photoUrl: null,
  contactNumber: "09175550188",
  city: "Quezon City",
  tin: "123-456-789-000",
  businessPermitNo: "QC-2026-08841",
  birRegistered: true,
  feeConfig: null,
};

/** Mimics the PostgREST chain the hook builds, ending in a thenable maybeSingle(). */
function mockSeries(data: { prefix: string; next_number: number } | null) {
  mockedFrom.mockReturnValue({
    select: () => ({
      eq: () => ({
        eq: () => ({ maybeSingle: () => Promise.resolve({ data }) }),
      }),
    }),
  });
}

function setup() {
  mockedUseAuth.mockReturnValue({ store });
  const onBack = jest.fn();
  render(<SettingsReceiptsScreen onBack={onBack} />);
  return { onBack };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockedLoad.mockResolvedValue(SETTINGS);
  mockedSave.mockResolvedValue(undefined);
  mockSeries({ prefix: "OR-2026-", next_number: 38 });
});

describe("SettingsReceiptsScreen", () => {
  it("loads this store's stored toggles rather than showing the defaults blindly", async () => {
    setup();
    await waitFor(() => expect(mockedLoad).toHaveBeenCalledWith("st1"));
    expect(screen.getByLabelText("Footer message").props.value).toBe("Salamat po! Balik kayo ulit.");
  });

  it("shows the real server-controlled next receipt number, zero-padded", async () => {
    setup();
    expect(await screen.findByText("Next: OR-2026-000038")).toBeTruthy();
  });

  it("falls back to the first number for a store that hasn't rung up a sale yet", async () => {
    mockSeries(null);
    setup();
    expect(await screen.findByText("Next: 000001")).toBeTruthy();
  });

  it("persists a toggle change to storage", async () => {
    setup();
    await waitFor(() => expect(mockedLoad).toHaveBeenCalled());

    fireEvent.press(screen.getByLabelText("Offer SMS receipt"));
    fireEvent.press(screen.getByText("Save changes"));

    await waitFor(() =>
      expect(mockedSave).toHaveBeenCalledWith("st1", expect.objectContaining({ offerSmsReceipt: false }))
    );
  });

  it("persists a 'what to include' chip change", async () => {
    setup();
    await waitFor(() => expect(mockedLoad).toHaveBeenCalled());

    fireEvent.press(screen.getByLabelText("QR to pay"));
    fireEvent.press(screen.getByText("Save changes"));

    await waitFor(() =>
      expect(mockedSave).toHaveBeenCalledWith("st1", expect.objectContaining({ includeQrToPay: true }))
    );
  });

  it("caps the footer message at the shared max length", async () => {
    setup();
    await waitFor(() => expect(mockedLoad).toHaveBeenCalled());

    fireEvent.changeText(screen.getByLabelText("Footer message"), "x".repeat(200));

    // 68 is FOOTER_MESSAGE_MAX_LENGTH, shared with the web app's mock.
    expect(screen.getByLabelText("Footer message").props.value).toHaveLength(68);
    expect(screen.getByText("0 characters left")).toBeTruthy();
  });

  it("reverts every pending change on discard", async () => {
    setup();
    await waitFor(() => expect(mockedLoad).toHaveBeenCalled());

    fireEvent.changeText(screen.getByLabelText("Footer message"), "Changed");
    fireEvent.press(screen.getByText("Discard"));

    expect(screen.getByLabelText("Footer message").props.value).toBe("Salamat po! Balik kayo ulit.");
    expect(mockedSave).not.toHaveBeenCalled();
  });

  it("previews the store's own details, not the mockup's sample shop", async () => {
    setup();
    await waitFor(() => expect(mockedLoad).toHaveBeenCalled());
    expect(screen.getByText("DELL'S SARI-SARI STORE")).toBeTruthy();
    expect(screen.getByText("14 Sampaguita St., Quezon City")).toBeTruthy();
  });

  it("drops the store name from the preview when the logo is switched off", async () => {
    setup();
    await waitFor(() => expect(mockedLoad).toHaveBeenCalled());

    fireEvent.press(screen.getByLabelText("Logo"));

    expect(screen.queryByText("DELL'S SARI-SARI STORE")).toBeNull();
  });

  it("goes back", async () => {
    const { onBack } = setup();
    await waitFor(() => expect(mockedLoad).toHaveBeenCalled());
    fireEvent.press(screen.getByLabelText("Back"));
    expect(onBack).toHaveBeenCalled();
  });

describe("alpha/test print guardrails", () => {
  it("stamps both mandatory disclaimers on the preview", async () => {
    setup();
    await waitFor(() => expect(mockedLoad).toHaveBeenCalled());

    // The preview and the printed document share one source (§8), so
    // what is asserted here is what would print.
    expect(screen.getByLabelText("*** TEST MODE / TRAINING ONLY ***")).toBeTruthy();
    expect(screen.getByLabelText("*** NOT AN OFFICIAL BIR INVOICE/RECEIPT ***")).toBeTruthy();
  });

  it("calls the document an ORDER SLIP, never a receipt or invoice", async () => {
    setup();
    await waitFor(() => expect(mockedLoad).toHaveBeenCalled());
    expect(screen.getByText("ORDER SLIP")).toBeTruthy();
  });

  it("locks TIN and permit so a tester cannot dress the slip up as official", async () => {
    setup();
    await waitFor(() => expect(mockedLoad).toHaveBeenCalled());

    const chip = screen.getByLabelText("TIN & permit (unavailable in test mode)");
    expect(chip.props.accessibilityState.disabled).toBe(true);
  });
});
});
