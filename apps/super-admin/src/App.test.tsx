import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import App from "./App";
import { usePlatform, listOrganizations, type PlatformAdmin } from "./lib/platform";

// The provider talks to Supabase on mount; the gate is what is under test, so
// the session it resolves is supplied directly.
vi.mock("./lib/platform", async () => {
  const actual = await vi.importActual<typeof import("./lib/platform")>("./lib/platform");
  return {
    ...actual,
    PlatformProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    usePlatform: vi.fn(),
    listOrganizations: vi.fn().mockResolvedValue([]),
    listDeletionRequests: vi.fn().mockResolvedValue([]),
    listPlatformAudit: vi.fn().mockResolvedValue([]),
    listPlatformAudit: vi.fn().mockResolvedValue([]),
  };
});

function platformValue(over: Partial<ReturnType<typeof usePlatform>> = {}) {
  return {
    session: null,
    admin: null as PlatformAdmin | null,
    loading: false,
    signIn: vi.fn().mockResolvedValue({ ok: true }),
    signOut: vi.fn(),
    verifyMfa: vi.fn().mockResolvedValue({ ok: true }),
    refresh: vi.fn(),
    getMfaStatus: vi.fn().mockResolvedValue({ enrolled: true, factorId: "factor-1" }),
    enrollMfa: vi.fn().mockResolvedValue({ ok: true }),
    verifyMfaCode: vi.fn().mockResolvedValue({ ok: true }),
    ...over,
  } as ReturnType<typeof usePlatform>;
}

const admin: PlatformAdmin = {
  scope: "SUPERUSER",
  status: "ACTIVE",
  mfaFresh: true,
  mfaExpiresAt: new Date(Date.now() + 3_600_000).toISOString(),
};

describe("Console gate", () => {
  beforeEach(() => {
    vi.mocked(listOrganizations).mockResolvedValue([]);
  });

  it("shows a spinner while the session is still resolving", () => {
    vi.mocked(usePlatform).mockReturnValue(platformValue({ loading: true }));
    render(<App />);
    expect(screen.getByRole("status", { name: "Loading" })).toBeInTheDocument();
  });

  it("shows the sign-in form when there is no session", () => {
    vi.mocked(usePlatform).mockReturnValue(platformValue());
    render(<App />);
    expect(screen.getByRole("button", { name: "Sign in" })).toBeInTheDocument();
  });

  // The security-relevant cases: neither of these may render the console.
  it("refuses a signed-in user who is not a platform administrator", () => {
    vi.mocked(usePlatform).mockReturnValue(
      platformValue({ session: {} as never, admin: null })
    );
    render(<App />);
    expect(screen.getByText("No access")).toBeInTheDocument();
    expect(screen.queryByRole("navigation", { name: "Main" })).not.toBeInTheDocument();
  });

  it("holds a real administrator at the MFA step when the second factor is stale", () => {
    vi.mocked(usePlatform).mockReturnValue(
      platformValue({ session: {} as never, admin: { ...admin, mfaFresh: false } })
    );
    render(<App />);
    expect(screen.getByText("Second factor required")).toBeInTheDocument();
    // Rendering the console here would show a convincing but entirely empty
    // platform, because every platform_* RPC returns nothing without MFA.
    expect(screen.queryByRole("navigation", { name: "Main" })).not.toBeInTheDocument();
    expect(screen.queryByRole("navigation", { name: "Main" })).not.toBeInTheDocument();
  });

  it("renders the console only once an administrator has a fresh second factor", () => {
    vi.mocked(usePlatform).mockReturnValue(
      platformValue({ session: {} as never, admin })
    );
    render(<App />);
    expect(screen.getByRole("navigation", { name: "Main" })).toBeInTheDocument();
    // The console opens on the platform overview, which is the first item
    // in the design's navigation order.
    expect(screen.getByRole("heading", { name: "Platform overview" })).toBeInTheDocument();
  });
});
