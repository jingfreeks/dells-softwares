import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { useAuth, supabase } from "@/lib";
import { makeAuthValue, makeStaffAccount } from "../../test/testUtils";
import { Staff } from "./Staff";

vi.mock("@/lib/auth", () => ({ useAuth: vi.fn() }));

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
    mockedSupabase.__mocks.order2.mockResolvedValue({ data: staffRows, error: null });
  });

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

  it("validates the add-cashier form before submitting", async () => {
    const user = userEvent.setup();
    renderStaff();
    await screen.findByText("Aling Nena");

    await user.click(screen.getByRole("button", { name: "Create cashier account" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Name and email are required.");
  });

  it("validates a too-short password", async () => {
    const user = userEvent.setup();
    renderStaff();
    await screen.findByText("Aling Nena");

    await user.type(screen.getByLabelText("Name"), "Joy");
    await user.type(screen.getByLabelText("Email address"), "joy2@example.com");
    await user.type(screen.getByLabelText("Temporary password"), "123");
    await user.click(screen.getByRole("button", { name: "Create cashier account" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("at least 8 characters");
  });

  it("creates a cashier account", async () => {
    const user = userEvent.setup();
    vi.mocked(mockedSupabase.auth.getSession).mockResolvedValue({
      data: { session: { access_token: "tok" } },
    } as never);
    vi.mocked(mockedSupabase.functions.invoke).mockResolvedValue({ data: {}, error: null } as never);
    renderStaff();
    await screen.findByText("Aling Nena");

    await user.type(screen.getByLabelText("Name"), "Joy");
    await user.type(screen.getByLabelText("Email address"), "joy2@example.com");
    await user.type(screen.getByLabelText("Temporary password"), "secret678");
    await user.click(screen.getByRole("button", { name: "Create cashier account" }));

    await waitFor(() => expect(mockedSupabase.functions.invoke).toHaveBeenCalled());
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

    await user.type(screen.getByLabelText("Name"), "Joy");
    await user.type(screen.getByLabelText("Email address"), "joy2@example.com");
    await user.type(screen.getByLabelText("Temporary password"), "secret678");
    await user.click(screen.getByRole("button", { name: "Create cashier account" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Email already in use");
  });

  it("removes a cashier", async () => {
    const user = userEvent.setup();
    mockedSupabase.__mocks.deleteEqFn.mockResolvedValue({ error: null });
    renderStaff();
    await screen.findByText("Cashier Joy");

    await user.click(screen.getByRole("button", { name: "Remove" }));
    await waitFor(() => expect(mockedSupabase.__mocks.deleteEqFn).toHaveBeenCalledWith("id", "staff-2"));
  });

  it("shows an error when removing a cashier fails", async () => {
    const user = userEvent.setup();
    mockedSupabase.__mocks.deleteEqFn.mockResolvedValue({ error: { message: "Could not remove" } });
    renderStaff();
    await screen.findByText("Cashier Joy");

    await user.click(screen.getByRole("button", { name: "Remove" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Could not remove");
  });
});
