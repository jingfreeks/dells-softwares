import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { useAuth, EloadWalletProvider } from "@/lib";
import { makeAuthValue, makeStaffAccount } from "../../../test/testUtils";
import { Sidebar } from "../Sidebar";

vi.mock("@/lib/auth", () => ({ useAuth: vi.fn() }));
vi.mock("@/lib/permissions", () => ({ usePermissions: () => ({ permissions: new Set(), loading: false }) }));
vi.mock("@/lib/features", () => ({
  // loading:false with a full set — these suites are about nav rendering,
  // not entitlement; useFeature() failing open is covered in features.test.ts.
  useFeatures: () => ({ features: new Set(["pos.utang"]), loading: false }),
}));

function renderSidebar() {
  return render(
    <EloadWalletProvider>
      <MemoryRouter>
        <Sidebar />
      </MemoryRouter>
    </EloadWalletProvider>
  );
}

describe("Sidebar", () => {
  it("shows the signed-in user's name and role", () => {
    vi.mocked(useAuth).mockReturnValue(
      makeAuthValue({ user: makeStaffAccount({ name: "Aling Nena", role: "admin" }) })
    );
    renderSidebar();
    expect(screen.getByText("Aling Nena")).toBeInTheDocument();
    expect(screen.getByText("admin")).toBeInTheDocument();
  });

  it("calls logout when 'Log out' is clicked", async () => {
    const user = userEvent.setup();
    const logout = vi.fn();
    vi.mocked(useAuth).mockReturnValue(makeAuthValue({ logout }));
    renderSidebar();
    await user.click(screen.getByRole("button", { name: "Log out" }));
    expect(logout).toHaveBeenCalledTimes(1);
  });

  it("filters nav items for a cashier role", () => {
    vi.mocked(useAuth).mockReturnValue(makeAuthValue({ user: makeStaffAccount({ role: "cashier" }) }));
    renderSidebar();
    expect(screen.queryByText("Admin")).not.toBeInTheDocument();
  });
});
