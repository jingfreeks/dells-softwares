import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { useAuth } from "@/lib";
import { makeAuthValue } from "../../../test/testUtils";
import { RequireRole } from "../RequireRole";

vi.mock("@/lib/auth", () => ({ useAuth: vi.fn() }));

function renderGuarded(roles: ("admin" | "cashier")[]) {
  return render(
    <MemoryRouter initialEntries={["/settings/fees"]}>
      <Routes>
        <Route path="/pos" element={<p>POS page</p>} />
        <Route
          path="/settings/fees"
          element={
            <RequireRole roles={roles}>
              <p>Fees content</p>
            </RequireRole>
          }
        />
      </Routes>
    </MemoryRouter>
  );
}

describe("RequireRole", () => {
  it("renders the guarded content for a signed-in staff member with an allowed role", () => {
    vi.mocked(useAuth).mockReturnValue(makeAuthValue());
    renderGuarded(["admin"]);
    expect(screen.getByText("Fees content")).toBeInTheDocument();
  });

  it("redirects to /pos instead of rendering the guarded content for a disallowed role", () => {
    vi.mocked(useAuth).mockReturnValue(
      makeAuthValue({ user: { ...makeAuthValue().user!, role: "cashier" } })
    );
    renderGuarded(["admin"]);
    expect(screen.getByText("POS page")).toBeInTheDocument();
    expect(screen.queryByText("Fees content")).not.toBeInTheDocument();
  });
});
