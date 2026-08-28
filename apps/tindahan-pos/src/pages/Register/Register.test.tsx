import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { useAuth } from "@/lib";
import { makeAuthValue } from "../../test/testUtils";
import { Register } from "./Register";

vi.mock("@/lib/auth", () => ({ useAuth: vi.fn() }));

const rpc = vi.fn().mockResolvedValue({ data: null, error: null });
vi.mock("@/lib/supabaseClient", () => ({ supabase: { rpc: (...args: unknown[]) => rpc(...args) } }));

function renderRegister(initialEntry = "/register") {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
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
  it("links back to home", () => {
    vi.mocked(useAuth).mockReturnValue(makeAuthValue({ user: null }));
    renderRegister();
    expect(screen.getByRole("link", { name: /back to home/i })).toHaveAttribute("href", "/");
  });

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

  it("disables Sign up with Google until the terms checkbox is agreed to", async () => {
    const user = userEvent.setup();
    const loginWithGoogle = vi.fn().mockResolvedValue({ ok: true });
    vi.mocked(useAuth).mockReturnValue(makeAuthValue({ user: null, loginWithGoogle }));
    renderRegister();

    const googleButton = screen.getByRole("button", { name: "Sign up with Google" });
    expect(googleButton).toBeDisabled();

    await user.click(screen.getByRole("checkbox", { name: /Terms of Service/ }));
    expect(googleButton).toBeEnabled();

    await user.click(googleButton);
    expect(loginWithGoogle).toHaveBeenCalled();
  });

  it("shows an error if the Google redirect fails to start", async () => {
    const user = userEvent.setup();
    const loginWithGoogle = vi.fn().mockResolvedValue({ ok: false, error: "Google sign-in isn't enabled yet." });
    vi.mocked(useAuth).mockReturnValue(makeAuthValue({ user: null, loginWithGoogle }));
    renderRegister();

    await user.click(screen.getByRole("checkbox", { name: /Terms of Service/ }));
    await user.click(screen.getByRole("button", { name: "Sign up with Google" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Google sign-in isn't enabled yet.");
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

  it("acknowledges a valid plan carried in via ?plan=, and starts a real trial after signup succeeds", async () => {
    rpc.mockClear();
    const user = userEvent.setup();
    const register = vi.fn().mockResolvedValue({ ok: true, needsEmailConfirmation: false });
    vi.mocked(useAuth).mockReturnValue(makeAuthValue({ user: null, register }));
    renderRegister("/register?plan=BUSINESS");

    expect(screen.getByText(/14-day free trial of Growth.*₱599\/monthly/)).toBeInTheDocument();

    await fillForm(user);
    await user.click(screen.getByRole("button", { name: "Create account" }));

    expect(await screen.findByText("POS page")).toBeInTheDocument();
    expect(rpc).toHaveBeenCalledWith("start_trial", { p_plan_code: "BUSINESS" });
  });

  it("ignores an unknown or missing plan param -- no acknowledgment, no RPC call", async () => {
    rpc.mockClear();
    const user = userEvent.setup();
    const register = vi.fn().mockResolvedValue({ ok: true, needsEmailConfirmation: false });
    vi.mocked(useAuth).mockReturnValue(makeAuthValue({ user: null, register }));
    renderRegister("/register?plan=NOT_A_REAL_PLAN");

    expect(screen.queryByText(/free trial/)).not.toBeInTheDocument();

    await fillForm(user);
    await user.click(screen.getByRole("button", { name: "Create account" }));

    expect(await screen.findByText("POS page")).toBeInTheDocument();
    expect(rpc).not.toHaveBeenCalled();
  });

  it("does not start a trial when email confirmation is still pending -- there is no session yet", async () => {
    rpc.mockClear();
    const user = userEvent.setup();
    const register = vi.fn().mockResolvedValue({ ok: true, needsEmailConfirmation: true });
    vi.mocked(useAuth).mockReturnValue(makeAuthValue({ user: null, register }));
    renderRegister("/register?plan=PRO");

    await fillForm(user);
    await user.click(screen.getByRole("button", { name: "Create account" }));

    expect(await screen.findByText("Check your email")).toBeInTheDocument();
    expect(rpc).not.toHaveBeenCalled();
  });
});
