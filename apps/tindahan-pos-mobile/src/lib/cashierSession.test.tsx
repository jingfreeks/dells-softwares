import { Text } from "react-native";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { CashierSessionProvider, useCashierSession } from "./cashierSession";
import { useAuth } from "./auth";

const mockRpc = jest.fn();

jest.mock("./supabaseClient", () => ({
  supabase: { rpc: (...args: unknown[]) => mockRpc(...args) },
}));
jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
  removeItem: jest.fn().mockResolvedValue(undefined),
}));
jest.mock("./auth", () => ({ useAuth: jest.fn() }));

const mockedUseAuth = useAuth as jest.Mock;

function Probe() {
  const { activeCashier, cashierToken, startCashierSession, endCashierSession } = useCashierSession();
  return (
    <>
      <Text accessibilityRole="text" testID="cashier">
        {activeCashier?.name ?? "none"}
      </Text>
      <Text accessibilityRole="text" testID="token">
        {cashierToken ?? "none"}
      </Text>
      <Text accessibilityRole="button" onPress={() => startCashierSession("staff1", "1234", 500)}>
        start
      </Text>
      <Text accessibilityRole="button" onPress={() => endCashierSession()}>
        end
      </Text>
    </>
  );
}

function renderProbe() {
  return render(
    <CashierSessionProvider>
      <Probe />
    </CashierSessionProvider>
  );
}

describe("CashierSessionProvider", () => {
  beforeEach(() => {
    mockRpc.mockReset();
    mockedUseAuth.mockReturnValue({ user: { id: "admin1" }, device: null, loading: false });
  });

  it("starts a session on a successful PIN and exposes the cashier + token", async () => {
    mockRpc.mockResolvedValue({
      data: [
        {
          ok: true,
          error_code: null,
          token: "tok-123",
          staff_id: "staff1",
          name: "Maricel",
          role: "cashier",
          avatar_url: null,
          expires_at: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(),
        },
      ],
      error: null,
    });
    renderProbe();

    fireEvent.press(await screen.findByText("start"));

    await waitFor(() => expect(screen.getByTestId("cashier").props.children).toBe("Maricel"));
    expect(screen.getByTestId("token").props.children).toBe("tok-123");
    expect(mockRpc).toHaveBeenCalledWith("start_cashier_session", {
      p_staff_id: "staff1",
      p_pin: "1234",
      p_opening_float: 500,
    });
  });

  it("surfaces the server error_code when the PIN is wrong, without setting a cashier", async () => {
    mockRpc.mockResolvedValue({ data: [{ ok: false, error_code: "INVALID_PIN" }], error: null });
    renderProbe();

    fireEvent.press(await screen.findByText("start"));

    await waitFor(() => expect(mockRpc).toHaveBeenCalledTimes(1));
    expect(screen.getByTestId("cashier").props.children).toBe("none");
  });

  it("clears the active cashier on endCashierSession and calls end_cashier_session", async () => {
    mockRpc.mockResolvedValue({
      data: [
        {
          ok: true,
          error_code: null,
          token: "tok-123",
          staff_id: "staff1",
          name: "Maricel",
          role: "cashier",
          avatar_url: null,
          expires_at: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(),
        },
      ],
      error: null,
    });
    renderProbe();
    fireEvent.press(await screen.findByText("start"));
    await waitFor(() => expect(screen.getByTestId("cashier").props.children).toBe("Maricel"));

    mockRpc.mockClear();
    mockRpc.mockResolvedValue({ data: null, error: null });
    fireEvent.press(screen.getByText("end"));

    await waitFor(() => expect(screen.getByTestId("cashier").props.children).toBe("none"));
    expect(mockRpc).toHaveBeenCalledWith("end_cashier_session", { p_token: "tok-123", p_closing_float: null });
  });
});
