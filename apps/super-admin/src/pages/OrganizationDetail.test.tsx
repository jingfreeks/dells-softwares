import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { OrganizationDetail } from "./OrganizationDetail";
import {
  listOrganizations,
  listOrganizationModules,
  listOrganizationFeatures,
  listOrganizationLimits,
  listOrganizationStaff,
  listPlans,
  setSubscriptionStatus,
  usePlatform,
} from "../lib/platform";

vi.mock("../lib/platform", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../lib/platform")>();
  return {
    ...actual,
    usePlatform: vi.fn(),
    listOrganizations: vi.fn(),
    listOrganizationModules: vi.fn(),
    listOrganizationFeatures: vi.fn(),
    listOrganizationLimits: vi.fn(),
    listOrganizationStaff: vi.fn(),
    listPlans: vi.fn(),
    setSubscriptionStatus: vi.fn(),
    setPlan: vi.fn(),
    setModule: vi.fn(),
    setFeature: vi.fn(),
    setLimit: vi.fn(),
  };
});

const mockedUsePlatform = vi.mocked(usePlatform);
const mockedOrgs = vi.mocked(listOrganizations);
const mockedStatus = vi.mocked(setSubscriptionStatus);

const ORG = {
  organizationId: "org-1",
  name: "Aling Nena's Sari-Sari Store",
  status: "ACTIVE",
  createdAt: "2026-08-01T00:00:00.000Z",
  planCode: "BUSINESS",
  subscriptionStatus: "ACTIVE",
  branchCount: 1,
  staffCount: 3,
  enabledModules: ["POS"],
} as never;

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/organizations/org-1"]}>
      <Routes>
        <Route path="/organizations/:orgId" element={<OrganizationDetail />} />
      </Routes>
    </MemoryRouter>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mockedUsePlatform.mockReturnValue({ admin: { scope: "SUPERUSER" } } as never);
  mockedOrgs.mockResolvedValue([ORG] as never);
  vi.mocked(listOrganizationModules).mockResolvedValue([] as never);
  vi.mocked(listOrganizationFeatures).mockResolvedValue([] as never);
  vi.mocked(listOrganizationLimits).mockResolvedValue([] as never);
  vi.mocked(listPlans).mockResolvedValue([] as never);
  vi.mocked(listOrganizationStaff).mockResolvedValue([] as never);
  mockedStatus.mockResolvedValue(undefined as never);
});

/** Billing lives on the Subscription tab; Overview is the landing tab. */
async function openSubscription(user: ReturnType<typeof userEvent.setup>) {
  await screen.findByText(/Aling Nena/);
  await user.click(screen.getByRole("tab", { name: "Subscription" }));
}

