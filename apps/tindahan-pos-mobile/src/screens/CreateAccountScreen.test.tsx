import { fireEvent, render, screen } from "@testing-library/react-native";
import { CreateAccountScreen } from "./CreateAccountScreen";

describe("CreateAccountScreen", () => {
  it("keeps Create account disabled until all fields are valid and terms are agreed", () => {
    render(<CreateAccountScreen />);

    expect(screen.getByRole("button", { name: "Create account" }).props.accessibilityState?.disabled).toBe(true);

    fireEvent.changeText(screen.getByLabelText("Your name"), "Juan Dela Cruz");
    fireEvent.changeText(screen.getByLabelText("Password"), "a-strong-password");
    fireEvent.press(screen.getByRole("checkbox"));

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
});
