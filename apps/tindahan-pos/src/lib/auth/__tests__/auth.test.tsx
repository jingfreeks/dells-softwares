import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { AuthProvider } from "../auth";
import { useAuth } from "../authContext";
import { supabase } from "../../supabaseClient";

vi.mock("../../supabaseClient", () => ({
  supabase: {
    from: vi.fn(),
    functions: { invoke: vi.fn() },
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
  functions: { invoke: ReturnType<typeof vi.fn> };
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

/** Mirrors `loadDeviceProfile`'s `.select().eq().is().single()` chain. */
function deviceSelectChain(row: unknown, error: unknown = null) {
  return {
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        is: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: row, error }),
        }),
      }),
    }),
  };
}

/** Dispatches `.from(table)` to a different chain per table, for tests that touch both staff and stores. */
function multiTableFrom(map: Record<string, unknown>) {
  return (table: string) => map[table];
}

function Probe() {
  const { user, deviceSession, loading, login, register, logout, requestPasswordReset } = useAuth();
  return (
    <div>
      <p data-testid="loading">{String(loading)}</p>
      <p data-testid="user">{user ? user.name : "none"}</p>
      <p data-testid="device">{deviceSession ? deviceSession.name : "none"}</p>
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
    mockedSupabase.from.mockImplementation(
      multiTableFrom({
        staff: staffSelectChain(null, { message: "not found" }),
        devices: deviceSelectChain(null, { message: "not found" }),
      })
    );
    mockedSupabase.auth.signOut.mockResolvedValue({ error: null });
    renderProbe();
    await waitFor(() => expect(screen.getByTestId("loading")).toHaveTextContent("false"));
    expect(screen.getByTestId("user")).toHaveTextContent("none");
  });

  it("resolves a paired device's session into deviceSession, not user", async () => {
    mockedSupabase.auth.getSession.mockResolvedValue({
      data: { session: { user: { id: "d1" } } },
    });
    mockedSupabase.from.mockImplementation(
      multiTableFrom({
        staff: staffSelectChain(null, { message: "not found" }),
        devices: deviceSelectChain({ id: "d1", store_id: "s1", name: "Counter tablet" }),
        stores: staffSelectChain({
          id: "s1",
          name: "Dell's Store",
          address: "123 Main St",
          photo_url: null,
        }),
      })
    );
    renderProbe();
    await waitFor(() => expect(screen.getByTestId("device")).toHaveTextContent("Counter tablet"));
    expect(screen.getByTestId("user")).toHaveTextContent("none");
  });

  it("loads the store alongside a paired device's session", async () => {
    mockedSupabase.auth.getSession.mockResolvedValue({
      data: { session: { user: { id: "d1" } } },
    });
    mockedSupabase.from.mockImplementation(
      multiTableFrom({
        staff: staffSelectChain(null, { message: "not found" }),
        devices: deviceSelectChain({ id: "d1", store_id: "s1", name: "Counter tablet" }),
        stores: staffSelectChain({
          id: "s1",
          name: "Dell's Store",
          address: "123 Main St",
          photo_url: "https://cdn.test/store.webp",
        }),
      })
    );
    let capturedStore: unknown;
    function Capture() {
      const { store } = useAuth();
      capturedStore = store;
      return <p data-testid="store-name">{store?.name}</p>;
    }
    render(
      <AuthProvider>
        <Capture />
      </AuthProvider>
    );
    await waitFor(() => expect(screen.getByTestId("store-name")).toHaveTextContent("Dell's Store"));
    expect(capturedStore).toEqual({
      id: "s1",
      name: "Dell's Store",
      address: "123 Main St",
      photoUrl: "https://cdn.test/store.webp",
    });
  });

  it("signs out when a session matches neither a staff nor a device row", async () => {
    mockedSupabase.auth.getSession.mockResolvedValue({
      data: { session: { user: { id: "stale-1" } } },
    });
    mockedSupabase.from.mockImplementation(
      multiTableFrom({
        staff: staffSelectChain(null, { message: "not found" }),
        devices: deviceSelectChain(null, { message: "not found" }),
      })
    );
    mockedSupabase.auth.signOut.mockResolvedValue({ error: null });
    renderProbe();
    await waitFor(() => expect(screen.getByTestId("loading")).toHaveTextContent("false"));
    expect(screen.getByTestId("user")).toHaveTextContent("none");
    expect(screen.getByTestId("device")).toHaveTextContent("none");
    expect(mockedSupabase.auth.signOut).toHaveBeenCalled();
  });

  it("stays loading while resolving a fresh sign-in's profile, instead of briefly reporting no user", async () => {
    mockedSupabase.auth.getSession.mockResolvedValue({ data: { session: null } });
    let capturedCallback: ((event: string, session: unknown) => void) | null = null;
    mockedSupabase.auth.onAuthStateChange.mockImplementation((cb) => {
      capturedCallback = cb;
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    });

    // A deferred profile lookup, so we can observe the state while it's
    // still in flight — this is the exact window where a consumer (e.g.
    // HomeRedirect) previously saw `loading: false, user: null` right
    // after a successful sign-in and bounced back to /login.
    let resolveProfile!: (value: unknown) => void;
    const profilePromise = new Promise((resolve) => {
      resolveProfile = resolve;
    });
    mockedSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({ single: vi.fn().mockReturnValue(profilePromise) }),
      }),
    });

    renderProbe();
    await waitFor(() => expect(screen.getByTestId("loading")).toHaveTextContent("false"));

    capturedCallback!("SIGNED_IN", { user: { id: "u1" } });
    await waitFor(() => expect(screen.getByTestId("loading")).toHaveTextContent("true"));
    expect(screen.getByTestId("user")).toHaveTextContent("none");

    resolveProfile({
      data: { id: "u1", store_id: "s1", name: "Aling Nena", email: "nena@example.com", role: "admin" },
      error: null,
    });
    await waitFor(() => expect(screen.getByTestId("user")).toHaveTextContent("Aling Nena"));
    expect(screen.getByTestId("loading")).toHaveTextContent("false");
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

  it("ignores a token refresh for the same session, instead of re-showing the loading spinner", async () => {
    mockedSupabase.auth.getSession.mockResolvedValue({
      data: { session: { user: { id: "u1" } } },
    });
    let capturedCallback: ((event: string, session: unknown) => void) | null = null;
    mockedSupabase.auth.onAuthStateChange.mockImplementation((cb) => {
      capturedCallback = cb;
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    });
    const staffChain = staffSelectChain({
      id: "u1",
      store_id: "s1",
      name: "Aling Nena",
      email: "nena@example.com",
      role: "admin",
    });
    mockedSupabase.from.mockReturnValue(staffChain);
    renderProbe();
    await waitFor(() => expect(screen.getByTestId("user")).toHaveTextContent("Aling Nena"));
    const fetchCountAfterInitialLoad = staffChain.select.mock.calls.length;

    // Supabase fires TOKEN_REFRESHED with the same user every time the
    // browser tab regains focus after being backgrounded — this must not
    // re-trigger the loading spinner or an unnecessary profile refetch.
    await capturedCallback!("TOKEN_REFRESHED", { user: { id: "u1" } });

    expect(screen.getByTestId("loading")).toHaveTextContent("false");
    expect(screen.getByTestId("user")).toHaveTextContent("Aling Nena");
    expect(staffChain.select.mock.calls.length).toBe(fetchCountAfterInitialLoad);
  });

  it("ignores a SIGNED_IN event for the same user, instead of remounting the app on tab refocus", async () => {
    mockedSupabase.auth.getSession.mockResolvedValue({
      data: { session: { user: { id: "u1" } } },
    });
    let capturedCallback: ((event: string, session: unknown) => void) | null = null;
    mockedSupabase.auth.onAuthStateChange.mockImplementation((cb) => {
      capturedCallback = cb;
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    });
    const staffChain = staffSelectChain({
      id: "u1",
      store_id: "s1",
      name: "Aling Nena",
      email: "nena@example.com",
      role: "admin",
    });
    mockedSupabase.from.mockReturnValue(staffChain);
    renderProbe();
    await waitFor(() => expect(screen.getByTestId("user")).toHaveTextContent("Aling Nena"));
    const fetchCountAfterInitialLoad = staffChain.select.mock.calls.length;

    // Supabase's own GoTrueClient fires SIGNED_IN (not just TOKEN_REFRESHED)
    // every time the tab regains focus, as part of its internal
    // visibilitychange-driven session recovery — even though nothing
    // changed. Treating every SIGNED_IN as a fresh sign-in previously
    // caused `loading` to flip true/false on every tab switch, which
    // unmounts and remounts the whole authenticated app shell.
    await capturedCallback!("SIGNED_IN", { user: { id: "u1" } });

    expect(screen.getByTestId("loading")).toHaveTextContent("false");
    expect(screen.getByTestId("user")).toHaveTextContent("Aling Nena");
    expect(staffChain.select.mock.calls.length).toBe(fetchCountAfterInitialLoad);
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

  it("loads the store alongside the staff profile", async () => {
    mockedSupabase.auth.getSession.mockResolvedValue({
      data: { session: { user: { id: "u1" } } },
    });
    mockedSupabase.from.mockImplementation(
      multiTableFrom({
        staff: staffSelectChain({
          id: "u1",
          store_id: "s1",
          name: "Aling Nena",
          email: "nena@example.com",
          role: "admin",
        }),
        stores: staffSelectChain({
          id: "s1",
          name: "Dell's Store",
          address: "123 Main St",
          photo_url: "https://cdn.test/store.webp",
        }),
      })
    );

    let capturedStore: unknown;
    function Capture() {
      const { store } = useAuth();
      capturedStore = store;
      return <p data-testid="store-name">{store?.name}</p>;
    }
    render(
      <AuthProvider>
        <Capture />
      </AuthProvider>
    );
    await waitFor(() => expect(screen.getByTestId("store-name")).toHaveTextContent("Dell's Store"));
    expect(capturedStore).toEqual({
      id: "s1",
      name: "Dell's Store",
      address: "123 Main St",
      photoUrl: "https://cdn.test/store.webp",
    });
  });

  it("includes address in the profile update patch", async () => {
    mockedSupabase.auth.getSession.mockResolvedValue({
      data: { session: { user: { id: "u1" } } },
    });
    const updateEq = vi.fn().mockResolvedValue({ error: null });
    const chain = {
      select: staffSelectChain({ id: "u1", store_id: "s1", name: "Nena", email: "nena@example.com", role: "admin" })
        .select,
      update: vi.fn(() => ({ eq: updateEq })),
    };
    mockedSupabase.from.mockReturnValue(chain);

    let result: unknown;
    function Capture() {
      const { updateProfile } = useAuth();
      return (
        <button onClick={async () => (result = await updateProfile({ address: "456 Side St" }))}>go</button>
      );
    }
    render(
      <AuthProvider>
        <Capture />
      </AuthProvider>
    );
    await waitFor(() => screen.getByText("go"));
    screen.getByText("go").click();
    await waitFor(() => expect(result).toEqual({ ok: true }));
    expect(chain.update).toHaveBeenCalledWith({ address: "456 Side St" });
  });

  it("returns an error from updateStore when not signed in", async () => {
    mockedSupabase.auth.getSession.mockResolvedValue({ data: { session: null } });
    let result: unknown;
    function Capture() {
      const { updateStore } = useAuth();
      return <button onClick={async () => (result = await updateStore({ name: "New Store" }))}>go</button>;
    }
    render(
      <AuthProvider>
        <Capture />
      </AuthProvider>
    );
    screen.getByText("go").click();
    await waitFor(() => expect(result).toEqual({ ok: false, error: "Not signed in." }));
  });

  it("updates the store row and reloads it", async () => {
    mockedSupabase.auth.getSession.mockResolvedValue({
      data: { session: { user: { id: "u1" } } },
    });
    const storeUpdateEq = vi.fn().mockResolvedValue({ error: null });
    mockedSupabase.from.mockImplementation(
      multiTableFrom({
        staff: staffSelectChain({ id: "u1", store_id: "s1", name: "Nena", email: "nena@example.com", role: "admin" }),
        stores: {
          select: staffSelectChain({
            id: "s1",
            name: "New Store",
            address: "789 New Ave",
            photo_url: "https://cdn.test/new.webp",
          }).select,
          update: vi.fn(() => ({ eq: storeUpdateEq })),
        },
      })
    );

    let result: unknown;
    let capturedStore: unknown;
    function Capture() {
      const { updateStore, store } = useAuth();
      capturedStore = store;
      return (
        <button
          onClick={async () =>
            (result = await updateStore({
              name: "New Store",
              address: "789 New Ave",
              photoUrl: "https://cdn.test/new.webp",
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
    await waitFor(() => screen.getByText("go"));
    screen.getByText("go").click();

    await waitFor(() => expect(result).toEqual({ ok: true }));
    expect(storeUpdateEq).toHaveBeenCalledWith("id", "s1");
    await waitFor(() =>
      expect(capturedStore).toEqual({
        id: "s1",
        name: "New Store",
        address: "789 New Ave",
        photoUrl: "https://cdn.test/new.webp",
      })
    );
  });

  it("returns an error when the store update fails", async () => {
    mockedSupabase.auth.getSession.mockResolvedValue({
      data: { session: { user: { id: "u1" } } },
    });
    mockedSupabase.from.mockImplementation(
      multiTableFrom({
        staff: staffSelectChain({ id: "u1", store_id: "s1", name: "Nena", email: "nena@example.com", role: "admin" }),
        stores: {
          select: staffSelectChain({ id: "s1", name: "X", address: null, photo_url: null }).select,
          update: vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: { message: "store boom" } }) })),
        },
      })
    );

    let result: unknown;
    function Capture() {
      const { updateStore } = useAuth();
      return <button onClick={async () => (result = await updateStore({ name: "X" }))}>go</button>;
    }
    render(
      <AuthProvider>
        <Capture />
      </AuthProvider>
    );
    await waitFor(() => screen.getByText("go"));
    screen.getByText("go").click();
    await waitFor(() => expect(result).toEqual({ ok: false, error: "store boom" }));
  });

  it("returns an error from completeOnboarding when not signed in", async () => {
    mockedSupabase.auth.getSession.mockResolvedValue({ data: { session: null } });
    let result: unknown;
    function Capture() {
      const { completeOnboarding } = useAuth();
      return <button onClick={async () => (result = await completeOnboarding())}>go</button>;
    }
    render(
      <AuthProvider>
        <Capture />
      </AuthProvider>
    );
    screen.getByText("go").click();
    await waitFor(() => expect(result).toEqual({ ok: false, error: "Not signed in." }));
  });

  it("marks onboarding complete and reloads the profile", async () => {
    mockedSupabase.auth.getSession.mockResolvedValue({
      data: { session: { user: { id: "u1" } } },
    });
    const onboardedEq = vi.fn().mockResolvedValue({ error: null });
    const chain = {
      select: staffSelectChain({
        id: "u1",
        store_id: "s1",
        name: "Nena",
        email: "nena@example.com",
        role: "admin",
        onboarded_at: "2026-07-31T00:00:00Z",
      }).select,
      update: vi.fn(() => ({ eq: onboardedEq })),
    };
    mockedSupabase.from.mockReturnValue(chain);

    let result: unknown;
    let capturedUser: unknown;
    function Capture() {
      const { completeOnboarding, user } = useAuth();
      capturedUser = user;
      return <button onClick={async () => (result = await completeOnboarding())}>go</button>;
    }
    render(
      <AuthProvider>
        <Capture />
      </AuthProvider>
    );
    await waitFor(() => screen.getByText("go"));
    screen.getByText("go").click();

    await waitFor(() => expect(result).toEqual({ ok: true }));
    expect(chain.update).toHaveBeenCalledWith({ onboarded_at: expect.any(String) });
    await waitFor(() => expect((capturedUser as { onboardedAt: string })?.onboardedAt).toBe("2026-07-31T00:00:00Z"));
  });

  it("returns an error when completing onboarding fails", async () => {
    mockedSupabase.auth.getSession.mockResolvedValue({
      data: { session: { user: { id: "u1" } } },
    });
    const chain = {
      select: staffSelectChain({ id: "u1", store_id: "s1", name: "Nena", email: "nena@example.com", role: "admin" })
        .select,
      update: vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: { message: "onboard boom" } }) })),
    };
    mockedSupabase.from.mockReturnValue(chain);

    let result: unknown;
    function Capture() {
      const { completeOnboarding } = useAuth();
      return <button onClick={async () => (result = await completeOnboarding())}>go</button>;
    }
    render(
      <AuthProvider>
        <Capture />
      </AuthProvider>
    );
    await waitFor(() => screen.getByText("go"));
    screen.getByText("go").click();
    await waitFor(() => expect(result).toEqual({ ok: false, error: "onboard boom" }));
  });

  it("returns an error from deleteAccount when not signed in", async () => {
    mockedSupabase.auth.getSession.mockResolvedValue({ data: { session: null } });
    let result: unknown;
    function Capture() {
      const { deleteAccount } = useAuth();
      return <button onClick={async () => (result = await deleteAccount())}>go</button>;
    }
    render(
      <AuthProvider>
        <Capture />
      </AuthProvider>
    );
    screen.getByText("go").click();
    await waitFor(() => expect(result).toEqual({ ok: false, error: "Not signed in." }));
  });

  it("deletes the account, signs out, and clears local state", async () => {
    mockedSupabase.auth.getSession.mockResolvedValue({
      data: { session: { user: { id: "u1" }, access_token: "tok-1" } },
    });
    mockedSupabase.from.mockReturnValue(
      staffSelectChain({ id: "u1", store_id: "s1", name: "Nena", email: "nena@example.com", role: "cashier" })
    );
    mockedSupabase.functions.invoke.mockResolvedValue({ data: { ok: true }, error: null });
    mockedSupabase.auth.signOut.mockResolvedValue({ error: null });

    let result: unknown;
    function Capture() {
      const { deleteAccount, user } = useAuth();
      return (
        <>
          <p data-testid="user">{user ? user.name : "none"}</p>
          <button onClick={async () => (result = await deleteAccount())}>go</button>
        </>
      );
    }
    render(
      <AuthProvider>
        <Capture />
      </AuthProvider>
    );
    await waitFor(() => expect(screen.getByTestId("user")).toHaveTextContent("Nena"));
    screen.getByText("go").click();

    await waitFor(() => expect(result).toEqual({ ok: true }));
    expect(mockedSupabase.functions.invoke).toHaveBeenCalledWith("delete-account", {
      headers: { Authorization: "Bearer tok-1" },
    });
    expect(mockedSupabase.auth.signOut).toHaveBeenCalled();
    await waitFor(() => expect(screen.getByTestId("user")).toHaveTextContent("none"));
  });

  it("returns the server's error when deleting the sole admin's account is blocked", async () => {
    mockedSupabase.auth.getSession.mockResolvedValue({
      data: { session: { user: { id: "u1" }, access_token: "tok-1" } },
    });
    mockedSupabase.from.mockReturnValue(
      staffSelectChain({ id: "u1", store_id: "s1", name: "Nena", email: "nena@example.com", role: "admin" })
    );
    mockedSupabase.functions.invoke.mockResolvedValue({
      data: { error: "You're the only admin for this store." },
      error: null,
    });
    const signOutCallsBefore = mockedSupabase.auth.signOut.mock.calls.length;

    let result: unknown;
    function Capture() {
      const { deleteAccount } = useAuth();
      return <button onClick={async () => (result = await deleteAccount())}>go</button>;
    }
    render(
      <AuthProvider>
        <Capture />
      </AuthProvider>
    );
    await waitFor(() => screen.getByText("go"));
    screen.getByText("go").click();
    await waitFor(() =>
      expect(result).toEqual({ ok: false, error: "You're the only admin for this store." })
    );
    expect(mockedSupabase.auth.signOut.mock.calls.length).toBe(signOutCallsBefore);
  });

  it("returns an error when the delete-account function call itself fails", async () => {
    mockedSupabase.auth.getSession.mockResolvedValue({
      data: { session: { user: { id: "u1" }, access_token: "tok-1" } },
    });
    mockedSupabase.from.mockReturnValue(
      staffSelectChain({ id: "u1", store_id: "s1", name: "Nena", email: "nena@example.com", role: "cashier" })
    );
    mockedSupabase.functions.invoke.mockResolvedValue({
      data: null,
      error: { message: "network down" },
    });

    let result: unknown;
    function Capture() {
      const { deleteAccount } = useAuth();
      return <button onClick={async () => (result = await deleteAccount())}>go</button>;
    }
    render(
      <AuthProvider>
        <Capture />
      </AuthProvider>
    );
    await waitFor(() => screen.getByText("go"));
    screen.getByText("go").click();
    await waitFor(() => expect(result).toEqual({ ok: false, error: "network down" }));
  });
});
