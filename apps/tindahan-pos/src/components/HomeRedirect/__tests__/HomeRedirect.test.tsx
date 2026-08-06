import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { useAuth } from "@/lib";
import { makeAuthValue, makeStaffAccount } from "../../../test/testUtils";
import { HomeRedirect } from "../HomeRedirect";

vi.mock("@/lib/auth", () => ({ useAuth: vi.fn() }));

function renderHome() {
  return render(
    <MemoryRouter initialEntries={["/"]}>
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

  it("sends a signed-out visitor to /login", () => {
    vi.mocked(useAuth).mockReturnValue(makeAuthValue({ loading: false, user: null }));
    renderHome();
    expect(screen.getByText("Login page")).toBeInTheDocument();
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
});
