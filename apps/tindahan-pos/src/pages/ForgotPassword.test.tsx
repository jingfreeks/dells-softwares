import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { makeAuthValue } from "../test/testUtils";
import { ForgotPassword } from "./ForgotPassword";

vi.mock("../lib/auth", () => ({ useAuth: vi.fn() }));

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/forgot-password"]}>
      <Routes>
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/login" element={<p>Login page</p>} />
      </Routes>
    </MemoryRouter>
  );
}

describe("ForgotPassword", () => {
  it("sends a reset link and shows the confirmation message", async () => {
    const user = userEvent.setup();
    const requestPasswordReset = vi.fn().mockResolvedValue({ ok: true });
    vi.mocked(useAuth).mockReturnValue(makeAuthValue({ requestPasswordReset }));
    renderPage();

    await user.type(screen.getByLabelText("Email address"), "nena@example.com");
    await user.click(screen.getByRole("button", { name: "Send reset link" }));

    expect(requestPasswordReset).toHaveBeenCalledWith("nena@example.com");
    expect(await screen.findByRole("status")).toHaveTextContent("nena@example.com");
  });

  it("shows an error when the request fails", async () => {
    const user = userEvent.setup();
    const requestPasswordReset = vi.fn().mockResolvedValue({ ok: false, error: "Something went wrong." });
    vi.mocked(useAuth).mockReturnValue(makeAuthValue({ requestPasswordReset }));
    renderPage();

    await user.type(screen.getByLabelText("Email address"), "nena@example.com");
    await user.click(screen.getByRole("button", { name: "Send reset link" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Something went wrong.");
  });

  it("links back to login", async () => {
    const user = userEvent.setup();
    vi.mocked(useAuth).mockReturnValue(makeAuthValue());
    renderPage();
    await user.click(screen.getByText("Back to login"));
    expect(screen.getByText("Login page")).toBeInTheDocument();
  });
});
