import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { PairDeviceScreen } from "./PairDeviceScreen";
import { useAuth } from "../lib/auth";

jest.mock("../lib/auth", () => ({ useAuth: jest.fn() }));

const mockedUseAuth = useAuth as jest.Mock;

describe("PairDeviceScreen", () => {
  it("calls pairDevice with the uppercased code and device name", async () => {
    const pairDevice = jest.fn().mockResolvedValue({ ok: true });
    mockedUseAuth.mockReturnValue({ pairDevice });
    render(<PairDeviceScreen onBack={jest.fn()} />);

    fireEvent.changeText(screen.getByLabelText("Pairing code"), "t4k9xy");
    fireEvent.changeText(screen.getByLabelText("Device name"), "Counter tablet");
    fireEvent.press(screen.getByRole("button", { name: "Pair this device" }));

    await waitFor(() => expect(pairDevice).toHaveBeenCalledWith("T4K9XY", "Counter tablet"));
  });

  it("shows the returned error instead of navigating away on failure", async () => {
    const pairDevice = jest.fn().mockResolvedValue({ ok: false, error: "That code is invalid or has expired." });
    mockedUseAuth.mockReturnValue({ pairDevice });
    render(<PairDeviceScreen onBack={jest.fn()} />);

    fireEvent.changeText(screen.getByLabelText("Pairing code"), "AAAAAA");
    fireEvent.changeText(screen.getByLabelText("Device name"), "Counter tablet");
    fireEvent.press(screen.getByRole("button", { name: "Pair this device" }));

    expect(await screen.findByText("That code is invalid or has expired.")).toBeTruthy();
  });

  it("calls onBack when the back button is pressed", () => {
    const onBack = jest.fn();
    mockedUseAuth.mockReturnValue({ pairDevice: jest.fn() });
    render(<PairDeviceScreen onBack={onBack} />);

    fireEvent.press(screen.getByRole("button", { name: "Back" }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });
});
