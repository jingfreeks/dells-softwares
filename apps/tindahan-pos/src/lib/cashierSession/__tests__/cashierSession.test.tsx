import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CashierSessionProvider } from "../cashierSession";
import { useCashierSession } from "../cashierSessionContext";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabaseClient";

vi.mock("@/lib/auth", () => ({ useAuth: vi.fn() }));
vi.mock("@/lib/supabaseClient", () => ({ supabase: { rpc: vi.fn() } }));

const mockedSupabase = supabase as unknown as { rpc: ReturnType<typeof vi.fn> };

function Probe() {
  const { activeCashier, cashierToken, startCashierSession, endCashierSession, reportExpiredSession } =
    useCashierSession();
  return (
    <div>
      <p data-testid="active-cashier">{activeCashier ? activeCashier.name : "none"}</p>
      <p data-testid="token">{cashierToken ?? "none"}</p>
      <button onClick={() => startCashierSession("staff-2", "1234")}>start</button>
      <button onClick={() => endCashierSession()}>end</button>
      <button onClick={() => reportExpiredSession()}>expire</button>
    </div>
  );
}

function renderProbe() {
  return render(
    <CashierSessionProvider>
      <Probe />
    </CashierSessionProvider>
  );
}

beforeEach(() => {
  window.sessionStorage.clear();
  vi.mocked(useAuth).mockReturnValue({ user: { id: "admin-1" } } as unknown as ReturnType<typeof useAuth>);
});

describe("CashierSessionProvider", () => {
  it("starts with no active cashier", () => {
    renderProbe();
    expect(screen.getByTestId("active-cashier")).toHaveTextContent("none");
    expect(screen.getByTestId("token")).toHaveTextContent("none");
  });

  it("sets the active cashier and token after a successful PIN check", async () => {
    const user = userEvent.setup();
    mockedSupabase.rpc.mockResolvedValue({
      data: [
        {
          ok: true,
          error_code: null,
          token: "tok-abc",
          staff_id: "staff-2",
          name: "Maricel",
          role: "cashier",
          avatar_url: null,
          expires_at: new Date(Date.now() + 1000 * 60 * 60).toISOString(),
        },
      ],
      error: null,
    });
    renderProbe();

    await user.click(screen.getByText("start"));

    await waitFor(() => expect(screen.getByTestId("active-cashier")).toHaveTextContent("Maricel"));
    expect(screen.getByTestId("token")).toHaveTextContent("tok-abc");
    expect(mockedSupabase.rpc).toHaveBeenCalledWith("start_cashier_session", { p_staff_id: "staff-2", p_pin: "1234" });
  });

  it("does not set an active cashier when the PIN check fails", async () => {
    const user = userEvent.setup();
    mockedSupabase.rpc.mockResolvedValue({
      data: [{ ok: false, error_code: "INVALID_PIN", token: null, staff_id: null, name: null, role: null, avatar_url: null, expires_at: null }],
      error: null,
    });
    renderProbe();

    await user.click(screen.getByText("start"));

    expect(screen.getByTestId("active-cashier")).toHaveTextContent("none");
  });

  it("clears the active cashier on endCashierSession", async () => {
    const user = userEvent.setup();
    mockedSupabase.rpc.mockResolvedValue({
      data: [
        {
          ok: true,
          error_code: null,
          token: "tok-abc",
          staff_id: "staff-2",
          name: "Maricel",
          role: "cashier",
          avatar_url: null,
          expires_at: new Date(Date.now() + 1000 * 60 * 60).toISOString(),
        },
      ],
      error: null,
    });
    renderProbe();
    await user.click(screen.getByText("start"));
    await waitFor(() => expect(screen.getByTestId("active-cashier")).toHaveTextContent("Maricel"));

    mockedSupabase.rpc.mockResolvedValue({ data: null, error: null });
    await user.click(screen.getByText("end"));

    expect(screen.getByTestId("active-cashier")).toHaveTextContent("none");
    expect(mockedSupabase.rpc).toHaveBeenCalledWith("end_cashier_session", { p_token: "tok-abc" });
  });

  it("clears the active cashier on reportExpiredSession without calling the server", async () => {
    const user = userEvent.setup();
    mockedSupabase.rpc.mockResolvedValue({
      data: [
        {
          ok: true,
          error_code: null,
          token: "tok-abc",
          staff_id: "staff-2",
          name: "Maricel",
          role: "cashier",
          avatar_url: null,
          expires_at: new Date(Date.now() + 1000 * 60 * 60).toISOString(),
        },
      ],
      error: null,
    });
    renderProbe();
    await user.click(screen.getByText("start"));
    await waitFor(() => expect(screen.getByTestId("active-cashier")).toHaveTextContent("Maricel"));
    mockedSupabase.rpc.mockClear();

    await user.click(screen.getByText("expire"));

    expect(screen.getByTestId("active-cashier")).toHaveTextContent("none");
    expect(mockedSupabase.rpc).not.toHaveBeenCalled();
  });

  it("persists the active cashier across a remount within the same tab", async () => {
    const user = userEvent.setup();
    mockedSupabase.rpc.mockResolvedValue({
      data: [
        {
          ok: true,
          error_code: null,
          token: "tok-abc",
          staff_id: "staff-2",
          name: "Maricel",
          role: "cashier",
          avatar_url: null,
          expires_at: new Date(Date.now() + 1000 * 60 * 60).toISOString(),
        },
      ],
      error: null,
    });
    const { unmount } = renderProbe();
    await user.click(screen.getByText("start"));
    await waitFor(() => expect(screen.getByTestId("active-cashier")).toHaveTextContent("Maricel"));
    unmount();

    renderProbe();
    expect(screen.getByTestId("active-cashier")).toHaveTextContent("Maricel");
  });

  it("clears a persisted session when the signed-in staff member changes", async () => {
    const user = userEvent.setup();
    mockedSupabase.rpc.mockResolvedValue({
      data: [
        {
          ok: true,
          error_code: null,
          token: "tok-abc",
          staff_id: "staff-2",
          name: "Maricel",
          role: "cashier",
          avatar_url: null,
          expires_at: new Date(Date.now() + 1000 * 60 * 60).toISOString(),
        },
      ],
      error: null,
    });
    const { rerender } = renderProbe();
    await user.click(screen.getByText("start"));
    await waitFor(() => expect(screen.getByTestId("active-cashier")).toHaveTextContent("Maricel"));

    vi.mocked(useAuth).mockReturnValue({ user: { id: "admin-2" } } as unknown as ReturnType<typeof useAuth>);
    rerender(
      <CashierSessionProvider>
        <Probe />
      </CashierSessionProvider>
    );

    await waitFor(() => expect(screen.getByTestId("active-cashier")).toHaveTextContent("none"));
  });
});
