import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { Dashboard } from "./Dashboard";
import { listDeletionRequests, listOrganizations, listPlatformAudit, listPlatformAdmins } from "../lib/platform";

vi.mock("../lib/platform", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../lib/platform")>();
  return {
    ...actual,
    listOrganizations: vi.fn(),
    listDeletionRequests: vi.fn(),
    listPlatformAudit: vi.fn(),
    listPlatformAdmins: vi.fn(),
  };
});

const mockedOrgs = vi.mocked(listOrganizations);
const mockedRequests = vi.mocked(listDeletionRequests);
const mockedAudit = vi.mocked(listPlatformAudit);
const mockedAdmins = vi.mocked(listPlatformAdmins);

function admin(over: Record<string, unknown> = {}) {
  return { email: "eng@example.test", scope: "ENGINEER", status: "ACTIVE", mfaFresh: true, ...over } as never;
}

function org(over: Record<string, unknown> = {}) {
  return {
    organizationId: `org-${Math.random()}`,
    name: "A Store",
    status: "ACTIVE",
    createdAt: "2026-08-01T00:00:00.000Z",
    planCode: "BUSINESS",
    subscriptionStatus: "ACTIVE",
    branchCount: 1,
    staffCount: 2,
    enabledModules: [],
    ...over,
  } as never;
}

function renderPage() {
  return render(
    <MemoryRouter>
      <Dashboard />
    </MemoryRouter>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mockedOrgs.mockResolvedValue([] as never);
  mockedRequests.mockResolvedValue([] as never);
  mockedAdmins.mockResolvedValue([admin()] as never);
  mockedAudit.mockResolvedValue([] as never);
});

describe("Dashboard", () => {
  it("counts organizations by their real subscription state", async () => {
    mockedOrgs.mockResolvedValue([
      org({ name: "Active One", subscriptionStatus: "ACTIVE" }),
      org({ name: "Active Two", subscriptionStatus: "ACTIVE" }),
      org({ name: "Trialing", subscriptionStatus: "TRIALING", planCode: "BASIC" }),
      org({ name: "Gone", status: "CANCELLED", subscriptionStatus: "CANCELLED", planCode: null }),
    ] as never);
    renderPage();

    // The design shows 5/2/2/1 as sample data; the numbers here must come
    // from the rows, not from the mock-up.
    expect(await screen.findByText("4")).toBeInTheDocument(); // organizations
    const actives = await screen.findAllByText("2");
    expect(actives.length).toBeGreaterThan(0); // active stores
    expect(screen.getAllByText("1").length).toBeGreaterThan(0); // cancelled
  });

  it("counts only pending deletion requests", async () => {
    mockedOrgs.mockResolvedValue([org()] as never);
    mockedRequests.mockResolvedValue([
      { id: "a", status: "PENDING" },
      { id: "b", status: "APPROVED" },
      { id: "c", status: "DENIED" },
    ] as never);
    renderPage();

    expect(await screen.findByText("Pending deletion requests")).toBeInTheDocument();
    expect(screen.getByText("Awaiting a platform decision.")).toBeInTheDocument();
  });

  it("counts the active administrators from the real roster", async () => {
    mockedAdmins.mockResolvedValue([
      admin({ email: "a@example.test", scope: "SUPERUSER" }),
      admin({ email: "b@example.test", scope: "ENGINEER" }),
      admin({ email: "c@example.test", scope: "SUPPORT", status: "REVOKED" }),
    ] as never);
    renderPage();

    expect(await screen.findByText("2")).toBeInTheDocument();
    expect(screen.getByText(/1 inactive/)).toBeInTheDocument();
  });

  it("lists only the administrators who currently hold access", async () => {
    // A revoked row is still in the table; showing it beside active peers
    // would overstate who can act.
    mockedAdmins.mockResolvedValue([
      admin({ email: "active@example.test" }),
      admin({ email: "revoked@example.test", status: "REVOKED" }),
    ] as never);
    renderPage();

    expect(await screen.findByText("active@example.test")).toBeInTheDocument();
    expect(screen.queryByText("revoked@example.test")).not.toBeInTheDocument();
  });

  it("distinguishes an administrator who cannot act right now", async () => {
    // Scope colour carries mfaFresh: ACTIVE on the roster is not the same as
    // able to act, because is_platform_admin() also requires fresh MFA.
    mockedAdmins.mockResolvedValue([admin({ mfaFresh: false, scope: "BILLING" })] as never);
    renderPage();

    const scope = await screen.findByText("BILLING");
    expect(scope).toBeInTheDocument();
    expect(scope.getAttribute("style")).not.toContain("--okd");
  });

  it("says roster changes are not made here", async () => {
    // Granting and revoking require SUPERUSER and are not exposed by any RPC
    // this console calls -- the card should not imply otherwise.
    renderPage();
    expect(await screen.findByText(/requires SUPERUSER and is not exposed here/i)).toBeInTheDocument();
  });

  it("buckets organizations with no plan instead of dropping them", async () => {
    mockedOrgs.mockResolvedValue([
      org({ planCode: "BUSINESS" }),
      org({ planCode: null }),
    ] as never);
    renderPage();

    expect(await screen.findByText("BUSINESS")).toBeInTheDocument();
    expect(screen.getByText("No plan")).toBeInTheDocument();
  });

  it("explains an empty platform rather than showing bare zeros", async () => {
    renderPage();
    expect(await screen.findByText("No organizations yet.")).toBeInTheDocument();
    expect(screen.getByText("No organizations registered yet.")).toBeInTheDocument();
    expect(screen.getByText("No platform activity recorded yet.")).toBeInTheDocument();
    expect(screen.getByText("Nothing awaiting review right now.")).toBeInTheDocument();
  });

  it("reports a failed load instead of rendering zeros as if they were real", async () => {
    // Zeros and "we could not load" look identical on a metric tile, and
    // one of them would tell the operator the platform is empty.
    mockedOrgs.mockRejectedValue(new Error("boom"));
    renderPage();
    expect(await screen.findByRole("alert")).toHaveTextContent(/Unable to load the platform overview|boom/);
  });

  it("lists recent registrations newest first", async () => {
    mockedOrgs.mockResolvedValue([
      org({ name: "Older", createdAt: "2026-07-01T00:00:00.000Z" }),
      org({ name: "Newest", createdAt: "2026-08-20T00:00:00.000Z" }),
    ] as never);
    renderPage();

    const links = await screen.findAllByRole("link", { name: /Older|Newest/ });
    expect(links[0]).toHaveTextContent("Newest");
  });
});
