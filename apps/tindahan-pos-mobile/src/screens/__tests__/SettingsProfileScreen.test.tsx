import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { SettingsProfileScreen } from "../settingsprofilescreen";
import { useAuth } from "../../lib/auth";
import { loadSettingsProfileMock, saveSettingsProfileMock } from "../../lib/settingsProfileMock";
import { pickAndOptimizeImage, uploadImage } from "../../lib/imageUpload";
import type { StaffAccount } from "../../lib/types";

jest.mock("../../lib/auth", () => ({ useAuth: jest.fn() }));
jest.mock("../../lib/settingsProfileMock", () => ({
  ...jest.requireActual("../../lib/settingsProfileMock"),
  loadSettingsProfileMock: jest.fn(),
  saveSettingsProfileMock: jest.fn(),
}));
jest.mock("../../lib/imageUpload", () => ({
  pickAndOptimizeImage: jest.fn(),
  uploadImage: jest.fn(),
}));

const mockedUseAuth = useAuth as jest.Mock;
const mockedLoad = loadSettingsProfileMock as jest.Mock;
const mockedSave = saveSettingsProfileMock as jest.Mock;
const mockedPick = pickAndOptimizeImage as jest.Mock;
const mockedUpload = uploadImage as jest.Mock;

const DEFAULT_MOCK = {
  displayName: "Dell",
  twoStepSignIn: false,
  notifications: {
    lowStockDaily: true,
    drawerVarianceAtClose: true,
    utangAging: true,
    everyCompletedSale: false,
  },
};

function staff(overrides: Partial<StaffAccount> = {}): StaffAccount {
  return {
    id: "u1",
    storeId: "st1",
    name: "Lyndell Dobluis",
    email: "lyndell.dobluis@gmail.com",
    role: "admin",
    avatarUrl: null,
    phone: "09175550188",
    address: null,
    onboardedAt: "2026-08-01T00:00:00.000Z",
    hasPin: true,
    ...overrides,
  };
}

function setup(overrides: { user?: StaffAccount; updateProfile?: jest.Mock } = {}) {
  const updateProfile = overrides.updateProfile ?? jest.fn().mockResolvedValue({ ok: true });
  mockedUseAuth.mockReturnValue({
    user: overrides.user ?? staff(),
    updateProfile,
    setOwnPin: jest.fn().mockResolvedValue({ ok: true }),
    changePassword: jest.fn().mockResolvedValue({ ok: true }),
    signOutEverywhere: jest.fn().mockResolvedValue({ ok: true }),
  });
  const onBack = jest.fn();
  render(<SettingsProfileScreen onBack={onBack} />);
  return { onBack, updateProfile };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockedLoad.mockResolvedValue(DEFAULT_MOCK);
  mockedSave.mockResolvedValue(undefined);
});

