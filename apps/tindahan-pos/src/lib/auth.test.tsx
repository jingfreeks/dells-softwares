import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { AuthProvider, useAuth } from "./auth";
import { supabase } from "./supabaseClient";

vi.mock("./supabaseClient", () => ({
  supabase: {
    from: vi.fn(),
    auth: {
      getSession: vi.fn(),
      onAuthStateChange: vi.fn(),
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
      resetPasswordForEmail: vi.fn(),
    },
  },
}));

const mockedSupabase = supabase as unknown as {
  from: ReturnType<typeof vi.fn>;
  auth: Record<string, ReturnType<typeof vi.fn>>;
};

function staffSelectChain(row: unknown, error: unknown = null) {
  return {
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: row, error }),
      }),
    }),
  };
}

function Probe() {
  const { user, loading, login, register, logout, requestPasswordReset } = useAuth();
  return (
    <div>
      <p data-testid="loading">{String(loading)}</p>
      <p data-testid="user">{user ? user.name : "none"}</p>
      <button onClick={() => login("nena@example.com", "secret")}>do-login</button>
      <button
        onClick={() =>
          register({
            storeName: "Dell's",
            ownerName: "Nena",
            email: "nena@example.com",
            password: "secret123",
            confirmPassword: "secret123",
          })
        }
      >
        do-register
      </button>
      <button onClick={() => logout()}>do-logout</button>
      <button onClick={() => requestPasswordReset("nena@example.com")}>do-reset</button>
    </div>
  );
}

function renderProbe() {
  return render(
    <AuthProvider>
      <Probe />
    </AuthProvider>
  );
}

