import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { makeAuthValue, makeStaffAccount } from "../test/testUtils";
import { OnboardingRoute } from "./OnboardingRoute";

vi.mock("../lib/auth", () => ({ useAuth: vi.fn() }));

function OnboardingTree() {
  return (
    <MemoryRouter initialEntries={["/onboarding"]}>
      <Routes>
        <Route path="/login" element={<p>Login page</p>} />
        <Route path="/pos" element={<p>POS page</p>} />
        <Route
          path="/onboarding"
          element={
            <OnboardingRoute>
              <p>Onboarding content</p>
            </OnboardingRoute>
          }
        />
      </Routes>
    </MemoryRouter>
  );
}

function renderOnboarding() {
  return render(<OnboardingTree />);
}

describe("OnboardingRoute", () => {
  it("shows a loading spinner while auth is resolving", () => {
    vi.mocked(useAuth).mockReturnValue(makeAuthValue({ loading: true, user: null }));
    renderOnboarding();
    expect(screen.getByRole("status", { name: "Loading" })).toBeInTheDocument();
  });

  it("redirects to /login when there is no user", () => {
    vi.mocked(useAuth).mockReturnValue(makeAuthValue({ loading: false, user: null }));
    renderOnboarding();
    expect(screen.getByText("Login page")).toBeInTheDocument();
  });

  it("redirects a cashier to /pos", () => {
    vi.mocked(useAuth).mockReturnValue(
      makeAuthValue({ loading: false, user: makeStaffAccount({ role: "cashier", onboardedAt: null }) })
    );
    renderOnboarding();
    expect(screen.getByText("POS page")).toBeInTheDocument();
  });

  it("redirects an admin who already onboarded to /pos", () => {
    vi.mocked(useAuth).mockReturnValue(
      makeAuthValue({
        loading: false,
        user: makeStaffAccount({ role: "admin", onboardedAt: "2026-07-27T10:00:00Z" }),
      })
    );
    renderOnboarding();
    expect(screen.getByText("POS page")).toBeInTheDocument();
  });

  it("renders the wizard for a not-yet-onboarded admin", () => {
    vi.mocked(useAuth).mockReturnValue(
      makeAuthValue({ loading: false, user: makeStaffAccount({ role: "admin", onboardedAt: null }) })
    );
    renderOnboarding();
    expect(screen.getByText("Onboarding content")).toBeInTheDocument();
  });

  it("does not redirect away mid-flow when onboardedAt flips true while still mounted", () => {
    // Regresses a real bug: Onboarding.tsx sets onboardedAt via
    // completeOnboarding() and then navigates itself to /admin. If this
    // route read user.onboardedAt live instead of a snapshot taken at
    // mount, that same state change would make it redirect to /pos in a
    // race with the wizard's own explicit navigation.
    vi.mocked(useAuth).mockReturnValue(
      makeAuthValue({ loading: false, user: makeStaffAccount({ role: "admin", onboardedAt: null }) })
    );
    const { rerender } = renderOnboarding();
    expect(screen.getByText("Onboarding content")).toBeInTheDocument();

    vi.mocked(useAuth).mockReturnValue(
      makeAuthValue({
        loading: false,
        user: makeStaffAccount({ role: "admin", onboardedAt: "2026-07-31T00:00:00Z" }),
      })
    );
    rerender(<OnboardingTree />);
    expect(screen.getByText("Onboarding content")).toBeInTheDocument();
  });
});
