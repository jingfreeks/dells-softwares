import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { useAuth } from "@/lib";
import { makeAuthValue, makeStaffAccount } from "../../../test/testUtils";
import { BottomNav } from "../BottomNav";

vi.mock("@/lib/auth", () => ({ useAuth: vi.fn() }));
vi.mock("@/lib/permissions", () => ({ usePermissions: () => ({ permissions: new Set(), loading: false }) }));

describe("BottomNav", () => {
  it("shows admin nav items for an admin user", () => {
    vi.mocked(useAuth).mockReturnValue(makeAuthValue({ user: makeStaffAccount({ role: "admin" }) }));
    render(
      <MemoryRouter>
        <BottomNav />
      </MemoryRouter>
    );
    expect(screen.getByText("Admin")).toBeInTheDocument();
    expect(screen.getByText("Staff")).toBeInTheDocument();
  });

  it("hides admin-only nav items for a cashier", () => {
    vi.mocked(useAuth).mockReturnValue(makeAuthValue({ user: makeStaffAccount({ role: "cashier" }) }));
    render(
      <MemoryRouter>
        <BottomNav />
      </MemoryRouter>
    );
    expect(screen.queryByText("Admin")).not.toBeInTheDocument();
    expect(screen.queryByText("Staff")).not.toBeInTheDocument();
    expect(screen.getByText("POS")).toBeInTheDocument();
  });

  it("renders nothing when there is no signed-in user", () => {
    vi.mocked(useAuth).mockReturnValue(makeAuthValue({ user: null }));
    render(
      <MemoryRouter>
        <BottomNav />
      </MemoryRouter>
    );
    expect(screen.queryByText("POS")).not.toBeInTheDocument();
  });
});
