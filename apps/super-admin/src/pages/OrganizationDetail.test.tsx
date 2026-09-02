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
  listOrganizationAudit,
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
    listOrganizationAudit: vi.fn(),
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
  vi.mocked(listOrganizationAudit).mockResolvedValue([] as never);
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

  it("offers both a Users and an Activity tab", async () => {
    // Both are backed now: platform_organization_staff() (20260902150000)
    // and platform_organization_audit() (20260902160000).
    renderPage();
    await screen.findByText(/Aling Nena/);

    expect(screen.getByRole("tab", { name: "Users" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Activity" })).toBeInTheDocument();
  });

  it("lists the platform actions recorded against this organization", async () => {
    const user = userEvent.setup();
    vi.mocked(listOrganizationAudit).mockResolvedValue([
      {
        id: 9,
        actorEmail: "eng@example.test",
        action: "PLATFORM_ENABLE_MODULE",
        entityType: "OrganizationModule",
        entityId: "org-1",
        reason: "paid upgrade",
        createdAt: "2026-08-30T02:00:00.000Z",
        oldData: null,
        newData: null,
        ipAddress: null,
        userAgent: null,
      },
    ] as never);
    renderPage();
    await screen.findByText(/Aling Nena/);
    await user.click(screen.getByRole("tab", { name: "Activity" }));

    expect(screen.getByText("PLATFORM_ENABLE_MODULE")).toBeInTheDocument();
    expect(screen.getByText(/paid upgrade/)).toBeInTheDocument();
  });

  it("says why administrator events are absent rather than implying a partial log", async () => {
    // Grants, revocations and MFA verifications belong to no organization.
    // That is a fact about the data, not a coverage gap.
    const user = userEvent.setup();
    renderPage();
    await screen.findByText(/Aling Nena/);
    await user.click(screen.getByRole("tab", { name: "Activity" }));

    expect(screen.getByText(/belong to no organization/i)).toBeInTheDocument();
  });

  it("refuses the tenant's activity to a scope that cannot read the audit log", async () => {
    mockedUsePlatform.mockReturnValue({ admin: { scope: "BILLING" } } as never);
    const user = userEvent.setup();
    renderPage();
    await screen.findByText(/Aling Nena/);
    await user.click(screen.getByRole("tab", { name: "Activity" }));

    expect(screen.getByText(/can't read the platform audit/i)).toBeInTheDocument();
    expect(vi.mocked(listOrganizationAudit)).not.toHaveBeenCalled();
  });

  it("distinguishes an empty history from a refused one", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText(/Aling Nena/);
    await user.click(screen.getByRole("tab", { name: "Activity" }));

    expect(
      screen.getByText("No platform action has been recorded against this organization.")
    ).toBeInTheDocument();
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

