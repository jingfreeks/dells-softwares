import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useAuth } from "../lib/auth";
import { makeAuthValue } from "../test/testUtils";
import { MobileHeader } from "./MobileHeader";

vi.mock("../lib/auth", () => ({ useAuth: vi.fn() }));

describe("MobileHeader", () => {
  it("calls logout when the logout button is clicked", async () => {
    const user = userEvent.setup();
    const logout = vi.fn();
    vi.mocked(useAuth).mockReturnValue(makeAuthValue({ logout }));
    render(<MobileHeader />);
    await user.click(screen.getByRole("button", { name: "Log out" }));
    expect(logout).toHaveBeenCalledTimes(1);
  });
});
