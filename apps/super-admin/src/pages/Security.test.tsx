import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { Security } from "./Security";
import { listPlatformAudit, usePlatform } from "../lib/platform";

vi.mock("../lib/platform", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../lib/platform")>();
  return { ...actual, usePlatform: vi.fn(), listPlatformAudit: vi.fn() };
});

const mockedUsePlatform = vi.mocked(usePlatform);
const mockedAudit = vi.mocked(listPlatformAudit);

const IN_8H = new Date(Date.now() + 7 * 3600_000).toISOString();

function setAdmin(scope: string, over: Record<string, unknown> = {}) {
  mockedUsePlatform.mockReturnValue({
    admin: { scope, status: "ACTIVE", mfaFresh: true, mfaExpiresAt: IN_8H, ...over },
    session: { user: { email: "admin@example.test" } },
    getMfaStatus: vi.fn().mockResolvedValue({ enrolled: true, factorId: "factor-1" }),
  } as never);
}

function renderPage() {
  return render(
    <MemoryRouter>
      <Security />
    </MemoryRouter>
  );
}

/** The scope name also appears as a group heading ("Billing" uppercased),
 *  so scope assertions are scoped to the session card. */
function session() {
  return within(screen.getByRole("region", { name: "This session" }));
}

/** Waits for the scope-dependent render and proves the heading names the
 *  scope the matrix is being computed for. */
async function awaitScope(scope: string) {
  return screen.findByRole("heading", { name: `What ${scope} authorizes` });
}

/** Capability rows carry their verdict as visually-hidden text, so the
 *  assertion reads the same thing a screen reader would. */
function capability(label: string): string {
  const row = screen.getAllByRole("listitem").find((el) => el.textContent?.startsWith(label));
  if (!row) throw new Error(`no capability row starting with "${label}"`);
  return row.textContent ?? "";
}

beforeEach(() => {
  vi.clearAllMocks();
  mockedAudit.mockResolvedValue([] as never);
  setAdmin("SUPERUSER");
});

