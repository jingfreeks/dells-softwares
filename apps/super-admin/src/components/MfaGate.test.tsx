import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PlatformProvider } from "../lib/platform";
import { MfaGate } from "./Shell";

const auth = {
  getSession: vi.fn(),
  onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
  mfa: {
    listFactors: vi.fn(),
    enroll: vi.fn(),
    unenroll: vi.fn().mockResolvedValue({ data: {}, error: null }),
    challenge: vi.fn(),
    verify: vi.fn(),
  },
};
const rpc = vi.fn();

vi.mock("../lib/supabaseClient", () => ({
  supabase: {
    auth: {
      getSession: (...args: unknown[]) => auth.getSession(...args),
      onAuthStateChange: (...args: unknown[]) => auth.onAuthStateChange(...args),
      mfa: {
        listFactors: (...args: unknown[]) => auth.mfa.listFactors(...args),
        enroll: (...args: unknown[]) => auth.mfa.enroll(...args),
        unenroll: (...args: unknown[]) => auth.mfa.unenroll(...args),
        challenge: (...args: unknown[]) => auth.mfa.challenge(...args),
        verify: (...args: unknown[]) => auth.mfa.verify(...args),
      },
    },
    rpc: (...args: unknown[]) => rpc(...args),
  },
}));

const session = { user: { id: "admin-1" } };

function renderGate() {
  return render(
    <PlatformProvider>
      <MfaGate />
    </PlatformProvider>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  auth.onAuthStateChange.mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } });
  auth.getSession.mockResolvedValue({ data: { session } });
  auth.mfa.unenroll.mockResolvedValue({ data: {}, error: null });
  rpc.mockResolvedValue({ data: [{ scope: "SUPERUSER", status: "ACTIVE", mfa_fresh: false, mfa_expires_at: null }], error: null });
});

describe("MfaGate", () => {
  it("shows the QR enrollment screen for an account with no factor enrolled yet", async () => {
    auth.mfa.listFactors.mockResolvedValue({ data: { all: [] }, error: null });
    auth.mfa.enroll.mockResolvedValue({
      data: { id: "factor-1", totp: { qr_code: "data:image/svg+xml;utf-8,<svg>qr</svg>", secret: "ABCD1234" } },
      error: null,
    });
    renderGate();

    expect(await screen.findByRole("heading", { name: "Set up your second factor" })).toBeInTheDocument();
    expect(screen.getByText("ABCD1234")).toBeInTheDocument();
    expect(auth.mfa.enroll).toHaveBeenCalledWith({ factorType: "totp" });
    // Regression coverage: Supabase's qr_code is a complete data: URI, not
    // raw SVG markup -- it must be used as an <img> src, not dumped into
    // dangerouslySetInnerHTML (which rendered the URI's own text prefix
    // visibly above the code, confirmed live on staging).
    expect(screen.getByRole("img", { name: "Scan with your authenticator app" })).toHaveAttribute(
      "src",
      "data:image/svg+xml;utf-8,<svg>qr</svg>"
    );
  });

  it("drops a leftover unverified factor (e.g. an abandoned enrollment) before issuing a fresh one", async () => {
    // Regression coverage for a real bug hit live on staging: listFactors()'s
    // `totp` bucket is pre-filtered to VERIFIED factors only -- an
    // unverified one only shows up in `.all`. Reading `.totp` here silently
    // missed the stale factor and GoTrue then refused the second enroll
    // ("A factor with the friendly name ... already exists"); its secret
    // can't be retrieved again either way, so unenrolling it first is the
    // only way forward.
    auth.mfa.listFactors.mockResolvedValue({
      data: { all: [{ id: "stale-factor", factor_type: "totp", status: "unverified" }] },
      error: null,
    });
    auth.mfa.enroll.mockResolvedValue({
      data: { id: "factor-2", totp: { qr_code: "data:image/svg+xml;utf-8,<svg>qr</svg>", secret: "FRESH1234" } },
      error: null,
    });
    renderGate();

    expect(await screen.findByRole("heading", { name: "Set up your second factor" })).toBeInTheDocument();
    expect(auth.mfa.unenroll).toHaveBeenCalledWith({ factorId: "stale-factor" });
    expect(screen.getByText("FRESH1234")).toBeInTheDocument();
  });

  it("skips straight to the code challenge for an account with an existing verified factor", async () => {
    auth.mfa.listFactors.mockResolvedValue({
      data: { all: [{ id: "factor-9", factor_type: "totp", status: "verified" }] },
      error: null,
    });
    renderGate();

    expect(await screen.findByRole("heading", { name: "Second factor required" })).toBeInTheDocument();
    expect(screen.queryByText(/Can't scan/)).not.toBeInTheDocument();
    expect(auth.mfa.enroll).not.toHaveBeenCalled();
  });

  it("verifies a code against the existing factor and stamps mfa_verified_at on success", async () => {
    auth.mfa.listFactors.mockResolvedValue({
      data: { all: [{ id: "factor-9", factor_type: "totp", status: "verified" }] },
      error: null,
    });
    auth.mfa.challenge.mockResolvedValue({ data: { id: "challenge-1" }, error: null });
    auth.mfa.verify.mockResolvedValue({ data: {}, error: null });
    rpc.mockResolvedValue({ error: null });
    const user = userEvent.setup();
    renderGate();

    await screen.findByRole("heading", { name: "Second factor required" });
    await user.type(screen.getByLabelText("Authentication code"), "123456");
    await user.click(screen.getByRole("button", { name: "Verify second factor" }));

    await waitFor(() =>
      expect(auth.mfa.verify).toHaveBeenCalledWith({
        factorId: "factor-9",
        challengeId: "challenge-1",
        code: "123456",
      })
    );
    expect(rpc).toHaveBeenCalledWith("platform_verify_mfa");
  });

  it("shows an error and clears the code when the challenge is rejected", async () => {
    auth.mfa.listFactors.mockResolvedValue({
      data: { all: [{ id: "factor-9", factor_type: "totp", status: "verified" }] },
      error: null,
    });
    auth.mfa.challenge.mockResolvedValue({ data: { id: "challenge-1" }, error: null });
    auth.mfa.verify.mockResolvedValue({ data: null, error: { message: "Invalid TOTP code entered" } });
    const user = userEvent.setup();
    renderGate();

    await screen.findByRole("heading", { name: "Second factor required" });
    await user.type(screen.getByLabelText("Authentication code"), "000000");
    await user.click(screen.getByRole("button", { name: "Verify second factor" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Invalid TOTP code entered");
    expect(screen.getByLabelText("Authentication code")).toHaveValue("");
  });
});
