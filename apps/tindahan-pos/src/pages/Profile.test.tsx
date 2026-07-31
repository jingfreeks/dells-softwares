import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { validateAndOptimizeImage, uploadImage } from "../lib/imageUpload";
import { makeAuthValue, makeStaffAccount } from "../test/testUtils";
import { Profile } from "./Profile";

vi.mock("../lib/auth", () => ({ useAuth: vi.fn() }));
vi.mock("../lib/supabaseClient", () => ({ supabase: {} }));
vi.mock("../lib/imageUpload", () => ({
  validateAndOptimizeImage: vi.fn(),
  uploadImage: vi.fn(),
}));

function makeAvatarFile() {
  return new File([new Uint8Array([1, 2, 3])], "me.jpg", { type: "image/jpeg" });
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/profile"]}>
      <Routes>
        <Route path="/profile" element={<Profile />} />
        <Route path="/login" element={<p>Login page</p>} />
      </Routes>
    </MemoryRouter>
  );
}

describe("Profile", () => {
  it("prefills name and phone from the signed-in user", () => {
    vi.mocked(useAuth).mockReturnValue(
      makeAuthValue({ user: makeStaffAccount({ name: "Aling Nena", phone: "0917" }) })
    );
    renderPage();

    expect(screen.getByLabelText("Name")).toHaveValue("Aling Nena");
    expect(screen.getByLabelText("Phone (optional)")).toHaveValue("0917");
  });

  it("shows email and role as read-only", () => {
    vi.mocked(useAuth).mockReturnValue(
      makeAuthValue({ user: makeStaffAccount({ email: "nena@example.com", role: "admin" }) })
    );
    renderPage();

    expect(screen.getByText("nena@example.com")).toBeInTheDocument();
    expect(screen.getByText("admin")).toBeInTheDocument();
  });

  it("validates that a name is required", async () => {
    const user = userEvent.setup();
    vi.mocked(useAuth).mockReturnValue(makeAuthValue({ user: makeStaffAccount() }));
    renderPage();

    await user.clear(screen.getByLabelText("Name"));
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Name is required.");
  });

  it("saves name and phone changes", async () => {
    const user = userEvent.setup();
    const updateProfile = vi.fn().mockResolvedValue({ ok: true });
    vi.mocked(useAuth).mockReturnValue(makeAuthValue({ user: makeStaffAccount(), updateProfile }));
    renderPage();

    await user.clear(screen.getByLabelText("Name"));
    await user.type(screen.getByLabelText("Name"), "New Name");
    await user.clear(screen.getByLabelText("Phone (optional)"));
    await user.type(screen.getByLabelText("Phone (optional)"), "0918");
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    expect(updateProfile).toHaveBeenCalledWith({ name: "New Name", phone: "0918" });
    expect(await screen.findByRole("status")).toHaveTextContent("Profile updated.");
  });

  it("shows an error when saving fails", async () => {
    const user = userEvent.setup();
    const updateProfile = vi.fn().mockResolvedValue({ ok: false, error: "Something broke." });
    vi.mocked(useAuth).mockReturnValue(makeAuthValue({ user: makeStaffAccount(), updateProfile }));
    renderPage();

    await user.click(screen.getByRole("button", { name: "Save changes" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Something broke.");
  });

  it("optimizes, uploads, and saves a new avatar", async () => {
    const user = userEvent.setup();
    vi.stubGlobal("URL", { ...URL, createObjectURL: vi.fn(() => "blob:preview"), revokeObjectURL: vi.fn() });
    const updateProfile = vi.fn().mockResolvedValue({ ok: true });
    vi.mocked(useAuth).mockReturnValue(
      makeAuthValue({ user: makeStaffAccount({ id: "staff-1", storeId: "store-1" }), updateProfile })
    );
    const blob = new Blob(["x"], { type: "image/webp" });
    vi.mocked(validateAndOptimizeImage).mockResolvedValue(blob);
    vi.mocked(uploadImage).mockResolvedValue("https://cdn.test/store-1/staff-1/avatar.webp");
    renderPage();

    const fileInput = document.getElementById("avatarInput") as HTMLInputElement;
    await user.upload(fileInput, makeAvatarFile());
    expect(await screen.findByRole("button", { name: "Remove photo" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Save changes" }));

    expect(validateAndOptimizeImage).toHaveBeenCalledWith(expect.any(File), { maxDimension: 512 });
    expect(uploadImage).toHaveBeenCalledWith(expect.anything(), "avatars", "store-1/staff-1/avatar.webp", blob);
    expect(updateProfile).toHaveBeenCalledWith(
      expect.objectContaining({ avatarUrl: "https://cdn.test/store-1/staff-1/avatar.webp" })
    );
  });

  it("shows an error when the selected photo isn't a valid image", async () => {
    const user = userEvent.setup();
    vi.mocked(useAuth).mockReturnValue(makeAuthValue({ user: makeStaffAccount() }));
    vi.mocked(validateAndOptimizeImage).mockRejectedValue(new Error("That file doesn't look like a valid image."));
    renderPage();

    const fileInput = document.getElementById("avatarInput") as HTMLInputElement;
    await user.upload(fileInput, makeAvatarFile());

    expect(await screen.findByRole("alert")).toHaveTextContent("That file doesn't look like a valid image.");
  });

  it("removes an existing avatar", async () => {
    const user = userEvent.setup();
    const updateProfile = vi.fn().mockResolvedValue({ ok: true });
    vi.mocked(useAuth).mockReturnValue(
      makeAuthValue({
        user: makeStaffAccount({ avatarUrl: "https://cdn.test/existing.webp" }),
        updateProfile,
      })
    );
    renderPage();

    await user.click(screen.getByRole("button", { name: "Remove photo" }));
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    expect(updateProfile).toHaveBeenCalledWith(expect.objectContaining({ avatarUrl: null }));
  });

  describe("danger zone", () => {
    it("opens a confirmation modal instead of deleting immediately", async () => {
      const user = userEvent.setup();
      const deleteAccount = vi.fn().mockResolvedValue({ ok: true });
      vi.mocked(useAuth).mockReturnValue(makeAuthValue({ user: makeStaffAccount(), deleteAccount }));
      renderPage();

      await user.click(screen.getByRole("button", { name: "Delete my account" }));
      expect(screen.getByText("Delete your account?")).toBeInTheDocument();
      expect(deleteAccount).not.toHaveBeenCalled();
    });

    it("cancels without deleting", async () => {
      const user = userEvent.setup();
      const deleteAccount = vi.fn().mockResolvedValue({ ok: true });
      vi.mocked(useAuth).mockReturnValue(makeAuthValue({ user: makeStaffAccount(), deleteAccount }));
      renderPage();

      await user.click(screen.getByRole("button", { name: "Delete my account" }));
      await user.click(screen.getByRole("button", { name: "Cancel" }));

      expect(screen.queryByText("Delete your account?")).not.toBeInTheDocument();
      expect(deleteAccount).not.toHaveBeenCalled();
    });

    it("deletes the account and redirects to /login on confirm", async () => {
      const user = userEvent.setup();
      const deleteAccount = vi.fn().mockResolvedValue({ ok: true });
      vi.mocked(useAuth).mockReturnValue(makeAuthValue({ user: makeStaffAccount(), deleteAccount }));
      renderPage();

      await user.click(screen.getByRole("button", { name: "Delete my account" }));
      const dialogButtons = screen.getAllByRole("button", { name: "Delete my account" });
      await user.click(dialogButtons[dialogButtons.length - 1]);

      expect(deleteAccount).toHaveBeenCalled();
      expect(await screen.findByText("Login page")).toBeInTheDocument();
    });

    it("shows the sole-admin error from the server and keeps the modal open", async () => {
      const user = userEvent.setup();
      const deleteAccount = vi.fn().mockResolvedValue({
        ok: false,
        error: "You're the only admin for this store.",
      });
      vi.mocked(useAuth).mockReturnValue(makeAuthValue({ user: makeStaffAccount(), deleteAccount }));
      renderPage();

      await user.click(screen.getByRole("button", { name: "Delete my account" }));
      const dialogButtons = screen.getAllByRole("button", { name: "Delete my account" });
      await user.click(dialogButtons[dialogButtons.length - 1]);

      expect(await screen.findByRole("alert")).toHaveTextContent("You're the only admin for this store.");
      expect(screen.getByText("Delete your account?")).toBeInTheDocument();
    });
  });
});
