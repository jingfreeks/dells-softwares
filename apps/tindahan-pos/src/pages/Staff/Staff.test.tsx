import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { useAuth, useStoreData, useCan, supabase } from "@/lib";
import { makeAuthValue, makeStaffAccount, makeStoreDataValue, makeSaleRecord } from "../../test/testUtils";
import { Staff } from "./Staff";

vi.mock("@/lib/auth", () => ({ useAuth: vi.fn() }));
vi.mock("@/lib/storeData", () => ({ useStoreData: vi.fn() }));
vi.mock("@/lib/permissions", () => ({ useCan: vi.fn(), usePermissions: () => ({ permissions: new Set(), loading: false }) }));

vi.mock("@/lib/supabaseClient", () => {
  const order2 = vi.fn();
  const order1 = vi.fn(() => ({ order: order2 }));
  // Staff select is used two ways: the roster fetch chains `.order().order()`,
  // while useAuditLog's actor-name lookup awaits the select() result directly
  // — so the returned value needs to be both thenable and `.order`-chainable.
  const select = vi.fn(() => Object.assign(Promise.resolve({ data: [], error: null }), { order: order1 }));
  const deleteEqFn = vi.fn();
  const deleteFn = vi.fn(() => ({ eq: deleteEqFn }));
  const updateEqFn = vi.fn().mockResolvedValue({ error: null });
  const updateFn = vi.fn(() => ({ eq: updateEqFn }));

  const auditLogSelect = vi.fn(() => ({
    order: vi.fn(() => ({ limit: vi.fn(() => Promise.resolve({ data: [], error: null })) })),
  }));
  const salesSelect = vi.fn(() => ({ in: vi.fn(() => Promise.resolve({ data: [], error: null })) }));

  // cashier_sessions is queried three different ways across this page
  // (useOpenShifts: .is().order(); closedShiftsThisWeek: .not().gte().lte().order();
  // useShiftHistory: .order().limit()) — every chain method returns the same
  // stub so it's both chainable in any order and thenable, resolving empty
  // by default.
  function makeQueryStub(result: { data: unknown; error: unknown } = { data: [], error: null }) {
    const stub = {
      is: vi.fn(() => stub),
      not: vi.fn(() => stub),
      gte: vi.fn(() => stub),
      lte: vi.fn(() => stub),
      order: vi.fn(() => stub),
      limit: vi.fn(() => stub),
      then: (resolve: (value: { data: unknown; error: unknown }) => void) => Promise.resolve(result).then(resolve),
    };
    return stub;
  }
  const cashierSessionsSelect = vi.fn(() => makeQueryStub());

  const from = vi.fn((table: string) => {
    if (table === "audit_log") return { select: auditLogSelect };
    if (table === "sales") return { select: salesSelect };
    if (table === "cashier_sessions") return { select: cashierSessionsSelect };
    return { select, delete: deleteFn, update: updateFn };
  });
  const rpc = vi.fn();
  return {
    supabase: {
      from,
      rpc,
      auth: { getSession: vi.fn() },
      functions: { invoke: vi.fn() },
      __mocks: {
        order1,
        order2,
        select,
        from,
        deleteFn,
        deleteEqFn,
        updateFn,
        updateEqFn,
        rpc,
        auditLogSelect,
        salesSelect,
        cashierSessionsSelect,
      },
    },
  };
});

type MockedSupabase = typeof supabase & {
  __mocks: {
    order1: ReturnType<typeof vi.fn>;
    order2: ReturnType<typeof vi.fn>;
    select: ReturnType<typeof vi.fn>;
    from: ReturnType<typeof vi.fn>;
    deleteFn: ReturnType<typeof vi.fn>;
    deleteEqFn: ReturnType<typeof vi.fn>;
    updateFn: ReturnType<typeof vi.fn>;
    updateEqFn: ReturnType<typeof vi.fn>;
    rpc: ReturnType<typeof vi.fn>;
    auditLogSelect: ReturnType<typeof vi.fn>;
    salesSelect: ReturnType<typeof vi.fn>;
    cashierSessionsSelect: ReturnType<typeof vi.fn>;
  };
};

const mockedSupabase = supabase as MockedSupabase;

