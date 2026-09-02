import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Login } from "./Login";
import { usePlatform } from "../lib/platform";

vi.mock("../lib/platform", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../lib/platform")>();
  return { ...actual, usePlatform: vi.fn() };
});

const signIn = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  signIn.mockResolvedValue({ ok: true });
  vi.mocked(usePlatform).mockReturnValue({ signIn } as never);
});

async function submit(user: ReturnType<typeof userEvent.setup>, email: string, password: string) {
  await user.type(screen.getByLabelText("Email address"), email);
  await user.type(screen.getByLabelText("Password"), password);
  await user.click(screen.getByRole("button", { name: "Sign in" }));
}

describe("Login", () => {
  it("signs in with what was typed", async () => {
    const user = userEvent.setup();
    render(<Login />);
    await submit(user, "admin@example.test", "correct horse");
    expect(signIn).toHaveBeenCalledWith("admin@example.test", "correct horse");
  });

  it("trims the email but never the password", async () => {
    // Trimming a password silently changes the credential. Whitespace is
    // legitimate there; in an email address it is always a paste artefact.
    const user = userEvent.setup();
    render(<Login />);
    await submit(user, "  admin@example.test  ", " spaced ");
    expect(signIn).toHaveBeenCalledWith("admin@example.test", " spaced ");
  });

  describe("the failure message is deliberately uninformative", () => {
    it("says the same thing whatever the reason", async () => {
      // The sign-in screen must not become an oracle for who holds platform
      // access. "Incorrect email or password" is the only answer, whether
      // the account is unknown, the password is wrong, or the account is
      // real but holds no platform role.
      const user = userEvent.setup();
      signIn.mockResolvedValue({ ok: false, error: "User not found" });
      render(<Login />);
      await submit(user, "nobody@example.test", "x");

      const alert = await screen.findByRole("alert");
      expect(alert).toHaveTextContent("Incorrect email or password.");
    });

    it("does not leak the underlying error from the auth layer", async () => {
      const user = userEvent.setup();
      signIn.mockResolvedValue({
        ok: false,
        error: "Account exists but is not a platform administrator",
      });
      render(<Login />);
      await submit(user, "staff@example.test", "x");

      await screen.findByRole("alert");
      expect(screen.queryByText(/platform administrator/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/Account exists/i)).not.toBeInTheDocument();
    });
  });

  it("shows no error before anything has been attempted", () => {
    render(<Login />);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("clears a previous failure when trying again", async () => {
    // A stale error next to a fresh attempt reads as a second failure.
    const user = userEvent.setup();
    signIn.mockResolvedValue({ ok: false });
    render(<Login />);
    await submit(user, "a@example.test", "x");
    await screen.findByRole("alert");

    signIn.mockImplementation(() => new Promise(() => {}));
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("disables the button while the attempt is in flight", async () => {
    // Guards against a double submit firing two sign-in attempts.
    const user = userEvent.setup();
    signIn.mockImplementation(() => new Promise(() => {}));
    render(<Login />);
    await submit(user, "a@example.test", "x");

    expect(await screen.findByRole("button", { name: "Signing in…" })).toBeDisabled();
  });

  it("keeps the password field masked", async () => {
    render(<Login />);
    expect(screen.getByLabelText("Password")).toHaveAttribute("type", "password");
  });
});
