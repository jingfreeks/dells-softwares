import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { CreateAccountScreen } from "../createaccountscreen";
import { useAuth } from "../../lib/auth";

jest.mock("../../lib/auth", () => ({ useAuth: jest.fn() }));

const mockedUseAuth = useAuth as jest.Mock;

function fillValidForm() {
  fireEvent.changeText(screen.getByLabelText("Store name"), "Dell's Sari-Sari Store");
  fireEvent.changeText(screen.getByLabelText("Your name"), "Juan Dela Cruz");
  fireEvent.changeText(screen.getByLabelText("Email"), "dell@tindahan.ph");
  fireEvent.changeText(screen.getByLabelText("Password"), "a-strong-password");
  fireEvent.press(screen.getByRole("checkbox"));
}

describe("CreateAccountScreen", () => {
  beforeEach(() => {
    mockedUseAuth.mockReturnValue({ register: jest.fn() });
  });

  it("keeps Create account disabled until all fields are valid and terms are agreed", () => {
    render(<CreateAccountScreen />);

    expect(screen.getByRole("button", { name: "Create account" }).props.accessibilityState?.disabled).toBe(true);

    fillValidForm();

    // React Native only sets accessibilityState.disabled when actually
    // disabled -- "enabled" is represented as the key being absent, not `false`.
    expect(screen.getByRole("button", { name: "Create account" }).props.accessibilityState?.disabled).toBeFalsy();
  });

  it("shows a required-field error for Your name once touched and left empty", () => {
    render(<CreateAccountScreen />);

    const yourNameInput = screen.getByLabelText("Your name");
    fireEvent(yourNameInput, "blur");

    expect(screen.getByText("Your name is required.")).toBeTruthy();
  });

  it("shows a minimum-length error for a short password once touched", () => {
    render(<CreateAccountScreen />);

    const passwordInput = screen.getByLabelText("Password");
    fireEvent.changeText(passwordInput, "short");
    fireEvent(passwordInput, "blur");

    expect(screen.getByText("Password must be at least 8 characters.")).toBeTruthy();
  });

  it("calls onSwitchToSignIn when the footer link is pressed", () => {
    const onSwitchToSignIn = jest.fn();
    render(<CreateAccountScreen onSwitchToSignIn={onSwitchToSignIn} />);

    fireEvent.press(screen.getByRole("link", { name: "Sign in" }));
    expect(onSwitchToSignIn).toHaveBeenCalledTimes(1);
  });

  it("calls onSwitchToSignIn when the segmented control's Sign in tab is pressed", () => {
    const onSwitchToSignIn = jest.fn();
    render(<CreateAccountScreen onSwitchToSignIn={onSwitchToSignIn} />);

    fireEvent.press(screen.getByRole("tab", { name: "Sign in" }));
    expect(onSwitchToSignIn).toHaveBeenCalledTimes(1);
  });

  it("calls register() with the form fields on submit", async () => {
    const register = jest.fn().mockResolvedValue({ ok: true, needsEmailConfirmation: false });
    mockedUseAuth.mockReturnValue({ register });

    render(<CreateAccountScreen />);
    fillValidForm();
    fireEvent.press(screen.getByRole("button", { name: "Create account" }));

    await waitFor(() => {
      expect(register).toHaveBeenCalledWith({
        storeName: "Dell's Sari-Sari Store",
        ownerName: "Juan Dela Cruz",
        email: "dell@tindahan.ph",
        password: "a-strong-password",
      });
    });
  });

  it("shows a 'check your email' state when the project requires email confirmation", async () => {
    const register = jest.fn().mockResolvedValue({ ok: true, needsEmailConfirmation: true });
    mockedUseAuth.mockReturnValue({ register });

    render(<CreateAccountScreen />);
    fillValidForm();
    fireEvent.press(screen.getByRole("button", { name: "Create account" }));

    await waitFor(() => {
      expect(screen.getByText("Check your email")).toBeTruthy();
    });
  });

  it("shows the server error and stays on the form when register() fails", async () => {
    const register = jest.fn().mockResolvedValue({ ok: false, error: "An account with that email already exists." });
    mockedUseAuth.mockReturnValue({ register });

    render(<CreateAccountScreen />);
    fillValidForm();
    fireEvent.press(screen.getByRole("button", { name: "Create account" }));

    await waitFor(() => {
      expect(screen.getByText("An account with that email already exists.")).toBeTruthy();
    });
    expect(screen.getByLabelText("Store name")).toBeTruthy();
  });
});
