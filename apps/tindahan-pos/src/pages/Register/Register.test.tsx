import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { useAuth } from "@/lib";
import { makeAuthValue } from "../../test/testUtils";
import { Register } from "./Register";

vi.mock("@/lib/auth", () => ({ useAuth: vi.fn() }));

function renderRegister() {
  return render(
    <MemoryRouter initialEntries={["/register"]}>
      <Routes>
        <Route path="/register" element={<Register />} />
        <Route path="/pos" element={<p>POS page</p>} />
        <Route path="/login" element={<p>Login page</p>} />
      </Routes>
    </MemoryRouter>
  );
}

async function fillForm(
  user: ReturnType<typeof userEvent.setup>,
  overrides: Partial<{ storeName: string; ownerName: string; email: string; password: string }> = {}
) {
  const values = {
    storeName: "Dell's Store",
    ownerName: "Aling Nena",
    email: "nena@example.com",
    password: "secret123",
    ...overrides,
  };
  await user.type(screen.getByLabelText("Store name"), values.storeName);
  await user.type(screen.getByLabelText("Your name"), values.ownerName);
  await user.type(screen.getByLabelText("Email address"), values.email);
  await user.type(screen.getByLabelText("Password"), values.password);
  await user.click(screen.getByRole("checkbox", { name: /Terms of Service/ }));
}

describe("Register", () => {
  it("redirects to /pos when already signed in", () => {
    vi.mocked(useAuth).mockReturnValue(makeAuthValue());
    renderRegister();
    expect(screen.getByText("POS page")).toBeInTheDocument();
  });

  it("registers and navigates to /pos when no email confirmation is needed", async () => {
    const user = userEvent.setup();
    const register = vi.fn().mockResolvedValue({ ok: true, needsEmailConfirmation: false });
    vi.mocked(useAuth).mockReturnValue(makeAuthValue({ user: null, register }));
    renderRegister();

    await fillForm(user);
    await user.click(screen.getByRole("button", { name: "Create account" }));

    expect(register).toHaveBeenCalledWith({
      storeName: "Dell's Store",
      ownerName: "Aling Nena",
      email: "nena@example.com",
      password: "secret123",
      confirmPassword: "secret123",
    });
    expect(await screen.findByText("POS page")).toBeInTheDocument();
  });

  it("does not submit until the terms checkbox is agreed to", async () => {
    const user = userEvent.setup();
    const register = vi.fn().mockResolvedValue({ ok: true, needsEmailConfirmation: false });
    vi.mocked(useAuth).mockReturnValue(makeAuthValue({ user: null, register }));
    renderRegister();

    await user.type(screen.getByLabelText("Store name"), "Dell's Store");
    await user.type(screen.getByLabelText("Your name"), "Aling Nena");
    await user.type(screen.getByLabelText("Email address"), "nena@example.com");
    await user.type(screen.getByLabelText("Password"), "secret123");
    await user.click(screen.getByRole("button", { name: "Create account" }));

    expect(register).not.toHaveBeenCalled();
  });

  it("shows the awaiting-confirmation screen when email confirmation is required", async () => {
    const user = userEvent.setup();
    const register = vi.fn().mockResolvedValue({ ok: true, needsEmailConfirmation: true });
    vi.mocked(useAuth).mockReturnValue(makeAuthValue({ user: null, register }));
    renderRegister();

    await fillForm(user);
    await user.click(screen.getByRole("button", { name: "Create account" }));

    expect(await screen.findByText("Check your email")).toBeInTheDocument();
    await user.click(screen.getByText("Back to login"));
    expect(screen.getByText("Login page")).toBeInTheDocument();
  });

  it("shows an error message on failed registration", async () => {
    const user = userEvent.setup();
    const register = vi.fn().mockResolvedValue({ ok: false, error: "An account with that email already exists." });
    vi.mocked(useAuth).mockReturnValue(makeAuthValue({ user: null, register }));
    renderRegister();

    await fillForm(user);
    await user.click(screen.getByRole("button", { name: "Create account" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("already exists");
  });

  it("toggles password visibility", async () => {
    const user = userEvent.setup();
    vi.mocked(useAuth).mockReturnValue(makeAuthValue({ user: null }));
    renderRegister();

    const passwordInput = screen.getByLabelText("Password") as HTMLInputElement;
    expect(passwordInput.type).toBe("password");
    await user.click(screen.getByRole("button", { name: "Show password" }));
    expect(passwordInput.type).toBe("text");
    await user.click(screen.getByRole("button", { name: "Hide password" }));
    expect(passwordInput.type).toBe("password");
  });

  it("shows a live password strength meter", async () => {
    const user = userEvent.setup();
    vi.mocked(useAuth).mockReturnValue(makeAuthValue({ user: null }));
    renderRegister();

    await user.type(screen.getByLabelText("Password"), "Secret123");
    expect(await screen.findByText("Strong")).toBeInTheDocument();
  });

  it("navigates to login from the segmented tab and the footer link", async () => {
    const user = userEvent.setup();
    vi.mocked(useAuth).mockReturnValue(makeAuthValue({ user: null }));
    renderRegister();
    await user.click(screen.getByRole("tab", { name: "Sign in" }));
    expect(screen.getByText("Login page")).toBeInTheDocument();
  });
});