describe("OrganizationDetail — billing state", () => {
  it("shows the organization and marks its current billing state", async () => {
    const user = userEvent.setup();
    renderPage();
    expect(await screen.findByText(/Aling Nena's Sari-Sari Store/)).toBeInTheDocument();
    await openSubscription(user);
    expect(screen.getByRole("button", { name: /ACTIVE ·\s*current/i })).toBeDisabled();
  });

  it("suspends the tenant with the operator's reason", async () => {
    const user = userEvent.setup();
    renderPage();
    await openSubscription(user);

    const reason = screen.getByPlaceholderText(/pilot customer/i);
    await user.type(reason, "non-payment, ticket #91");
    await user.click(screen.getByRole("button", { name: /^SUSPENDED$/ }));

    await waitFor(() =>
      expect(mockedStatus).toHaveBeenCalledWith("org-1", "SUSPENDED", "non-payment, ticket #91")
    );
  });

  it("reloads after a status change so the page cannot show a stale state", async () => {
    const user = userEvent.setup();
    renderPage();
    await openSubscription(user);

    await user.click(screen.getByRole("button", { name: /^SUSPENDED$/ }));
    // Suspension is the lever that stops a tenant transacting; the page
    // must reflect what the server actually recorded, not what was asked.
    await waitFor(() => expect(mockedOrgs).toHaveBeenCalledTimes(2));
  });

  it("does not re-send the status the tenant is already on", async () => {
    const user = userEvent.setup();
    renderPage();
    await openSubscription(user);

    // The current state's button is disabled, so no request is issued.
    await user.click(screen.getByRole("button", { name: /ACTIVE ·\s*current/i }));
    expect(mockedStatus).not.toHaveBeenCalled();
  });

  it("surfaces a refused change instead of appearing to succeed", async () => {
    // The server gates billing actions on is_platform_admin('BILLING'),
    // so an admin without that scope gets UNAUTHORIZED_ACTION. The
    // operator has to see that rather than assume the tenant is suspended.
    mockedStatus.mockRejectedValue(new Error("UNAUTHORIZED_ACTION"));
    const user = userEvent.setup();
    renderPage();
    await openSubscription(user);

    await user.click(screen.getByRole("button", { name: /^SUSPENDED$/ }));

    expect(await screen.findByText(/UNAUTHORIZED_ACTION/)).toBeInTheDocument();
    // And the page still shows ACTIVE as current — no optimistic flip.
    expect(screen.getByRole("button", { name: /ACTIVE ·\s*current/i })).toBeDisabled();
  });

  it("reports a failed load rather than rendering an empty organization", async () => {
    mockedOrgs.mockRejectedValue(new Error("Could not reach the platform API."));
    renderPage();
    expect(await screen.findByText(/Could not reach the platform API\./)).toBeInTheDocument();
  });
});

describe("OrganizationDetail — sections", () => {
  it("lands on the overview", async () => {
    renderPage();
    await screen.findByText(/Aling Nena/);
    expect(screen.getByRole("tab", { name: "Overview" })).toHaveAttribute("aria-selected", "true");
  });

  it("moves between sections", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText(/Aling Nena/);

    await user.click(screen.getByRole("tab", { name: "Modules" }));

    expect(screen.getByRole("tab", { name: "Modules" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: "Overview" })).toHaveAttribute("aria-selected", "false");
    expect(screen.queryByRole("button", { name: /^SUSPENDED$/ })).not.toBeInTheDocument();
  });

  it("offers a Users tab, and still no Activity tab, saying why", async () => {
    // Users is backed by platform_organization_staff() (20260902150000).
    // Activity stays omitted: only some platform actions carry the
    // organization id in entity_id, so a tab built on that filter would show
    // a partial history while looking complete.
    renderPage();
    await screen.findByText(/Aling Nena/);

    expect(screen.getByRole("tab", { name: "Users" })).toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: "Activity" })).not.toBeInTheDocument();
    expect(screen.getByText(/no organization filter/i)).toBeInTheDocument();
  });

  it("shows the RBAC role rather than only the coarse enum", async () => {
    // A SUPERVISOR and a CASHIER are both `cashier` to staff.role, and hold
    // 15 permissions and none. Showing the enum alone would mislead.
    const user = userEvent.setup();
    vi.mocked(listOrganizationStaff).mockResolvedValue([
      {
        staffId: "s1",
        name: "Nena",
        email: "nena@example.test",
        authRole: "cashier",
        rbacRole: "SUPERVISOR",
        active: true,
        pinLocked: false,
        createdAt: "2026-08-01T00:00:00.000Z",
      },
    ] as never);
    renderPage();
    await screen.findByText(/Aling Nena/);
    await user.click(screen.getByRole("tab", { name: "Users" }));

    expect(screen.getByText("Nena")).toBeInTheDocument();
    expect(screen.getByText("SUPERVISOR")).toBeInTheDocument();
  });

  it("lists a deactivated staff member rather than hiding them", async () => {
    // They still hold historical sales; hiding them would make a tenant's
    // own records look unattributed.
    const user = userEvent.setup();
    vi.mocked(listOrganizationStaff).mockResolvedValue([
      {
        staffId: "s2",
        name: "Gone",
        email: "gone@example.test",
        authRole: "cashier",
        rbacRole: "CASHIER",
        active: false,
        pinLocked: false,
        createdAt: "2026-08-01T00:00:00.000Z",
      },
    ] as never);
    renderPage();
    await screen.findByText(/Aling Nena/);
    await user.click(screen.getByRole("tab", { name: "Users" }));

    expect(screen.getByText("Gone")).toBeInTheDocument();
    expect(screen.getByText("deactivated")).toBeInTheDocument();
  });

  it("flags a staff member who is locked out right now", async () => {
    const user = userEvent.setup();
    vi.mocked(listOrganizationStaff).mockResolvedValue([
      {
        staffId: "s3",
        name: "Locked",
        email: "locked@example.test",
        authRole: "cashier",
        rbacRole: "CASHIER",
        active: true,
        pinLocked: true,
        createdAt: "2026-08-01T00:00:00.000Z",
      },
    ] as never);
    renderPage();
    await screen.findByText(/Aling Nena/);
    await user.click(screen.getByRole("tab", { name: "Users" }));

    expect(screen.getByText("PIN locked")).toBeInTheDocument();
  });

  it("explains an organization with no staff rather than showing a blank tab", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText(/Aling Nena/);
    await user.click(screen.getByRole("tab", { name: "Users" }));

    expect(screen.getByText("No staff records for this organization.")).toBeInTheDocument();
  });
});

