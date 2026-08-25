import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { LoginScreen } from "./LoginScreen";
import { useAuth } from "../lib/auth";

jest.mock("../lib/auth", () => ({ useAuth: jest.fn() }));

const mockedUseAuth = useAuth as jest.Mock;

describe("LoginScreen", () => {
  it("shows an error message when login fails", async () => {
    const login = jest.fn().mockResolvedValue({ ok: false, error: "Incorrect email or password." });
    mockedUseAuth.mockReturnValue({ login });

    render(<LoginScreen />);
    fireEvent.changeText(screen.getByLabelText("Email"), "cashier@store.com");
    fireEvent.changeText(screen.getByLabelText("Password"), "wrong-password");
    fireEvent.press(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() => {
      expect(screen.getByText("Incorrect email or password.")).toBeTruthy();
    });
    expect(login).toHaveBeenCalledWith("cashier@store.com", "wrong-password", true);
  });

  it("passes keepSignedIn as false when the checkbox is unticked", async () => {
    const login = jest.fn().mockResolvedValue({ ok: true });
    mockedUseAuth.mockReturnValue({ login });

    render(<LoginScreen />);
    fireEvent.changeText(screen.getByLabelText("Email"), "owner@store.com");
    fireEvent.changeText(screen.getByLabelText("Password"), "correct-password");
    fireEvent.press(screen.getByText("Keep me signed in on this device"));
    fireEvent.press(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() => {
      expect(login).toHaveBeenCalledWith("owner@store.com", "correct-password", false);
    });
  });

  it("does not call login while email or password is empty", () => {
    const login = jest.fn();
    mockedUseAuth.mockReturnValue({ login });

    render(<LoginScreen />);
    fireEvent.press(screen.getByRole("button", { name: "Sign in" }));

    expect(login).not.toHaveBeenCalled();
  });
});
