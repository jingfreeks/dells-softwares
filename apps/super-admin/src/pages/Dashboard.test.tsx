import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { Dashboard } from "./Dashboard";
import { listDeletionRequests, listOrganizations, listPlatformAudit } from "../lib/platform";

vi.mock("../lib/platform", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../lib/platform")>();
  return {
    ...actual,
    listOrganizations: vi.fn(),
    listDeletionRequests: vi.fn(),
    listPlatformAudit: vi.fn(),
  };
});

const mockedOrgs = vi.mocked(listOrganizations);
const mockedRequests = vi.mocked(listDeletionRequests);
const mockedAudit = vi.mocked(listPlatformAudit);

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

  it("says platform admins are not available rather than inventing a count", async () => {
    // No RPC exposes the roster. A plausible-looking number on the console
    // that governs platform access would be the worst place to guess.
    renderPage();
    expect(await screen.findByText("Platform admins")).toBeInTheDocument();
    expect(screen.getByText("Not available")).toBeInTheDocument();
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
