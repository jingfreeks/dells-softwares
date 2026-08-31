import { Text } from "react-native";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { AuthProvider, useAuth } from "../auth";

const mockSignUp = jest.fn();
const mockInvoke = jest.fn();
const mockSignInWithPassword = jest.fn();

jest.mock("../supabaseClient", () => ({
  supabase: {
    auth: {
      getSession: jest.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: jest.fn().mockReturnValue({ data: { subscription: { unsubscribe: jest.fn() } } }),
      signUp: (...args: unknown[]) => mockSignUp(...args),
      signInWithPassword: (...args: unknown[]) => mockSignInWithPassword(...args),
    },
    functions: { invoke: (...args: unknown[]) => mockInvoke(...args) },
  },
}));

/** Minimal harness exposing register()'s result as on-screen text, since it's only reachable via useAuth(). */
function RegisterProbe({ result }: { result: React.MutableRefObject<Awaited<ReturnType<ReturnType<typeof useAuth>["register"]>> | null> }) {
  const { register } = useAuth();
  return (
    <Text
      accessibilityRole="button"
      onPress={async () => {
        result.current = await register({
          storeName: "Dell's Sari-Sari Store",
          ownerName: "Juan Dela Cruz",
          email: "OWNER@Store.com",
          password: "a-strong-password",
        });
      }}
    >
      go
    </Text>
  );
}

function renderRegister() {
  const result = { current: null } as React.MutableRefObject<
    Awaited<ReturnType<ReturnType<typeof useAuth>["register"]>> | null
  >;
  render(
    <AuthProvider>
      <RegisterProbe result={result} />
    </AuthProvider>
  );
  return result;
}

function PairDeviceProbe({ result }: { result: React.MutableRefObject<Awaited<ReturnType<ReturnType<typeof useAuth>["pairDevice"]>> | null> }) {
  const { pairDevice } = useAuth();
  return (
    <Text
      accessibilityRole="button"
      onPress={async () => {
        result.current = await pairDevice("T4K9XY", "Counter tablet");
      }}
    >
      pair
    </Text>
  );
}

function renderPairDevice() {
  const result = { current: null } as React.MutableRefObject<
    Awaited<ReturnType<ReturnType<typeof useAuth>["pairDevice"]>> | null
  >;
  render(
    <AuthProvider>
      <PairDeviceProbe result={result} />
    </AuthProvider>
  );
  return result;
}

describe("pairDevice()", () => {
  beforeEach(() => {
    mockInvoke.mockReset();
    mockSignInWithPassword.mockReset();
  });

  it("redeems the code, then signs in with the returned transient credentials", async () => {
    mockInvoke.mockResolvedValue({ data: { email: "device+abc@internal.invalid", password: "temp-pass" }, error: null });
    mockSignInWithPassword.mockResolvedValue({ error: null });
    const result = renderPairDevice();

    fireEvent.press(await screen.findByText("pair"));

    await waitFor(() => expect(result.current).toEqual({ ok: true }));
    expect(mockInvoke).toHaveBeenCalledWith("pair-device", { body: { code: "T4K9XY", deviceName: "Counter tablet" } });
    expect(mockSignInWithPassword).toHaveBeenCalledWith({ email: "device+abc@internal.invalid", password: "temp-pass" });
  });

  it("maps an invalid/expired code to a friendly error without signing in", async () => {
    mockInvoke.mockResolvedValue({ data: { error: "INVALID_OR_EXPIRED_CODE" }, error: null });
    const result = renderPairDevice();

    fireEvent.press(await screen.findByText("pair"));

    await waitFor(() => expect(result.current).toEqual({ ok: false, error: "That code is invalid or has expired." }));
    expect(mockSignInWithPassword).not.toHaveBeenCalled();
  });
});

describe("register()", () => {
  beforeEach(() => {
    mockSignUp.mockReset();
  });

  it("calls supabase signUp with lowercased/trimmed email and the store_name/owner_name metadata", async () => {
    mockSignUp.mockResolvedValue({ data: { session: { access_token: "x" } }, error: null });
    const result = renderRegister();

    fireEvent.press(await screen.findByText("go"));

    await waitFor(() => expect(result.current).toEqual({ ok: true, needsEmailConfirmation: false }));
    expect(mockSignUp).toHaveBeenCalledWith({
      email: "owner@store.com",
      password: "a-strong-password",
      options: { data: { store_name: "Dell's Sari-Sari Store", owner_name: "Juan Dela Cruz" } },
    });
  });

  it("reports needsEmailConfirmation when signUp succeeds without a session", async () => {
    mockSignUp.mockResolvedValue({ data: { session: null }, error: null });
    const result = renderRegister();

    fireEvent.press(await screen.findByText("go"));

    await waitFor(() => expect(result.current).toEqual({ ok: true, needsEmailConfirmation: true }));
  });

  it("maps a duplicate-email signUp error to a friendly message", async () => {
    mockSignUp.mockResolvedValue({ data: { session: null }, error: { message: "User already registered" } });
    const result = renderRegister();

    fireEvent.press(await screen.findByText("go"));

    await waitFor(() =>
      expect(result.current).toEqual({ ok: false, error: "An account with that email already exists." })
    );
  });
});
