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
        <Route path="/" element={<p>Home page</p>} />
        <Route path="/register" element={<p>Register page</p>} />
        <Route path="/forgot-password" element={<p>Forgot password page</p>} />
      </Routes>
    </MemoryRouter>
  );
}

describe("Login", () => {
  it("redirects to / when already signed in", () => {
    vi.mocked(useAuth).mockReturnValue(makeAuthValue());
    renderLogin();
    expect(screen.getByText("Home page")).toBeInTheDocument();
  });

  it("logs in and hands off to / (which decides admin vs. cashier) on success", async () => {
    const user = userEvent.setup();
    const login = vi.fn().mockResolvedValue({ ok: true });
    vi.mocked(useAuth).mockReturnValue(makeAuthValue({ user: null, login }));
    renderLogin();

    await user.type(screen.getByLabelText("Email address"), "nena@example.com");
    await user.type(screen.getByLabelText("Password"), "secret123");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    expect(login).toHaveBeenCalledWith("nena@example.com", "secret123", true);
    expect(await screen.findByText("Home page")).toBeInTheDocument();
  });

  it("passes keepSignedIn as false when the checkbox is unticked", async () => {
    const user = userEvent.setup();
    const login = vi.fn().mockResolvedValue({ ok: true });
    vi.mocked(useAuth).mockReturnValue(makeAuthValue({ user: null, login }));
    renderLogin();

    await user.type(screen.getByLabelText("Email address"), "nena@example.com");
    await user.type(screen.getByLabelText("Password"), "secret123");
    await user.click(screen.getByLabelText("Keep me signed in on this device"));
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    expect(login).toHaveBeenCalledWith("nena@example.com", "secret123", false);
  });

  it("shows an error message on failed login", async () => {
    const user = userEvent.setup();
    const login = vi.fn().mockResolvedValue({ ok: false, error: "Incorrect email or password." });
    vi.mocked(useAuth).mockReturnValue(makeAuthValue({ user: null, login }));
    renderLogin();

    await user.type(screen.getByLabelText("Email address"), "nena@example.com");
    await user.type(screen.getByLabelText("Password"), "wrong");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

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
    await user.click(screen.getByText("Create an account"));
    expect(screen.getByText("Register page")).toBeInTheDocument();
  });

  it("navigates to register from the segmented tab", async () => {
    const user = userEvent.setup();
    vi.mocked(useAuth).mockReturnValue(makeAuthValue({ user: null }));
    renderLogin();
    await user.click(screen.getByRole("tab", { name: "Create account" }));
    expect(screen.getByText("Register page")).toBeInTheDocument();
  });
});
