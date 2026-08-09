import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { useAuth, EloadWalletProvider } from "@/lib";
import { makeAuthValue, makeStaffAccount } from "../../../test/testUtils";
import { ProtectedRoute } from "../ProtectedRoute";

vi.mock("@/lib/auth", () => ({ useAuth: vi.fn() }));

function renderProtected(initialEntry = "/pos") {
  return render(
    <EloadWalletProvider>
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route path="/login" element={<p>Login page</p>} />
          <Route path="/onboarding" element={<p>Onboarding page</p>} />
          <Route element={<ProtectedRoute />}>
            <Route path="/pos" element={<p>Protected content</p>} />
            <Route path="/inventory" element={<p>Inventory content</p>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </EloadWalletProvider>
  );
}

describe("ProtectedRoute", () => {
  it("shows a loading spinner while auth is resolving", () => {
    vi.mocked(useAuth).mockReturnValue(makeAuthValue({ loading: true, user: null }));
    renderProtected();
    expect(screen.getByRole("status", { name: "Loading" })).toBeInTheDocument();
  });

  it("shows a retryable error screen instead of a blank page when session resolution fails", async () => {
    const user = userEvent.setup();
    const retryAuth = vi.fn();
    vi.mocked(useAuth).mockReturnValue(
      makeAuthValue({ loading: false, user: null, authError: "We couldn't connect. Please try again.", retryAuth })
    );
    renderProtected();
    expect(screen.getByText("Unable to connect")).toBeInTheDocument();
    expect(screen.getByText("We couldn't connect. Please try again.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(retryAuth).toHaveBeenCalled();
  });

  it("redirects to /login when there is no user", () => {
    vi.mocked(useAuth).mockReturnValue(makeAuthValue({ loading: false, user: null }));
    renderProtected();
    expect(screen.getByText("Login page")).toBeInTheDocument();
  });

  it("renders children with the app chrome when signed in", () => {
    vi.mocked(useAuth).mockReturnValue(makeAuthValue({ loading: false }));
    renderProtected();
    expect(screen.getByText("Protected content")).toBeInTheDocument();
    expect(screen.getAllByRole("navigation", { name: "Main" }).length).toBeGreaterThan(0);
  });

  it("redirects an admin who hasn't finished onboarding to /onboarding", () => {
    vi.mocked(useAuth).mockReturnValue(
      makeAuthValue({ loading: false, user: makeStaffAccount({ role: "admin", onboardedAt: null }) })
    );
    renderProtected();
    expect(screen.getByText("Onboarding page")).toBeInTheDocument();
  });

  it("does not redirect a cashier even without onboardedAt set", () => {
    vi.mocked(useAuth).mockReturnValue(
      makeAuthValue({ loading: false, user: makeStaffAccount({ role: "cashier", onboardedAt: null }) })
    );
    renderProtected();
    expect(screen.getByText("Protected content")).toBeInTheDocument();
  });

  it("does not redirect an admin who already onboarded", () => {
    vi.mocked(useAuth).mockReturnValue(
      makeAuthValue({
        loading: false,
        user: makeStaffAccount({ role: "admin", onboardedAt: "2026-07-27T10:00:00Z" }),
      })
    );
    renderProtected();
    expect(screen.getByText("Protected content")).toBeInTheDocument();
  });

  it("redirects a paired device session away from a non-/pos route", () => {
    vi.mocked(useAuth).mockReturnValue(
      makeAuthValue({
        loading: false,
        user: null,
        deviceSession: { id: "d1", storeId: "s1", name: "Counter tablet" },
      })
    );
    renderProtected("/inventory");
    expect(screen.getByText("Protected content")).toBeInTheDocument();
  });

  it("renders a bare minimal shell (no Sidebar/BottomNav) for a paired device session on /pos", () => {
    vi.mocked(useAuth).mockReturnValue(
      makeAuthValue({
        loading: false,
        user: null,
        deviceSession: { id: "d1", storeId: "s1", name: "Counter tablet" },
      })
    );
    renderProtected("/pos");
    expect(screen.getByText("Protected content")).toBeInTheDocument();
    expect(screen.queryAllByRole("navigation", { name: "Main" }).length).toBe(0);
  });
});
