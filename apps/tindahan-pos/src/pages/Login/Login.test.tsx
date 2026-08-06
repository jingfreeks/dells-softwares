import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { useAuth } from "@/lib";
import { makeAuthValue } from "../../test/testUtils";
import { Login } from "./Login";

vi.mock("@/lib/auth", () => ({ useAuth: vi.fn() }));

function renderLogin() {
  return render(
    <MemoryRouter initialEntries={["/login"]}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/pos" element={<p>POS page</p>} />
        <Route path="/register" element={<p>Register page</p>} />
        <Route path="/forgot-password" element={<p>Forgot password page</p>} />
      </Routes>
    </MemoryRouter>
  );
}

describe("Login", () => {
  it("redirects to /pos when already signed in", () => {
    vi.mocked(useAuth).mockReturnValue(makeAuthValue());
    renderLogin();
    expect(screen.getByText("POS page")).toBeInTheDocument();
  });

  it("logs in and navigates to /pos on success", async () => {
    const user = userEvent.setup();
    const login = vi.fn().mockResolvedValue({ ok: true });
    vi.mocked(useAuth).mockReturnValue(makeAuthValue({ user: null, login }));
    renderLogin();

    await user.type(screen.getByLabelText("Email address"), "nena@example.com");
    await user.type(screen.getByLabelText("Password"), "secret123");
    await user.click(screen.getByRole("button", { name: "Log in" }));

    expect(login).toHaveBeenCalledWith("nena@example.com", "secret123");
    expect(await screen.findByText("POS page")).toBeInTheDocument();
  });

  it("shows an error message on failed login", async () => {
    const user = userEvent.setup();
    const login = vi.fn().mockResolvedValue({ ok: false, error: "Incorrect email or password." });
    vi.mocked(useAuth).mockReturnValue(makeAuthValue({ user: null, login }));
    renderLogin();

    await user.type(screen.getByLabelText("Email address"), "nena@example.com");
    await user.type(screen.getByLabelText("Password"), "wrong");
    await user.click(screen.getByRole("button", { name: "Log in" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Incorrect email or password.");
  });

  it("toggles password visibility", async () => {
    const user = userEvent.setup();
    vi.mocked(useAuth).mockReturnValue(makeAuthValue({ user: null }));
    renderLogin();

    const passwordInput = screen.getByLabelText("Password") as HTMLInputElement;
    expect(passwordInput.type).toBe("password");
    await user.click(screen.getByRole("button", { name: "Show password" }));
    expect(passwordInput.type).toBe("text");
    await user.click(screen.getByRole("button", { name: "Hide password" }));
    expect(passwordInput.type).toBe("password");
  });

  it("links to register and forgot-password", async () => {
    const user = userEvent.setup();
    vi.mocked(useAuth).mockReturnValue(makeAuthValue({ user: null }));
    renderLogin();
    await user.click(screen.getByText("Register"));
    expect(screen.getByText("Register page")).toBeInTheDocument();
  });
});
