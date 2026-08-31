import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { SettingsStoreScreen } from "../settingsstorescreen";
import { useAuth } from "../../lib/auth";
import { loadOpeningHours, saveOpeningHours } from "../../lib/onboardingSettings";
import { pickAndOptimizeImage, uploadImage } from "../../lib/imageUpload";
import type { Store } from "../../lib/types";

jest.mock("../../lib/auth", () => ({ useAuth: jest.fn() }));
jest.mock("../../lib/onboardingSettings", () => ({
  ...jest.requireActual("../../lib/onboardingSettings"),
  loadOpeningHours: jest.fn(),
  saveOpeningHours: jest.fn(),
}));
jest.mock("../../lib/imageUpload", () => ({
  pickAndOptimizeImage: jest.fn(),
  uploadImage: jest.fn(),
}));

const mockedUseAuth = useAuth as jest.Mock;
const mockedLoadHours = loadOpeningHours as jest.Mock;
const mockedSaveHours = saveOpeningHours as jest.Mock;
const mockedPick = pickAndOptimizeImage as jest.Mock;
const mockedUpload = uploadImage as jest.Mock;

const HOURS = { openTime: "06:00", closeTime: "21:00" };

function store(overrides: Partial<Store> = {}): Store {
  return {
    id: "st1",
    name: "Dell's Sari-Sari Store",
    address: "14 Sampaguita St., Brgy. San Isidro",
    photoUrl: null,
    contactNumber: "09175550188",
    city: "Quezon City",
    tin: "123-456-789-000",
    businessPermitNo: "QC-2026-08841",
    birRegistered: true,
    feeConfig: null,
    ...overrides,
  };
}

function setup(overrides: { store?: Store; updateStore?: jest.Mock } = {}) {
  const updateStore = overrides.updateStore ?? jest.fn().mockResolvedValue({ ok: true });
  mockedUseAuth.mockReturnValue({ store: overrides.store ?? store(), updateStore });
  const onBack = jest.fn();
  render(<SettingsStoreScreen onBack={onBack} />);
  return { onBack, updateStore };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockedLoadHours.mockResolvedValue(HOURS);
  mockedSaveHours.mockResolvedValue(undefined);
});

describe("SettingsStoreScreen", () => {
  it("shows the real store's fields, not the mockup's placeholder values", async () => {
    setup();
    await waitFor(() => expect(mockedLoadHours).toHaveBeenCalledWith("st1"));
    expect(screen.getByLabelText("Store name").props.value).toBe("Dell's Sari-Sari Store");
    expect(screen.getByLabelText("Contact number").props.value).toBe("09175550188");
    expect(screen.getByLabelText("City").props.value).toBe("Quezon City");
    expect(screen.getByLabelText("TIN").props.value).toBe("123-456-789-000");
    expect(screen.getByLabelText("Permit no.").props.value).toBe("QC-2026-08841");
  });

  it("loads opening hours from storage for this store", async () => {
    setup();
    await waitFor(() => expect(screen.getByLabelText("Opens at").props.value).toBe("06:00"));
    expect(screen.getByLabelText("Closes at").props.value).toBe("21:00");
  });

  it("saves the real fields through updateStore and the hours to storage", async () => {
    const { updateStore } = setup();
    await waitFor(() => expect(mockedLoadHours).toHaveBeenCalled());

    fireEvent.changeText(screen.getByLabelText("City"), "Makati City");
    fireEvent.press(screen.getByText("Save changes"));

    await waitFor(() =>
      expect(updateStore).toHaveBeenCalledWith(
        expect.objectContaining({ name: "Dell's Sari-Sari Store", city: "Makati City", birRegistered: true })
      )
    );
    expect(mockedSaveHours).toHaveBeenCalledWith("st1", HOURS);
  });

  it("surfaces a permission failure and keeps the operator's edits", async () => {
    // The exact case updateStore's RLS guard exists for: an empty result
    // set from a silently-filtered write, reported as a real error.
    const updateStore = jest
      .fn()
      .mockResolvedValue({ ok: false, error: "You don't have permission to update store settings." });
    setup({ updateStore });
    await waitFor(() => expect(mockedLoadHours).toHaveBeenCalled());

    fireEvent.changeText(screen.getByLabelText("City"), "Makati City");
    fireEvent.press(screen.getByText("Save changes"));

    expect(await screen.findByText("You don't have permission to update store settings.")).toBeTruthy();
    expect(screen.getByLabelText("City").props.value).toBe("Makati City");
    // The mock half must not be written when the real half was refused.
    expect(mockedSaveHours).not.toHaveBeenCalled();
  });

  it("rejects an empty store name without calling updateStore", async () => {
    const { updateStore } = setup();
    await waitFor(() => expect(mockedLoadHours).toHaveBeenCalled());

    fireEvent.changeText(screen.getByLabelText("Store name"), "   ");
    fireEvent.press(screen.getByText("Save changes"));

    expect(await screen.findByText("Store name is required.")).toBeTruthy();
    expect(updateStore).not.toHaveBeenCalled();
  });

  it("uploads a picked logo to the store-photos bucket and saves its URL", async () => {
    mockedPick.mockResolvedValue({ uri: "file:///tmp/logo.jpg", base64: "x", contentType: "image/jpeg" });
    mockedUpload.mockResolvedValue("https://cdn.test/store-photo.jpg");
    const { updateStore } = setup();
    await waitFor(() => expect(mockedLoadHours).toHaveBeenCalled());

    fireEvent.press(screen.getByText("Change logo"));
    await waitFor(() => expect(mockedPick).toHaveBeenCalled());
    fireEvent.press(screen.getByText("Save changes"));

    await waitFor(() =>
      expect(mockedUpload).toHaveBeenCalledWith(
        "store-photos",
        "st1/store-photo.jpg",
        expect.objectContaining({ uri: "file:///tmp/logo.jpg" })
      )
    );
    expect(updateStore).toHaveBeenCalledWith(
      expect.objectContaining({ photoUrl: "https://cdn.test/store-photo.jpg" })
    );
  });

  it("persists the BIR toggle as a real store column", async () => {
    const { updateStore } = setup({ store: store({ birRegistered: false }) });
    await waitFor(() => expect(mockedLoadHours).toHaveBeenCalled());

    fireEvent.press(screen.getByLabelText("Registered with BIR"));
    fireEvent.press(screen.getByText("Save changes"));

    await waitFor(() => expect(updateStore).toHaveBeenCalledWith(expect.objectContaining({ birRegistered: true })));
  });

  it("goes back", async () => {
    const { onBack } = setup();
    await waitFor(() => expect(mockedLoadHours).toHaveBeenCalled());
    fireEvent.press(screen.getByLabelText("Back"));
    expect(onBack).toHaveBeenCalled();
  });
});
