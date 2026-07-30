import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { makeAuthValue } from "../test/testUtils";
import { ProtectedRoute } from "./ProtectedRoute";

vi.mock("../lib/auth", () => ({ useAuth: vi.fn() }));

function renderProtected() {
  return render(
    <MemoryRouter initialEntries={["/pos"]}>
      <Routes>
        <Route path="/login" element={<p>Login page</p>} />
        <Route
          path="/pos"
          element={
            <ProtectedRoute>
              <p>Protected content</p>
            </ProtectedRoute>
          }
        />
      </Routes>
    </MemoryRouter>
  );
}

describe("ProtectedRoute", () => {
  it("shows a loading spinner while auth is resolving", () => {
    vi.mocked(useAuth).mockReturnValue(makeAuthValue({ loading: true, user: null }));
    renderProtected();
    expect(screen.getByRole("status", { name: "Loading" })).toBeInTheDocument();
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
});