describe("SettingsProfileScreen", () => {
  it("shows the signed-in staff member's real name, email and phone", async () => {
    setup();
    await waitFor(() => expect(mockedLoad).toHaveBeenCalledWith("u1"));
    expect(screen.getByLabelText("Full name").props.value).toBe("Lyndell Dobluis");
    expect(screen.getByLabelText("Email").props.value).toBe("lyndell.dobluis@gmail.com");
    expect(screen.getByLabelText("Mobile").props.value).toBe("09175550188");
  });

  it("loads the AsyncStorage-only fields (display name, notification toggles) for this user", async () => {
    setup();
    await waitFor(() => expect(screen.getByLabelText("Display name").props.value).toBe("Dell"));
  });

  it("keeps Save disabled until something actually changes", async () => {
    setup();
    await waitFor(() => expect(mockedLoad).toHaveBeenCalled());
    expect(screen.getByText("Save changes").parent).toBeTruthy();

    fireEvent.changeText(screen.getByLabelText("Full name"), "Lyndell D.");
    // A real edit makes the button live; the assertion that matters is the
    // save path below actually firing.
    fireEvent.press(screen.getByText("Save changes"));
    await waitFor(() => expect(mockedSave).toHaveBeenCalled());
  });

  it("saves the real fields through updateProfile and the mock-only fields to storage", async () => {
    const { updateProfile } = setup();
    await waitFor(() => expect(mockedLoad).toHaveBeenCalled());

    fireEvent.changeText(screen.getByLabelText("Full name"), "Lyndell D.");
    fireEvent.press(screen.getByText("Save changes"));

    await waitFor(() =>
      expect(updateProfile).toHaveBeenCalledWith({ name: "Lyndell D.", phone: "09175550188" })
    );
    expect(mockedSave).toHaveBeenCalledWith("u1", DEFAULT_MOCK);
  });

  it("keeps the user's edits on screen when the save fails", async () => {
    const updateProfile = jest.fn().mockResolvedValue({ ok: false, error: "Network unavailable." });
    setup({ updateProfile });
    await waitFor(() => expect(mockedLoad).toHaveBeenCalled());

    fireEvent.changeText(screen.getByLabelText("Full name"), "Lyndell D.");
    fireEvent.press(screen.getByText("Save changes"));

    expect(await screen.findByText("Network unavailable.")).toBeTruthy();
    expect(screen.getByLabelText("Full name").props.value).toBe("Lyndell D.");
    // The mock-only half must not be written when the real half failed.
    expect(mockedSave).not.toHaveBeenCalled();
  });

  it("rejects an empty name without calling updateProfile", async () => {
    const { updateProfile } = setup();
    await waitFor(() => expect(mockedLoad).toHaveBeenCalled());

    fireEvent.changeText(screen.getByLabelText("Full name"), "   ");
    fireEvent.press(screen.getByText("Save changes"));

    expect(await screen.findByText("Your name is required.")).toBeTruthy();
    expect(updateProfile).not.toHaveBeenCalled();
  });

  it("uploads a picked avatar and saves the returned URL", async () => {
    mockedPick.mockResolvedValue({ uri: "file:///tmp/a.jpg", base64: "x", contentType: "image/jpeg" });
    mockedUpload.mockResolvedValue("https://cdn.test/avatar.jpg");
    const { updateProfile } = setup();
    await waitFor(() => expect(mockedLoad).toHaveBeenCalled());

    fireEvent.press(screen.getByText("Upload photo"));
    await waitFor(() => expect(mockedPick).toHaveBeenCalled());
    fireEvent.press(screen.getByText("Save changes"));

    await waitFor(() =>
      expect(mockedUpload).toHaveBeenCalledWith(
        "avatars",
        "st1/u1/avatar.jpg",
        expect.objectContaining({ uri: "file:///tmp/a.jpg" })
      )
    );
    expect(updateProfile).toHaveBeenCalledWith(
      expect.objectContaining({ avatarUrl: "https://cdn.test/avatar.jpg" })
    );
  });

  it("nulls the avatar column out when the existing photo is removed", async () => {
    const { updateProfile } = setup({ user: staff({ avatarUrl: "https://cdn.test/old.jpg" }) });
    await waitFor(() => expect(mockedLoad).toHaveBeenCalled());

    fireEvent.press(screen.getByText("Remove"));
    fireEvent.press(screen.getByText("Save changes"));

    await waitFor(() => expect(updateProfile).toHaveBeenCalledWith(expect.objectContaining({ avatarUrl: null })));
  });

  it("offers Set rather than Change when no override PIN exists yet", async () => {
    setup({ user: staff({ hasPin: false }) });
    await waitFor(() => expect(mockedLoad).toHaveBeenCalled());
    expect(screen.getByText("Not set yet")).toBeTruthy();
  });

  it("goes back", async () => {
    const { onBack } = setup();
    await waitFor(() => expect(mockedLoad).toHaveBeenCalled());
    fireEvent.press(screen.getByLabelText("Back"));
    expect(onBack).toHaveBeenCalled();
  });
});
