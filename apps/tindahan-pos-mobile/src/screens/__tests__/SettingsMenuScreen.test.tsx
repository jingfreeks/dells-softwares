import { fireEvent, render, screen } from "@testing-library/react-native";
import { SettingsMenuScreen } from "../settingsmenuscreen";
import { useAuth } from "../../lib/auth";
import type { StaffAccount, Store } from "../../lib/types";

jest.mock("../../lib/auth", () => ({ useAuth: jest.fn() }));

const mockedUseAuth = useAuth as jest.Mock;

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
};

function staff(overrides: Partial<StaffAccount> = {}): StaffAccount {
  return {
    id: "u1",
    storeId: "st1",
    name: "Lyndell Dobluis",
    email: "lyndell.dobluis@gmail.com",
    role: "admin",
    avatarUrl: null,
    phone: null,
    address: null,
    onboardedAt: "2026-08-01T00:00:00.000Z",
    hasPin: false,
    ...overrides,
  };
}

function setup(user: StaffAccount | null = staff()) {
  mockedUseAuth.mockReturnValue({ user, store });
  const onBack = jest.fn();
  const onOpenSection = jest.fn();
  render(<SettingsMenuScreen onBack={onBack} onOpenSection={onOpenSection} />);
  return { onBack, onOpenSection };
}

describe("SettingsMenuScreen", () => {
  it("shows the signed-in user's real name, email and store -- never placeholder copy", () => {
    setup();
    expect(screen.getByText("Lyndell Dobluis")).toBeTruthy();
    expect(screen.getByText("lyndell.dobluis@gmail.com")).toBeTruthy();
    expect(screen.getByText("Dell's Sari-Sari Store")).toBeTruthy();
  });

  it("lists all six sections for an admin", () => {
    setup();
    for (const title of ["Your profile", "Store details", "Receipts", "Fees and limits", "Alerts", "Backup"]) {
      expect(screen.getByText(title)).toBeTruthy();
    }
  });

  it("shows a cashier only the profile section, matching the web app's own route-level role gate", () => {
    setup(staff({ role: "cashier" }));
    expect(screen.getByText("Your profile")).toBeTruthy();
    for (const adminOnly of ["Store details", "Receipts", "Fees and limits", "Alerts", "Backup"]) {
      expect(screen.queryByText(adminOnly)).toBeNull();
    }
  });

  it("opens the tapped section", () => {
    const { onOpenSection } = setup();
    fireEvent.press(screen.getByText("Fees and limits"));
    expect(onOpenSection).toHaveBeenCalledWith("fees");
  });

  it("goes back", () => {
    const { onBack } = setup();
    fireEvent.press(screen.getByLabelText("Back"));
    expect(onBack).toHaveBeenCalled();
  });
});
