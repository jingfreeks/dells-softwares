import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { CashierPinScreen } from "../cashierpinscreen";
import { useAuth } from "../../lib/auth";
import { useCashierSession } from "../../lib/cashierSession";

const mockRpc = jest.fn();

jest.mock("../../lib/supabaseClient", () => ({
  supabase: { rpc: (...args: unknown[]) => mockRpc(...args) },
}));
jest.mock("../../lib/auth", () => ({ useAuth: jest.fn() }));
jest.mock("../../lib/cashierSession", () => ({ useCashierSession: jest.fn() }));

const mockedUseAuth = useAuth as jest.Mock;
const mockedUseCashierSession = useCashierSession as jest.Mock;

function pressDigits(digits: string) {
  for (const digit of digits) {
    fireEvent.press(screen.getByLabelText(`Digit ${digit}`));
  }
}

describe("CashierPinScreen", () => {
  let startCashierSession: jest.Mock;

  beforeEach(() => {
    mockedUseAuth.mockReturnValue({ store: { name: "Dell's Store" } });
    startCashierSession = jest.fn().mockResolvedValue({ ok: true });
    mockedUseCashierSession.mockReturnValue({ startCashierSession, loading: false });
    mockRpc.mockResolvedValue({
      data: [
        { id: "staff1", name: "Maricel", avatar_url: null },
        { id: "staff2", name: "Jerome", avatar_url: null },
      ],
      error: null,
    });
  });

  it("shows the cashier picker, then the PIN keypad, then starts a session with the entered PIN and float", async () => {
    render(<CashierPinScreen />);

    fireEvent.press(await screen.findByText("Maricel"));
    expect(screen.getByText("Hi Maricel — enter your PIN")).toBeTruthy();

    pressDigits("1234");

    expect(await screen.findByText("How much cash is in the drawer?")).toBeTruthy();
    fireEvent.changeText(screen.getByLabelText("Opening float"), "500");
    fireEvent.press(screen.getByRole("button", { name: "Start shift" }));

    await waitFor(() => expect(startCashierSession).toHaveBeenCalledWith("staff1", "1234", 500));
  });

  it("shows a friendly error and resets to the picker's PIN entry on a wrong PIN", async () => {
    startCashierSession.mockResolvedValue({ ok: false, error: "INVALID_PIN" });
    render(<CashierPinScreen />);

    fireEvent.press(await screen.findByText("Jerome"));
    pressDigits("0000");
    fireEvent.press(screen.getByRole("button", { name: "Start shift" }));

    expect(await screen.findByText("That PIN is incorrect.")).toBeTruthy();
  });
});
