import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { ResetPassword } from "../ResetPassword";

const { updateUser } = vi.hoisted(() => ({
  updateUser: vi.fn().mockResolvedValue({ error: null }),
}));
vi.mock("@/lib/supabaseClient", () => ({
  supabase: { auth: { updateUser } },
}));

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/reset-password"]}>
      <Routes>
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/" element={<p>Dashboard</p>} />
      </Routes>
    </MemoryRouter>
  );
}

beforeEach(() => {
  updateUser.mockClear();
  updateUser.mockResolvedValue({ error: null });
});

describe("ResetPassword", () => {
  it("renders unconditionally -- no signed-in-user gate that could bounce a recovery session away", async () => {
    // Regression coverage for the actual bug: Login's own `if (user)
    // redirect` bounced a just-established recovery session straight to
    // the dashboard before this page could ever exist. This page must
    // never grow that same gate.
    renderPage();
    expect(screen.getByRole("heading", { name: "Set a new password" })).toBeInTheDocument();
  });

  it("updates the password and shows a way to continue into the app", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText("New password"), "supersecret1");
    await user.type(screen.getByLabelText("Confirm new password"), "supersecret1");
    await user.click(screen.getByRole("button", { name: "Update password" }));

    expect(updateUser).toHaveBeenCalledWith({ password: "supersecret1" });
    expect(await screen.findByRole("status")).toHaveTextContent("Password updated.");
    expect(screen.getByRole("link", { name: "Continue" })).toHaveAttribute("href", "/");
  });

  it("rejects a too-short password without calling updateUser", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText("New password"), "short");
    await user.type(screen.getByLabelText("Confirm new password"), "short");
    await user.click(screen.getByRole("button", { name: "Update password" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Password must be at least 8 characters.");
    expect(updateUser).not.toHaveBeenCalled();
  });

  it("rejects mismatched passwords without calling updateUser", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText("New password"), "supersecret1");
    await user.type(screen.getByLabelText("Confirm new password"), "supersecret2");
    await user.click(screen.getByRole("button", { name: "Update password" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Passwords don't match.");
    expect(updateUser).not.toHaveBeenCalled();
  });

  it("shows an error when updateUser fails (e.g. no active/expired recovery session)", async () => {
    updateUser.mockResolvedValue({ error: { message: "Auth session missing." } });
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText("New password"), "supersecret1");
    await user.type(screen.getByLabelText("Confirm new password"), "supersecret1");
    await user.click(screen.getByRole("button", { name: "Update password" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Auth session missing.");
  });
});