const staffRows = [
  { id: "staff-1", name: "Aling Nena", email: "nena@example.com", role: "admin", active: true, pin_hash: null },
  { id: "staff-2", name: "Cashier Joy", email: "joy@example.com", role: "cashier", active: true, pin_hash: null },
];

function renderStaff() {
  return render(
    <MemoryRouter initialEntries={["/staff"]}>
      <Routes>
        <Route path="/staff" element={<Staff />} />
        <Route path="/pos" element={<p>POS page</p>} />
      </Routes>
    </MemoryRouter>
  );
}

describe("Staff", () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue(makeAuthValue({ user: makeStaffAccount({ role: "admin" }) }));
    vi.mocked(useStoreData).mockReturnValue(makeStoreDataValue());
    vi.mocked(useCan).mockReturnValue(true);
    mockedSupabase.__mocks.order2.mockResolvedValue({ data: staffRows, error: null });
  });

  /** Opens the Add Staff modal. */
  async function openAddStaffModal(user: ReturnType<typeof userEvent.setup>) {
    await user.click(screen.getByRole("button", { name: "Add staff" }));
  }

  /** Opens a staff row's "More actions" menu and returns the scope to query its items in. */
  async function openRowMenu(user: ReturnType<typeof userEvent.setup>, rowName: string | RegExp) {
    const row = within(screen.getByRole("row", { name: rowName }));
    await user.click(row.getByRole("button", { name: "More actions" }));
    return row;
  }

  it("redirects a cashier away from the staff page", () => {
    vi.mocked(useAuth).mockReturnValue(makeAuthValue({ user: makeStaffAccount({ role: "cashier" }) }));
    vi.mocked(useCan).mockReturnValue(false);
    renderStaff();
    expect(screen.getByText("POS page")).toBeInTheDocument();
  });

  it("loads and displays the staff roster", async () => {
    renderStaff();
    expect(await screen.findByText("Aling Nena")).toBeInTheDocument();
    expect(screen.getByText("Cashier Joy")).toBeInTheDocument();
    expect(screen.getByText("(you)")).toBeInTheDocument();
  });

  it("shows a load error", async () => {
    mockedSupabase.__mocks.order2.mockResolvedValue({ data: null, error: { message: "Network down" } });
    renderStaff();
    expect(await screen.findByRole("alert")).toHaveTextContent("Network down");
  });

  it("shows an empty state when there is no staff", async () => {
    mockedSupabase.__mocks.order2.mockResolvedValue({ data: [], error: null });
    renderStaff();
    expect(await screen.findByText("No staff yet.")).toBeInTheDocument();
  });

  it("validates the add-staff form before submitting", async () => {
    const user = userEvent.setup();
    renderStaff();
    await screen.findByText("Aling Nena");
    await openAddStaffModal(user);

    await user.click(screen.getByRole("button", { name: "Create account" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Name and email are required.");
  });

  it("creates a cashier account with a silently generated password", async () => {
    const user = userEvent.setup();
    vi.mocked(mockedSupabase.auth.getSession).mockResolvedValue({
      data: { session: { access_token: "tok" } },
    } as never);
    vi.mocked(mockedSupabase.functions.invoke).mockResolvedValue({ data: {}, error: null } as never);
    renderStaff();
    await screen.findByText("Aling Nena");
    await openAddStaffModal(user);

    await user.type(screen.getByLabelText("Name"), "Joy");
    await user.type(screen.getByLabelText("Email address"), "joy2@example.com");
    await user.click(screen.getByRole("button", { name: "Create account" }));

    await waitFor(() => expect(mockedSupabase.functions.invoke).toHaveBeenCalled());
    const body = vi.mocked(mockedSupabase.functions.invoke).mock.calls[0][1]?.body as { password: string };
    expect(body).toMatchObject({ name: "Joy", email: "joy2@example.com" });
    expect(body.password.length).toBeGreaterThanOrEqual(8);
  });

  it("shows an error returned by the create-cashier function", async () => {
    const user = userEvent.setup();
    vi.mocked(mockedSupabase.auth.getSession).mockResolvedValue({
      data: { session: null },
    } as never);
    vi.mocked(mockedSupabase.functions.invoke).mockResolvedValue({
      data: { error: "Email already in use" },
      error: null,
    } as never);
    renderStaff();
    await screen.findByText("Aling Nena");
    await openAddStaffModal(user);

    await user.type(screen.getByLabelText("Name"), "Joy");
    await user.type(screen.getByLabelText("Email address"), "joy2@example.com");
    await user.click(screen.getByRole("button", { name: "Create account" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Email already in use");
  });

  it("selects a role and updates the permission preview", async () => {
    const user = userEvent.setup();
    renderStaff();
    await screen.findByText("Aling Nena");
    await openAddStaffModal(user);

    // "Owner" was removed from this picker — create-cashier never creates an
    // owner account (see StaffRoleSelection in lib.ts), so only the two real,
    // assignable roles remain: cashier and supervisor.
    expect(screen.getByText("A CASHIER CAN")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Supervisor + stock, voids" }));
    expect(screen.getByText("A SUPERVISOR CAN")).toBeInTheDocument();
  });

  it("selects a sign-in method", async () => {
    const user = userEvent.setup();
    renderStaff();
    await screen.findByText("Aling Nena");
    await openAddStaffModal(user);

    const pinTablet = screen.getByRole("button", { name: "PIN on this tablet Fastest at the counter" });
    const pinEmail = screen.getByRole("button", { name: "PIN + email Can also use own phone" });
    expect(pinTablet).toHaveAttribute("aria-pressed", "true");
    expect(pinEmail).toHaveAttribute("aria-pressed", "false");

    await user.click(pinEmail);
    expect(pinEmail).toHaveAttribute("aria-pressed", "true");
    expect(pinTablet).toHaveAttribute("aria-pressed", "false");
  });

  it("selects a usual shift", async () => {
    const user = userEvent.setup();
    renderStaff();
    await screen.findByText("Aling Nena");
    await openAddStaffModal(user);

    const morning = screen.getByRole("button", { name: "Morning · 7 AM–2 PM" });
    const afternoon = screen.getByRole("button", { name: "Afternoon" });
    expect(morning).toHaveAttribute("aria-pressed", "true");

    await user.click(afternoon);
    expect(afternoon).toHaveAttribute("aria-pressed", "true");
    expect(morning).toHaveAttribute("aria-pressed", "false");
  });

  it("toggles drawer counting, defaulting to on", async () => {
    const user = userEvent.setup();
    renderStaff();
    await screen.findByText("Aling Nena");
    await openAddStaffModal(user);

    const toggle = screen.getByRole("switch", { name: "Count the drawer at shift start and end" });
    expect(toggle).toHaveAttribute("aria-checked", "true");

    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-checked", "false");
  });

  it("removes a cashier", async () => {
    const user = userEvent.setup();
    mockedSupabase.__mocks.deleteEqFn.mockResolvedValue({ error: null });
    renderStaff();
    await screen.findByText("Cashier Joy");

    const row = await openRowMenu(user, "Cashier Joy");
    await user.click(row.getByRole("menuitem", { name: "Remove" }));
    await waitFor(() => expect(mockedSupabase.__mocks.deleteEqFn).toHaveBeenCalledWith("id", "staff-2"));
  });

  it("shows an error when removing a cashier fails", async () => {
    const user = userEvent.setup();
    mockedSupabase.__mocks.deleteEqFn.mockResolvedValue({ error: { message: "Could not remove" } });
    renderStaff();
    await screen.findByText("Cashier Joy");

    const row = await openRowMenu(user, "Cashier Joy");
    await user.click(row.getByRole("menuitem", { name: "Remove" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Could not remove");
  });

  it("sets a cashier's PIN via admin_set_staff_pin", async () => {
    const user = userEvent.setup();
    mockedSupabase.__mocks.rpc.mockResolvedValue({ error: null });
    renderStaff();
    await screen.findByText("Cashier Joy");

    const row = await openRowMenu(user, "Cashier Joy");
    await user.click(row.getByRole("menuitem", { name: "Set PIN" }));

    const dialog = await screen.findByRole("dialog");
    for (const digit of ["1", "2", "3", "4"]) {
      await user.click(within(dialog).getByRole("button", { name: digit }));
    }
    for (const digit of ["1", "2", "3", "4"]) {
      await user.click(within(dialog).getByRole("button", { name: digit }));
    }

    await waitFor(() =>
      expect(mockedSupabase.__mocks.rpc).toHaveBeenCalledWith("admin_set_staff_pin", {
        p_staff_id: "staff-2",
        p_pin: "1234",
      })
    );
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("shows an error when setting a PIN fails", async () => {
    const user = userEvent.setup();
    mockedSupabase.__mocks.rpc.mockResolvedValue({ error: { message: "Could not save this PIN." } });
    renderStaff();
    await screen.findByText("Cashier Joy");

    const row = await openRowMenu(user, "Cashier Joy");
    await user.click(row.getByRole("menuitem", { name: "Set PIN" }));

    const dialog = await screen.findByRole("dialog");
    for (const digit of ["1", "2", "3", "4"]) {
      await user.click(within(dialog).getByRole("button", { name: digit }));
    }
    for (const digit of ["1", "2", "3", "4"]) {
      await user.click(within(dialog).getByRole("button", { name: digit }));
    }

    expect(await within(dialog).findByRole("alert")).toHaveTextContent("Could not save this PIN.");
  });

  it("deactivates a cashier", async () => {
    const user = userEvent.setup();
    renderStaff();
    await screen.findByText("Cashier Joy");

    const row = await openRowMenu(user, "Cashier Joy");
    await user.click(row.getByRole("menuitem", { name: "Deactivate" }));

    await waitFor(() => expect(mockedSupabase.__mocks.updateFn).toHaveBeenCalledWith({ active: false }));
    expect(mockedSupabase.__mocks.updateEqFn).toHaveBeenCalledWith("id", "staff-2");
  });

  it("shows the real voided-sales count and total for this week", async () => {
    const voided = makeSaleRecord({
      id: "sale-voided-1",
      status: "voided",
      total: 132,
      receiptNumber: "000009",
      cashierName: "Cashier Joy",
      voidReason: "Wrong item",
      voidedAt: "2026-08-14T10:00:00Z",
    });
    vi.mocked(useStoreData).mockReturnValue(
      makeStoreDataValue({ fetchSalesInRange: vi.fn().mockResolvedValue([voided]) })
    );
    renderStaff();

    expect(await screen.findByText("1")).toBeInTheDocument();
    expect(screen.getByText("₱132.00 total")).toBeInTheDocument();
  });

  it("opens the voids-this-week modal listing the real voided sales", async () => {
    const user = userEvent.setup();
    const voided = makeSaleRecord({
      id: "sale-voided-1",
      status: "voided",
      total: 132,
      receiptNumber: "000009",
      cashierName: "Cashier Joy",
      voidReason: "Wrong item",
      voidedAt: "2026-08-14T10:00:00Z",
    });
    vi.mocked(useStoreData).mockReturnValue(
      makeStoreDataValue({ fetchSalesInRange: vi.fn().mockResolvedValue([voided]) })
    );
    renderStaff();
    await screen.findByText("Aling Nena");

    await waitFor(() => expect(screen.getByText("₱132.00 total")).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: /voids this week/i }));

    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("Cashier Joy")).toBeInTheDocument();
    expect(within(dialog).getByText("000009")).toBeInTheDocument();
    expect(within(dialog).getByText("Wrong item")).toBeInTheDocument();
  });

  it("scrolls to the staff table when Staff Accounts is clicked", async () => {
    const user = userEvent.setup();
    const scrollIntoView = vi.fn();
    HTMLElement.prototype.scrollIntoView = scrollIntoView;
    renderStaff();
    await screen.findByText("Aling Nena");

    await user.click(screen.getByRole("button", { name: /staff accounts/i }));
    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: "smooth", block: "start" });
  });

  it("opens the edit role modal and saves the price-edit permission", async () => {
    const user = userEvent.setup();
    const updateStore = vi.fn().mockResolvedValue({ ok: true });
    vi.mocked(useAuth).mockReturnValue(
      makeAuthValue({ user: makeStaffAccount({ role: "admin" }), updateStore })
    );
    renderStaff();
    await screen.findByText("Aling Nena");

    await user.click(screen.getByRole("button", { name: "Edit role" }));
    const dialog = await screen.findByRole("dialog", { name: "Edit role" });
    await user.click(within(dialog).getByRole("switch", { name: "Cashiers can edit prices" }));
    await user.click(within(dialog).getByRole("button", { name: "Save" }));

    expect(updateStore).toHaveBeenCalledWith({ cashierCanEditPrices: true });
  });
});
