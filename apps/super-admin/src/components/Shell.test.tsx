import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { Shell, NoAccess } from "./Shell";
import { usePlatform } from "../lib/platform";

vi.mock("../lib/platform", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../lib/platform")>();
  return { ...actual, usePlatform: vi.fn() };
});

const signOut = vi.fn();

function setAdmin(over: Record<string, unknown> | null) {
  vi.mocked(usePlatform).mockReturnValue({
    admin: over === null ? null : { scope: "SUPERUSER", status: "ACTIVE", mfaFresh: true, mfaExpiresAt: null, ...over },
    signOut,
  } as never);
}

function renderShell() {
  return render(
    <MemoryRouter>
      <Shell>
        <p>page body</p>
      </Shell>
    </MemoryRouter>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  setAdmin({});
});

describe("Shell", () => {
  it("renders the page inside the console chrome", () => {
    renderShell();
    expect(screen.getByText("page body")).toBeInTheDocument();
  });

  it("links to every console section", () => {
    renderShell();
    const nav = within(screen.getByRole("navigation", { name: "Main" }));
    // Each of these must resolve to a real route. /security in particular
    // shipped for a while with no route behind it and silently redirected
    // to the dashboard.
    expect(nav.getByRole("link", { name: "Dashboard" })).toHaveAttribute("href", "/dashboard");
    expect(nav.getByRole("link", { name: "Organizations" })).toHaveAttribute("href", "/organizations");
    expect(nav.getByRole("link", { name: "Deletion requests" })).toHaveAttribute("href", "/deletion-requests");
    expect(nav.getByRole("link", { name: "Platform audit" })).toHaveAttribute("href", "/audit");
    expect(nav.getByRole("link", { name: "Security" })).toHaveAttribute("href", "/security");
  });

  describe("the identity card", () => {
    it("names the scope the operator is acting with", () => {
      // Which authority is in use is part of the chrome, not a page: it
      // should never require navigating somewhere to find out.
      setAdmin({ scope: "ENGINEER" });
      renderShell();
      expect(screen.getByText("ENGINEER")).toBeInTheDocument();
    });

    it("says when the second factor lapses", () => {
      setAdmin({ mfaExpiresAt: new Date(Date.now() + 3_600_000).toISOString() });
      renderShell();
      expect(screen.getByText(/MFA valid until/)).toBeInTheDocument();
    });

    it("says the factor is unverified rather than showing a blank line", () => {
      setAdmin({ mfaExpiresAt: null });
      renderShell();
      expect(screen.getByText("MFA not verified")).toBeInTheDocument();
    });

    it("does not imply authority when there is no admin record", () => {
      // An empty scope must not read as a held one.
      setAdmin(null);
      renderShell();
      expect(screen.getByText("NO SCOPE")).toBeInTheDocument();
    });
  });

  it("signs the operator out", async () => {
    const user = userEvent.setup();
    renderShell();
    await user.click(screen.getByRole("button", { name: "Log out" }));
    expect(signOut).toHaveBeenCalled();
  });
});

describe("NoAccess", () => {
  it("refuses without hinting at what would grant access", () => {
    render(<NoAccess />);
    expect(screen.getByText(/isn't authorised for the platform console/i)).toBeInTheDocument();
    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
  });

  it("offers a way out", async () => {
    const user = userEvent.setup();
    render(<NoAccess />);
    await user.click(screen.getByRole("button", { name: "Sign out" }));
    expect(signOut).toHaveBeenCalled();
  });
});
