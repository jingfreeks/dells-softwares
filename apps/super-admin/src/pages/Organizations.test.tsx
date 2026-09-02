import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { Organizations } from "./Organizations";
import { listOrganizations } from "../lib/platform";

vi.mock("../lib/platform", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../lib/platform")>();
  return { ...actual, listOrganizations: vi.fn() };
});

const mockedOrgs = vi.mocked(listOrganizations);

function org(over: Record<string, unknown> = {}) {
  return {
    organizationId: "org-1",
    name: "Aling Nena's Sari-Sari Store",
    status: "ACTIVE",
    createdAt: "2026-08-01T00:00:00.000Z",
    planCode: "BUSINESS",
    subscriptionStatus: "ACTIVE",
    branchCount: 1,
    staffCount: 3,
    enabledModules: [],
    ...over,
  } as never;
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/organizations"]}>
      <Routes>
        <Route path="/organizations" element={<Organizations />} />
        <Route path="/organizations/:orgId" element={<p>detail page</p>} />
      </Routes>
    </MemoryRouter>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mockedOrgs.mockResolvedValue([org()] as never);
});

describe("Organizations", () => {
  it("lists tenants with plan, status and staff count", async () => {
    renderPage();
    expect(await screen.findByText("Aling Nena's Sari-Sari Store")).toBeInTheDocument();
    expect(screen.getByText("BUSINESS")).toBeInTheDocument();
    expect(screen.getByText("Active")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("shows the organization id, since the backend returns no owner email", async () => {
    // The design's second line is the owner's email.
    // platform_organizations() does not return one, so rather than leave
    // the line blank or invent an address, the row carries the id — the
    // thing a support conversation actually needs to quote.
    renderPage();
    expect(await screen.findByText("org-1")).toBeInTheDocument();
  });

  it("labels a cancelled organization as cancelled even if its subscription says otherwise", async () => {
    // The organization's own status outranks its subscription row, the
    // same precedence core.org_writes_allowed() applies.
    mockedOrgs.mockResolvedValue([org({ status: "CANCELLED", subscriptionStatus: "ACTIVE" })] as never);
    renderPage();
    expect(await screen.findByText("Cancelled")).toBeInTheDocument();
    expect(screen.queryByText("Active")).not.toBeInTheDocument();
  });

  it("says 'No plan' rather than leaving the cell blank", async () => {
    mockedOrgs.mockResolvedValue([org({ planCode: null })] as never);
    renderPage();
    expect(await screen.findByText("No plan")).toBeInTheDocument();
  });

  it("opens the organization when its row is activated", async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByRole("button", { name: /Aling Nena/ }));
    expect(screen.getByText("detail page")).toBeInTheDocument();
  });

  it("filters by name", async () => {
    const user = userEvent.setup();
    mockedOrgs.mockResolvedValue([
      org({ organizationId: "a", name: "Aling Nena" }),
      org({ organizationId: "b", name: "Kuya Jun" }),
    ] as never);
    renderPage();
    await screen.findByText("Aling Nena");

    await user.type(screen.getByLabelText("Search organizations"), "kuya");

    expect(screen.getByText("Kuya Jun")).toBeInTheDocument();
    expect(screen.queryByText("Aling Nena")).not.toBeInTheDocument();
  });

  it("explains a search that matches nothing", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText("Aling Nena's Sari-Sari Store");

    await user.type(screen.getByLabelText("Search organizations"), "zzz");

    expect(screen.getByText(/No organization matches/)).toBeInTheDocument();
  });

  it("explains an empty platform", async () => {
    mockedOrgs.mockResolvedValue([] as never);
    renderPage();
    expect(await screen.findByText("No organizations yet.")).toBeInTheDocument();
  });

  it("reports a failed load rather than showing an empty table", async () => {
    mockedOrgs.mockRejectedValue(new Error("nope"));
    renderPage();
    expect(await screen.findByRole("alert")).toHaveTextContent(/Unable to load organizations|nope/);
  });
});
