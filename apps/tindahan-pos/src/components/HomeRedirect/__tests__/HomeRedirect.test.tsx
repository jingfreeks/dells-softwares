import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { useAuth } from "@/lib";
import { makeAuthValue, makeStaffAccount } from "../../../test/testUtils";
import { HomeRedirect } from "../HomeRedirect";

vi.mock("@/lib/auth", () => ({ useAuth: vi.fn() }));
vi.mock("@/pages/Landing", () => ({ Landing: () => <p>Landing page</p> }));

const useBillingState = vi.fn();
vi.mock("@/lib/billing", () => ({ useBillingState: () => useBillingState() }));

const rpc = vi.fn().mockResolvedValue({ data: null, error: null });
vi.mock("@/lib/supabaseClient", () => ({ supabase: { rpc: (...args: unknown[]) => rpc(...args) } }));

beforeEach(() => {
  useBillingState.mockReset().mockReturnValue(null);
  rpc.mockClear();
});

function renderHome(route = "/") {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <Routes>
        <Route path="/" element={<HomeRedirect />} />
        <Route path="/login" element={<p>Login page</p>} />
        <Route path="/admin" element={<p>Dashboard page</p>} />
        <Route path="/pos" element={<p>POS page</p>} />
      </Routes>
    </MemoryRouter>
  );
}

describe("HomeRedirect", () => {
  it("shows a loading spinner while auth is resolving", () => {
    vi.mocked(useAuth).mockReturnValue(makeAuthValue({ loading: true, user: null }));
    renderHome();
    expect(screen.getByRole("status", { name: "Loading" })).toBeInTheDocument();
  });

  it("shows the Landing page to a signed-out visitor", () => {
    vi.mocked(useAuth).mockReturnValue(makeAuthValue({ loading: false, user: null }));
    renderHome();
    expect(screen.getByText("Landing page")).toBeInTheDocument();
  });

  it("sends an admin to the Dashboard", () => {
    vi.mocked(useAuth).mockReturnValue(
      makeAuthValue({ loading: false, user: makeStaffAccount({ role: "admin" }) })
    );
    renderHome();
    expect(screen.getByText("Dashboard page")).toBeInTheDocument();
  });

  it("sends a cashier to the POS register", () => {
    vi.mocked(useAuth).mockReturnValue(
      makeAuthValue({ loading: false, user: makeStaffAccount({ role: "cashier" }) })
    );
    renderHome();
    expect(screen.getByText("POS page")).toBeInTheDocument();
  });

  describe("?plan= carried through a Google OAuth redirect", () => {
    it("starts the trial for a signed-in user landing with a trialable plan code", async () => {
      vi.mocked(useAuth).mockReturnValue(
        makeAuthValue({ loading: false, user: makeStaffAccount({ role: "admin" }) })
      );
      renderHome("/?plan=BUSINESS");
      await screen.findByText("Dashboard page");
      expect(rpc).toHaveBeenCalledWith("start_trial", { p_plan_code: "BUSINESS" });
    });

    it("ignores an unknown or missing plan code", () => {
      vi.mocked(useAuth).mockReturnValue(
        makeAuthValue({ loading: false, user: makeStaffAccount({ role: "admin" }) })
      );
      renderHome("/?plan=NOT_A_REAL_PLAN");
      expect(rpc).not.toHaveBeenCalled();
    });

    it("does not start a second trial if the store is already trialing", () => {
      useBillingState.mockReturnValue({
        organizationStatus: "ACTIVE",
        subscriptionStatus: "TRIALING",
        writesAllowed: true,
        graceEndsAt: null,
        trialEndsAt: "2026-09-20T00:00:00Z",
      });
      vi.mocked(useAuth).mockReturnValue(
        makeAuthValue({ loading: false, user: makeStaffAccount({ role: "admin" }) })
      );
      renderHome("/?plan=BUSINESS");
      expect(rpc).not.toHaveBeenCalled();
    });

    it("does nothing while signed out, even with a plan code present", () => {
      vi.mocked(useAuth).mockReturnValue(makeAuthValue({ loading: false, user: null }));
      renderHome("/?plan=BUSINESS");
      expect(rpc).not.toHaveBeenCalled();
    });
  });
});
