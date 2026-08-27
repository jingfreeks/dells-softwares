import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { SetupRegisterScreen } from "../setupregisterscreen";

const mockRpc = jest.fn();
const mockFrom = jest.fn();
const mockInvoke = jest.fn();
const mockGetSession = jest.fn();

jest.mock("../../lib/supabaseClient", () => ({
  supabase: {
    rpc: (...args: unknown[]) => mockRpc(...args),
    from: (...args: unknown[]) => mockFrom(...args),
    functions: { invoke: (...args: unknown[]) => mockInvoke(...args) },
    auth: { getSession: (...args: unknown[]) => mockGetSession(...args) },
  },
}));

function selectQuery(rows: unknown[]) {
  return { select: jest.fn().mockResolvedValue({ data: rows, error: null }) };
}

describe("SetupRegisterScreen", () => {
  beforeEach(() => {
    mockRpc.mockReset();
    mockFrom.mockReset();
    mockInvoke.mockReset();
    mockGetSession.mockReset();
    mockGetSession.mockResolvedValue({ data: { session: { access_token: "tok" } } });
    mockFrom.mockReturnValue(selectQuery([]));
  });

  it("generates a pairing code and shows it split into digits", async () => {
    mockRpc.mockResolvedValue({
      data: [{ code: "T4K9XY", expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString() }],
      error: null,
    });
    render(<SetupRegisterScreen onBack={jest.fn()} />);

    fireEvent.press(await screen.findByRole("button", { name: "Generate a pairing code" }));

    await waitFor(() => expect(screen.getByText("T")).toBeTruthy());
    expect(screen.getByText("4")).toBeTruthy();
    expect(screen.getByText("K")).toBeTruthy();
    expect(screen.getByText("9")).toBeTruthy();
    expect(mockRpc).toHaveBeenCalledWith("generate_pairing_code");
  });

  it("lists paired devices, excluding unpaired ones", async () => {
    mockFrom.mockReturnValue(
      selectQuery([
        { id: "d1", name: "Counter tablet", paired_at: "2026-01-01T00:00:00Z", last_seen_at: null, unpaired_at: null },
        { id: "d2", name: "Old till", paired_at: "2026-01-01T00:00:00Z", last_seen_at: null, unpaired_at: "2026-02-01T00:00:00Z" },
      ])
    );
    render(<SetupRegisterScreen onBack={jest.fn()} />);

    expect(await screen.findByText("Counter tablet")).toBeTruthy();
    expect(screen.queryByText("Old till")).toBeNull();
  });

  it("submits the owner PIN through unpair-device when unpairing", async () => {
    mockFrom.mockReturnValue(
      selectQuery([{ id: "d1", name: "Counter tablet", paired_at: "2026-01-01T00:00:00Z", last_seen_at: null, unpaired_at: null }])
    );
    mockInvoke.mockResolvedValue({ data: { ok: true }, error: null });
    render(<SetupRegisterScreen onBack={jest.fn()} />);

    fireEvent.press(await screen.findByText("Unpair"));
    fireEvent.changeText(screen.getByLabelText("Owner PIN"), "1234");
    fireEvent.press(screen.getByRole("button", { name: "Unpair device" }));

    await waitFor(() =>
      expect(mockInvoke).toHaveBeenCalledWith("unpair-device", {
        body: { deviceId: "d1", ownerPin: "1234" },
        headers: { Authorization: "Bearer tok" },
      })
    );
  });
});
