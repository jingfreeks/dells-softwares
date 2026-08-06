import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { useAuth, useStoreData, supabase } from "@/lib";
import { makeAuthValue, makeStaffAccount, makeStoreDataValue } from "../../test/testUtils";
import { Staff } from "./Staff";

vi.mock("@/lib/auth", () => ({ useAuth: vi.fn() }));
vi.mock("@/lib/storeData", () => ({ useStoreData: vi.fn() }));

vi.mock("@/lib/supabaseClient", () => {
  const order2 = vi.fn();
  const order1 = vi.fn(() => ({ order: order2 }));
  const select = vi.fn(() => ({ order: order1 }));
  const from = vi.fn(() => ({ select, delete: deleteFn }));
  const deleteEqFn = vi.fn();
  const deleteFn = vi.fn(() => ({ eq: deleteEqFn }));
  return {
    supabase: {
      from,
      auth: { getSession: vi.fn() },
      functions: { invoke: vi.fn() },
      __mocks: { order1, order2, select, from, deleteFn, deleteEqFn },
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
  };
};

const mockedSupabase = supabase as MockedSupabase;

const staffRows = [
  { id: "staff-1", name: "Aling Nena", email: "nena@example.com", role: "admin" },
  { id: "staff-2", name: "Cashier Joy", email: "joy@example.com", role: "cashier" },
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

    expect(screen.getByText("A CASHIER CAN")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Supervisor + stock, voids" }));
    expect(screen.getByText("A SUPERVISOR CAN")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Owner Everything" }));
    expect(screen.getByText("AN OWNER CAN")).toBeInTheDocument();
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

  it("generates a 4-digit PIN and can regenerate it", async () => {
    const user = userEvent.setup();
    renderStaff();
    await screen.findByText("Aling Nena");
    await openAddStaffModal(user);

    const digits = () => screen.getAllByTestId("pin-digit");
    expect(digits()).toHaveLength(4);
    const firstPin = digits().map((el) => el.textContent).join("");
    expect(firstPin).toMatch(/^\d{4}$/);

    await user.click(screen.getByRole("button", { name: /Generate another/ }));
    const secondPin = digits().map((el) => el.textContent).join("");
    expect(secondPin).toMatch(/^\d{4}$/);
  });

  it("copies the PIN to the clipboard", async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { ...navigator, clipboard: { writeText } });
    renderStaff();
    await screen.findByText("Aling Nena");
    await openAddStaffModal(user);

    await user.click(screen.getByRole("button", { name: "Copy PIN" }));
    expect(writeText).toHaveBeenCalledWith(expect.stringMatching(/^\d{4}$/));
    expect(await screen.findByText("Copied!")).toBeInTheDocument();
    vi.unstubAllGlobals();
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
});
