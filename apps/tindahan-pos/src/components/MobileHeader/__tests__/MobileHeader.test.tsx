import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import userEvent from "@testing-library/user-event";
import { useAuth } from "@/lib";
import { makeAuthValue } from "../../../test/testUtils";
import { MobileHeader } from "../MobileHeader";

vi.mock("@/lib/auth", () => ({ useAuth: vi.fn() }));

describe("MobileHeader", () => {
  it("calls logout when the logout button is clicked", async () => {
    const user = userEvent.setup();
    const logout = vi.fn();
    vi.mocked(useAuth).mockReturnValue(makeAuthValue({ logout }));
    render(
      <MemoryRouter>
        <MobileHeader />
      </MemoryRouter>
    );
    await user.click(screen.getByRole("button", { name: "Log out" }));
    expect(logout).toHaveBeenCalledTimes(1);
  });

  it("links to settings", () => {
    vi.mocked(useAuth).mockReturnValue(makeAuthValue());
    render(
      <MemoryRouter>
        <MobileHeader />
      </MemoryRouter>
    );
    expect(screen.getByRole("link", { name: "Settings" })).toHaveAttribute("href", "/settings/profile");
  });
});
