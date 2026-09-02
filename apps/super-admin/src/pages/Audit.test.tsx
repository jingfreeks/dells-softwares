import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Audit } from "./Audit";
import { listPlatformAudit, usePlatform } from "../lib/platform";

vi.mock("../lib/platform", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../lib/platform")>();
  return { ...actual, usePlatform: vi.fn(), listPlatformAudit: vi.fn() };
});

const mockedUsePlatform = vi.mocked(usePlatform);
const mockedAudit = vi.mocked(listPlatformAudit);

const ROWS = [
  {
    id: 1,
    actorEmail: "one@example.test",
    action: "PLATFORM_ADMIN_MFA_VERIFIED",
    entityType: "platform_admin",
    entityId: "aaa",
    reason: null,
    createdAt: "2026-08-30T02:00:00.000Z",
    oldData: null,
    newData: { scope: "SUPERUSER" },
    ipAddress: "203.0.113.7",
    userAgent: "Mozilla/5.0 (Macintosh)",
  },
  {
    id: 2,
    actorEmail: "two@example.test",
    action: "ACCOUNT_DELETION_APPROVED",
    entityType: "deletion_request",
    entityId: "bbb",
    reason: "verified by phone",
    createdAt: "2026-08-10T02:00:00.000Z",
    oldData: null,
    newData: null,
    ipAddress: null,
    userAgent: null,
  },
] as never;

/** The action name also appears as an <option> in the Action filter, so
 *  row assertions are scoped to the results region. */
function table() {
  return within(screen.getByRole("region", { name: "Audit events" }));
}

beforeEach(() => {
  vi.clearAllMocks();
  mockedUsePlatform.mockReturnValue({ admin: { scope: "SUPERUSER" } } as never);
  mockedAudit.mockResolvedValue(ROWS);
});