describe("AuthProvider", () => {
  beforeEach(() => {
    mockedSupabase.auth.onAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    });
  });

  it("throws when useAuth is used outside a provider", () => {
    function Bad() {
      useAuth();
      return null;
    }
    expect(() => render(<Bad />)).toThrow("useAuth must be used within AuthProvider");
  });

  it("starts with no user when there is no persisted session", async () => {
    mockedSupabase.auth.getSession.mockResolvedValue({ data: { session: null } });
    renderProbe();
    await waitFor(() => expect(screen.getByTestId("loading")).toHaveTextContent("false"));
    expect(screen.getByTestId("user")).toHaveTextContent("none");
  });

  it("restores a persisted session's staff profile", async () => {
    mockedSupabase.auth.getSession.mockResolvedValue({
      data: { session: { user: { id: "u1" } } },
    });
    mockedSupabase.from.mockReturnValue(
      staffSelectChain({ id: "u1", store_id: "s1", name: "Aling Nena", email: "nena@example.com", role: "admin" })
    );
    renderProbe();
    await waitFor(() => expect(screen.getByTestId("user")).toHaveTextContent("Aling Nena"));
  });

  it("sets no user when the staff profile lookup fails", async () => {
    mockedSupabase.auth.getSession.mockResolvedValue({
      data: { session: { user: { id: "u1" } } },
    });
    mockedSupabase.from.mockReturnValue(staffSelectChain(null, { message: "not found" }));
    renderProbe();
    await waitFor(() => expect(screen.getByTestId("loading")).toHaveTextContent("false"));
    expect(screen.getByTestId("user")).toHaveTextContent("none");
  });

  it("reacts to auth state changes by loading the new profile", async () => {
    mockedSupabase.auth.getSession.mockResolvedValue({ data: { session: null } });
    let capturedCallback: ((event: string, session: unknown) => void) | null = null;
    mockedSupabase.auth.onAuthStateChange.mockImplementation((cb) => {
      capturedCallback = cb;
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    });
    mockedSupabase.from.mockReturnValue(
      staffSelectChain({ id: "u2", store_id: "s1", name: "Cashier Joy", email: "joy@example.com", role: "cashier" })
    );
    renderProbe();
    await waitFor(() => expect(screen.getByTestId("loading")).toHaveTextContent("false"));

    await capturedCallback!("SIGNED_IN", { user: { id: "u2" } });
    await waitFor(() => expect(screen.getByTestId("user")).toHaveTextContent("Cashier Joy"));

    await capturedCallback!("SIGNED_OUT", null);
    await waitFor(() => expect(screen.getByTestId("user")).toHaveTextContent("none"));
  });

  it("logs in successfully", async () => {
    mockedSupabase.auth.getSession.mockResolvedValue({ data: { session: null } });
    mockedSupabase.auth.signInWithPassword.mockResolvedValue({ error: null });
    renderProbe();
    await waitFor(() => expect(screen.getByTestId("loading")).toHaveTextContent("false"));

    screen.getByText("do-login").click();
    await waitFor(() =>
      expect(mockedSupabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: "nena@example.com",
        password: "secret",
      })
    );
  });

  it("returns a friendly error for invalid login credentials", async () => {
    mockedSupabase.auth.getSession.mockResolvedValue({ data: { session: null } });
    mockedSupabase.auth.signInWithPassword.mockResolvedValue({
      error: { message: "Invalid login credentials" },
    });
    let result: unknown;
    function Capture() {
      const { login } = useAuth();
      return <button onClick={async () => (result = await login("a@b.com", "x"))}>go</button>;
    }
    render(
      <AuthProvider>
        <Capture />
      </AuthProvider>
    );
    screen.getByText("go").click();
    await waitFor(() => expect(result).toEqual({ ok: false, error: "Incorrect email or password." }));
  });

  it("validates registration fields before calling signUp", async () => {
    mockedSupabase.auth.getSession.mockResolvedValue({ data: { session: null } });
    let result: unknown;
    function Capture() {
      const { register } = useAuth();
      return (
        <button
          onClick={async () =>
            (result = await register({
              storeName: "",
              ownerName: "Nena",
              email: "a@b.com",
              password: "secret123",
              confirmPassword: "secret123",
            }))
          }
        >
          go
        </button>
      );
    }
    render(
      <AuthProvider>
        <Capture />
      </AuthProvider>
    );
    screen.getByText("go").click();
    await waitFor(() => expect(result).toEqual({ ok: false, error: "All fields are required." }));
    expect(mockedSupabase.auth.signUp).not.toHaveBeenCalled();
  });

  it("validates a short password on registration", async () => {
    mockedSupabase.auth.getSession.mockResolvedValue({ data: { session: null } });
    let result: unknown;
    function Capture() {
      const { register } = useAuth();
      return (
        <button
          onClick={async () =>
            (result = await register({
              storeName: "Dell's",
              ownerName: "Nena",
              email: "a@b.com",
              password: "123",
              confirmPassword: "123",
            }))
          }
        >
          go
        </button>
      );
    }
    render(
      <AuthProvider>
        <Capture />
      </AuthProvider>
    );
    screen.getByText("go").click();
    await waitFor(() =>
      expect(result).toEqual({ ok: false, error: "Password must be at least 8 characters." })
    );
  });

  it("validates matching passwords on registration", async () => {
    mockedSupabase.auth.getSession.mockResolvedValue({ data: { session: null } });
    let result: unknown;
    function Capture() {
      const { register } = useAuth();
      return (
        <button
          onClick={async () =>
            (result = await register({
              storeName: "Dell's",
              ownerName: "Nena",
              email: "a@b.com",
              password: "secret123",
              confirmPassword: "secret234",
            }))
          }
        >
          go
        </button>
      );
    }
    render(
      <AuthProvider>
        <Capture />
      </AuthProvider>
    );
    screen.getByText("go").click();
    await waitFor(() => expect(result).toEqual({ ok: false, error: "Passwords do not match." }));
  });

  it("registers successfully and reports whether confirmation is needed", async () => {
    mockedSupabase.auth.getSession.mockResolvedValue({ data: { session: null } });
    mockedSupabase.auth.signUp.mockResolvedValue({ data: { session: null }, error: null });
    let result: unknown;
    function Capture() {
      const { register } = useAuth();
      return (
        <button
          onClick={async () =>
            (result = await register({
              storeName: "Dell's",
              ownerName: "Nena",
              email: "a@b.com",
              password: "secret123",
              confirmPassword: "secret123",
            }))
          }
        >
          go
        </button>
      );
    }
    render(
      <AuthProvider>
        <Capture />
      </AuthProvider>
    );
    screen.getByText("go").click();
    await waitFor(() => expect(result).toEqual({ ok: true, needsEmailConfirmation: true }));
  });

  it("returns a friendly error when the email is already registered", async () => {
    mockedSupabase.auth.getSession.mockResolvedValue({ data: { session: null } });
    mockedSupabase.auth.signUp.mockResolvedValue({
      data: null,
      error: { message: "User already registered" },
    });
    let result: unknown;
    function Capture() {
      const { register } = useAuth();
      return (
        <button
          onClick={async () =>
            (result = await register({
              storeName: "Dell's",
              ownerName: "Nena",
              email: "a@b.com",
              password: "secret123",
              confirmPassword: "secret123",
            }))
          }
        >
          go
        </button>
      );
    }
    render(
      <AuthProvider>
        <Capture />
      </AuthProvider>
    );
    screen.getByText("go").click();
    await waitFor(() =>
      expect(result).toEqual({ ok: false, error: "An account with that email already exists." })
    );
  });

  it("logs out and clears the user", async () => {
    mockedSupabase.auth.getSession.mockResolvedValue({
      data: { session: { user: { id: "u1" } } },
    });
    mockedSupabase.from.mockReturnValue(
      staffSelectChain({ id: "u1", store_id: "s1", name: "Aling Nena", email: "nena@example.com", role: "admin" })
    );
    mockedSupabase.auth.signOut.mockResolvedValue({ error: null });
    renderProbe();
    await waitFor(() => expect(screen.getByTestId("user")).toHaveTextContent("Aling Nena"));

    screen.getByText("do-logout").click();
    await waitFor(() => expect(screen.getByTestId("user")).toHaveTextContent("none"));
  });

  it("requests a password reset", async () => {
    mockedSupabase.auth.getSession.mockResolvedValue({ data: { session: null } });
    mockedSupabase.auth.resetPasswordForEmail.mockResolvedValue({ error: null });
    renderProbe();
    await waitFor(() => expect(screen.getByTestId("loading")).toHaveTextContent("false"));

    screen.getByText("do-reset").click();
    await waitFor(() =>
      expect(mockedSupabase.auth.resetPasswordForEmail).toHaveBeenCalledWith(
        "nena@example.com",
        expect.objectContaining({ redirectTo: expect.stringContaining("/login") })
      )
    );
  });

  it("reports failure for a server error on password reset", async () => {
    mockedSupabase.auth.getSession.mockResolvedValue({ data: { session: null } });
    mockedSupabase.auth.resetPasswordForEmail.mockResolvedValue({ error: { status: 500 } });
    let result: unknown;
    function Capture() {
      const { requestPasswordReset } = useAuth();
      return <button onClick={async () => (result = await requestPasswordReset("a@b.com"))}>go</button>;
    }
    render(
      <AuthProvider>
        <Capture />
      </AuthProvider>
    );
    screen.getByText("go").click();
    await waitFor(() =>
      expect(result).toEqual({ ok: false, error: "Something went wrong. Please try again." })
    );
  });

  it("reports success even for an unregistered email (no status or < 500)", async () => {
    mockedSupabase.auth.getSession.mockResolvedValue({ data: { session: null } });
    mockedSupabase.auth.resetPasswordForEmail.mockResolvedValue({ error: { status: 400 } });
    let result: unknown;
    function Capture() {
      const { requestPasswordReset } = useAuth();
      return <button onClick={async () => (result = await requestPasswordReset("a@b.com"))}>go</button>;
    }
    render(
      <AuthProvider>
        <Capture />
      </AuthProvider>
    );
    screen.getByText("go").click();
    await waitFor(() => expect(result).toEqual({ ok: true }));
  });

  it("returns an error from updateProfile when not signed in", async () => {
    mockedSupabase.auth.getSession.mockResolvedValue({ data: { session: null } });
    let result: unknown;
    function Capture() {
      const { updateProfile } = useAuth();
      return <button onClick={async () => (result = await updateProfile({ name: "New" }))}>go</button>;
    }
    render(
      <AuthProvider>
        <Capture />
      </AuthProvider>
    );
    screen.getByText("go").click();
    await waitFor(() => expect(result).toEqual({ ok: false, error: "Not signed in." }));
  });

  it("updates the staff row and reloads the profile", async () => {
    mockedSupabase.auth.getSession.mockResolvedValue({
      data: { session: { user: { id: "u1" } } },
    });
    const updateEq = vi.fn().mockResolvedValue({ error: null });
    const chain = {
      select: staffSelectChain(
        { id: "u1", store_id: "s1", name: "New Name", email: "nena@example.com", role: "admin", avatar_url: "https://x/y.webp", phone: "0917" }
      ).select,
      update: vi.fn(() => ({ eq: updateEq })),
    };
    mockedSupabase.from.mockReturnValue(chain);

    let result: unknown;
    function Capture() {
      const { updateProfile, user } = useAuth();
      return (
        <>
          <p data-testid="name">{user?.name}</p>
          <button
            onClick={async () =>
              (result = await updateProfile({ name: "New Name", phone: "0917", avatarUrl: "https://x/y.webp" }))
            }
          >
            go
          </button>
        </>
      );
    }
    render(
      <AuthProvider>
        <Capture />
      </AuthProvider>
    );
    await waitFor(() => expect(screen.getByTestId("name")).toHaveTextContent("New Name"));
    screen.getByText("go").click();

    await waitFor(() => expect(result).toEqual({ ok: true }));
    expect(chain.update).toHaveBeenCalledWith({
      name: "New Name",
      phone: "0917",
      avatar_url: "https://x/y.webp",
    });
  });

  it("returns an error when the staff update fails", async () => {
    mockedSupabase.auth.getSession.mockResolvedValue({
      data: { session: { user: { id: "u1" } } },
    });
    const chain = {
      select: staffSelectChain({ id: "u1", store_id: "s1", name: "Nena", email: "nena@example.com", role: "admin" })
        .select,
      update: vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: { message: "boom" } }) })),
    };
    mockedSupabase.from.mockReturnValue(chain);

    let result: unknown;
    function Capture() {
      const { updateProfile } = useAuth();
      return <button onClick={async () => (result = await updateProfile({ name: "New" }))}>go</button>;
    }
    render(
      <AuthProvider>
        <Capture />
      </AuthProvider>
    );
    await waitFor(() => screen.getByText("go"));
    screen.getByText("go").click();
    await waitFor(() => expect(result).toEqual({ ok: false, error: "boom" }));
  });
});