describe("Security", () => {
  it("shows who you are acting as and how long the authority lasts", async () => {
    setAdmin("ENGINEER");
    renderPage();
    await awaitScope("ENGINEER");
    expect(session().getByText("admin@example.test")).toBeInTheDocument();
    expect(session().getByText("ENGINEER")).toBeInTheDocument();
    expect(session().getByText(/Valid for \d+h/)).toBeInTheDocument();
  });

  it("calls an elapsed MFA window expired rather than showing a stale expiry", async () => {
    setAdmin("ENGINEER", { mfaExpiresAt: new Date(Date.now() - 60_000).toISOString(), mfaFresh: false });
    renderPage();
    await awaitScope("ENGINEER");
    expect(session().getByText("Expired")).toBeInTheDocument();
  });

  it("reports the account's real authenticator state", async () => {
    renderPage();
    expect(await screen.findByText("Enrolled and verified")).toBeInTheDocument();
    expect(screen.getByText("factor-1")).toBeInTheDocument();
  });

  it("offers no way to drop the only factor and lock the account out", async () => {
    renderPage();
    await screen.findByText("Enrolled and verified");
    expect(screen.queryByRole("button", { name: /unenroll|remove|delete|reset/i })).not.toBeInTheDocument();
  });

  describe("the capability matrix follows the checks the database actually runs", () => {
    it("grants BILLING the billing operations and withholds the engineer ones", async () => {
      setAdmin("BILLING");
      renderPage();
      await awaitScope("BILLING");

      expect(capability("Change a plan")).toContain("— permitted");
      expect(capability("Override a feature or a limit")).toContain("— permitted");
      expect(capability("Read the platform audit log")).toContain("— not permitted");
      expect(capability("Approve a deletion request")).toContain("— not permitted");
    });

    it("grants ENGINEER the deletion and audit operations and withholds billing", async () => {
      setAdmin("ENGINEER");
      renderPage();
      await awaitScope("ENGINEER");

      expect(capability("Read the platform audit log")).toContain("— permitted");
      expect(capability("Approve a deletion request")).toContain("— permitted");
      expect(capability("Change a plan")).toContain("— not permitted");
    });

    it("grants SUPERUSER everything, including what SUPERUSER alone can do", async () => {
      renderPage();
      await awaitScope("SUPERUSER");

      expect(capability("Change a plan")).toContain("— permitted");
      expect(capability("Read the platform audit log")).toContain("— permitted");
      expect(capability("Grant or revoke a platform administrator")).toContain("— permitted");
    });

    it("gives SUPPORT only the unscoped reads", async () => {
      setAdmin("SUPPORT");
      renderPage();
      await awaitScope("SUPPORT");

      expect(capability("View organizations")).toContain("— permitted");
      expect(capability("Change a plan")).toContain("— not permitted");
      expect(capability("Grant or revoke a platform administrator")).toContain("— not permitted");
    });

    it("shows module toggling as unscoped, which is what the function really does", async () => {
      // platform_set_module gates on core.is_platform_admin() with no scope
      // argument, unlike every other entitlement RPC. Issue #415. The matrix
      // reports the check that runs, not the one that ought to.
      setAdmin("SUPPORT");
      renderPage();
      await awaitScope("SUPPORT");

      const row = capability("Enable or disable a module");
      expect(row).toContain("— permitted");
      expect(row).toMatch(/Known gap, issue #415/);
    });
  });

  describe("administrator identity events", () => {
    it("is withheld from a scope that cannot read the audit log", async () => {
      setAdmin("BILLING");
      renderPage();
      await awaitScope("BILLING");

      expect(
        screen.queryByRole("region", { name: "Administrator identity events" })
      ).not.toBeInTheDocument();
      expect(mockedAudit).not.toHaveBeenCalled();
    });

    it("shows identity events and leaves the rest to the audit page", async () => {
      mockedAudit.mockResolvedValue([
        {
          id: 1,
          action: "PLATFORM_ADMIN_MFA_VERIFIED",
          actorEmail: "admin@example.test",
          entityType: "platform_admin",
          entityId: "a",
          reason: null,
          createdAt: "2026-08-30T02:00:00.000Z",
        },
        {
          id: 2,
          action: "ACCOUNT_DELETION_APPROVED",
          actorEmail: "admin@example.test",
          entityType: "deletion_request",
          entityId: "b",
          reason: null,
          createdAt: "2026-08-29T02:00:00.000Z",
        },
      ] as never);
      renderPage();

      expect(await screen.findByText("PLATFORM_ADMIN_MFA_VERIFIED")).toBeInTheDocument();
      expect(screen.queryByText("ACCOUNT_DELETION_APPROVED")).not.toBeInTheDocument();
      expect(screen.getByRole("link", { name: "Full audit" })).toHaveAttribute("href", "/audit");
    });
  });

  it("names the things it cannot show instead of implying they are fine", async () => {
    renderPage();
    await awaitScope("SUPERUSER");

    // The roster is no longer among these: platform_admins() (20260902140000)
    // returns it, and the dashboard shows it. Listing it here would be the
    // same fabrication in reverse -- claiming a gap that has been closed.
    expect(screen.queryByText("The list of platform administrators")).not.toBeInTheDocument();
    expect(screen.getByText("Your other active sessions and devices")).toBeInTheDocument();
    expect(screen.getByText("Database and infrastructure posture")).toBeInTheDocument();
  });

  it("asserts no infrastructure posture it cannot observe", async () => {
    renderPage();
    await awaitScope("SUPERUSER");
    // Guards against the design's reassuring green "RLS enabled / encrypted"
    // tiles creeping back in: the browser cannot verify any of it.
    expect(screen.queryByText(/RLS|encrypt|hardened|compliant/i)).not.toBeInTheDocument();
  });
});