describe("Audit", () => {
  it("lists platform events", async () => {
    render(<Audit />);
    await screen.findByRole("region", { name: "Audit events" });
    expect(table().getByText("PLATFORM_ADMIN_MFA_VERIFIED")).toBeInTheDocument();
    expect(table().getByText("ACCOUNT_DELETION_APPROVED")).toBeInTheDocument();
  });

  it("refuses the log to a scope that cannot read it", async () => {
    // Mirrors the RLS policy: BILLING legitimately gets nothing, and the
    // page says so rather than showing an empty table that looks like
    // "no events have ever happened".
    mockedUsePlatform.mockReturnValue({ admin: { scope: "BILLING" } } as never);
    render(<Audit />);
    expect(await screen.findByText(/can't read the platform audit/i)).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Audit events" })).not.toBeInTheDocument();
  });

  describe("filters actually filter", () => {
    it("narrows by free-text search", async () => {
      const user = userEvent.setup();
      render(<Audit />);
      await table().findByText("PLATFORM_ADMIN_MFA_VERIFIED");

      await user.type(screen.getByLabelText("Search"), "deletion");

      expect(table().getByText("ACCOUNT_DELETION_APPROVED")).toBeInTheDocument();
      expect(table().queryByText("PLATFORM_ADMIN_MFA_VERIFIED")).not.toBeInTheDocument();
    });

    it("narrows by action", async () => {
      const user = userEvent.setup();
      render(<Audit />);
      await table().findByText("PLATFORM_ADMIN_MFA_VERIFIED");

      await user.selectOptions(screen.getByLabelText("Action"), "ACCOUNT_DELETION_APPROVED");

      expect(table().getByText("ACCOUNT_DELETION_APPROVED")).toBeInTheDocument();
      expect(table().queryByText("PLATFORM_ADMIN_MFA_VERIFIED")).not.toBeInTheDocument();
    });

    it("narrows by actor", async () => {
      const user = userEvent.setup();
      render(<Audit />);
      await table().findByText("PLATFORM_ADMIN_MFA_VERIFIED");

      await user.selectOptions(screen.getByLabelText("Actor"), "one@example.test");

      expect(table().getByText("PLATFORM_ADMIN_MFA_VERIFIED")).toBeInTheDocument();
      expect(table().queryByText("ACCOUNT_DELETION_APPROVED")).not.toBeInTheDocument();
    });

    it("narrows by date, excluding anything older", async () => {
      const user = userEvent.setup();
      render(<Audit />);
      await table().findByText("PLATFORM_ADMIN_MFA_VERIFIED");

      await user.type(screen.getByLabelText("Since"), "2026-08-20");

      expect(table().getByText("PLATFORM_ADMIN_MFA_VERIFIED")).toBeInTheDocument();
      expect(table().queryByText("ACCOUNT_DELETION_APPROVED")).not.toBeInTheDocument();
    });

    it("explains an empty filtered result rather than looking like an empty log", async () => {
      const user = userEvent.setup();
      render(<Audit />);
      await table().findByText("PLATFORM_ADMIN_MFA_VERIFIED");

      await user.type(screen.getByLabelText("Search"), "zzzz-no-match");

      expect(screen.getByText("No audit event matches these filters.")).toBeInTheDocument();
    });

    it("restores the full list when filters are cleared", async () => {
      const user = userEvent.setup();
      render(<Audit />);
      await table().findByText("PLATFORM_ADMIN_MFA_VERIFIED");

      await user.type(screen.getByLabelText("Search"), "deletion");
      await user.click(screen.getByRole("button", { name: /clear filters/i }));

      expect(table().getByText("PLATFORM_ADMIN_MFA_VERIFIED")).toBeInTheDocument();
      expect(table().getByText("ACCOUNT_DELETION_APPROVED")).toBeInTheDocument();
    });
  });

  describe("detail", () => {
    it("expands a row to show the recorded fields", async () => {
      const user = userEvent.setup();
      render(<Audit />);
      const row = await screen.findByRole("button", { name: /ACCOUNT_DELETION_APPROVED/ });

      await user.click(row);

      expect(row).toHaveAttribute("aria-expanded", "true");
      const detail = within(screen.getByRole("region", { name: "Audit event detail" }));
      expect(detail.getByText("deletion_request")).toBeInTheDocument();
      expect(detail.getByText("bbb")).toBeInTheDocument();
      expect(detail.getByText("verified by phone")).toBeInTheDocument();
    });

    it("offers no way to edit or delete an audit row", async () => {
      // §28: the log is append-only and protected by a database trigger.
      const user = userEvent.setup();
      render(<Audit />);
      const row = await screen.findByRole("button", { name: /ACCOUNT_DELETION_APPROVED/ });
      await user.click(row);

      expect(screen.queryByRole("button", { name: /edit|delete|remove/i })).not.toBeInTheDocument();
      expect(screen.getByText(/append-only/i)).toBeInTheDocument();
    });

    it("shows the before/after snapshot and request metadata the row carries", async () => {
      // core.platform_audit_logs always stored these; platform_audit() did not
      // project them until 20260902110000, and the console said they were
      // unavailable. They were unprojected, not unavailable.
      const user = userEvent.setup();
      render(<Audit />);
      await user.click(await screen.findByRole("button", { name: /PLATFORM_ADMIN_MFA_VERIFIED/ }));

      const detail = within(screen.getByRole("region", { name: "Audit event detail" }));
      expect(detail.getByText(/SUPERUSER/)).toBeInTheDocument();
      expect(detail.getByText("203.0.113.7")).toBeInTheDocument();
      expect(detail.getByText(/Mozilla/)).toBeInTheDocument();
    });

    it("says an action had no prior state rather than rendering an empty box", async () => {
      // A grant has no "before". Blank would read as missing data.
      const user = userEvent.setup();
      render(<Audit />);
      await user.click(await screen.findByRole("button", { name: /PLATFORM_ADMIN_MFA_VERIFIED/ }));

      const detail = within(screen.getByRole("region", { name: "Audit event detail" }));
      expect(detail.getByText("none recorded")).toBeInTheDocument();
    });

    it("says so plainly when a row carries no snapshot or request metadata at all", async () => {
      const user = userEvent.setup();
      render(<Audit />);
      await user.click(await screen.findByRole("button", { name: /ACCOUNT_DELETION_APPROVED/ }));

      expect(
        screen.getByText(/carries no before\/after snapshot or request metadata/i)
      ).toBeInTheDocument();
    });
  });

  it("explains an empty log", async () => {
    mockedAudit.mockResolvedValue([] as never);
    render(<Audit />);
    expect(await screen.findByText("No platform actions recorded yet.")).toBeInTheDocument();
  });

  it("reports a failed load", async () => {
    mockedAudit.mockRejectedValue(new Error("nope"));
    render(<Audit />);
    expect(await screen.findByRole("alert")).toHaveTextContent(/Unable to load the audit log|nope/);
  });
});
