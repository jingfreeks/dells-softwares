import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { useAuth, validateAndOptimizeImage, uploadImage } from "@/lib";
import { makeAuthValue, makeStaffAccount } from "../../../test/testUtils";
import { ProfileSettings } from "../ProfileSettings";
import { ComingSoonSettingsPage } from "../ComingSoonSettingsPage";

const { updateUser, signOut } = vi.hoisted(() => ({
  updateUser: vi.fn().mockResolvedValue({ error: null }),
  signOut: vi.fn().mockResolvedValue({ error: null }),
}));

vi.mock("@/lib/auth", () => ({ useAuth: vi.fn() }));
vi.mock("@/lib/supabaseClient", () => ({
  supabase: { auth: { updateUser, signOut } },
}));
vi.mock("@/lib/imageUpload", () => ({
  validateAndOptimizeImage: vi.fn(),
  uploadImage: vi.fn(),
}));

function makeAvatarFile() {
  return new File([new Uint8Array([1, 2, 3])], "me.jpg", { type: "image/jpeg" });
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/settings/profile"]}>
      <Routes>
        <Route path="/settings/profile" element={<ProfileSettings />} />
        <Route
          path="/settings/store"
          element={<ComingSoonSettingsPage heading="Store details" subheading="Appears on receipts and reports" />}
        />
        <Route path="/login" element={<p>Login page</p>} />
      </Routes>
    </MemoryRouter>
  );
}

describe("ProfileSettings", () => {
  beforeEach(() => {
    window.localStorage.clear();
    updateUser.mockClear();
    updateUser.mockResolvedValue({ error: null });
    signOut.mockClear();
    signOut.mockResolvedValue({ error: null });
  });

  it("prefills name and phone from the signed-in user", () => {
    vi.mocked(useAuth).mockReturnValue(
      makeAuthValue({ user: makeStaffAccount({ name: "Aling Nena", phone: "0917" }) })
    );
    renderPage();

    expect(screen.getByLabelText("Full name")).toHaveValue("Aling Nena");
    expect(screen.getByLabelText("Mobile")).toHaveValue("0917");
  });

  it("shows email as read-only", () => {
    vi.mocked(useAuth).mockReturnValue(
      makeAuthValue({ user: makeStaffAccount({ email: "nena@example.com" }) })
    );
    renderPage();

    const emailInput = screen.getByLabelText("Email") as HTMLInputElement;
    expect(emailInput).toHaveValue("nena@example.com");
    expect(emailInput).toBeDisabled();
  });

  it("validates that a name is required", async () => {
    const user = userEvent.setup();
    vi.mocked(useAuth).mockReturnValue(makeAuthValue({ user: makeStaffAccount() }));
    renderPage();

    await user.clear(screen.getByLabelText("Full name"));
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Name is required.");
  });

  it("saves name and phone changes", async () => {
    const user = userEvent.setup();
    const updateProfile = vi.fn().mockResolvedValue({ ok: true });
    vi.mocked(useAuth).mockReturnValue(makeAuthValue({ user: makeStaffAccount(), updateProfile }));
    renderPage();

    await user.clear(screen.getByLabelText("Full name"));
    await user.type(screen.getByLabelText("Full name"), "New Name");
    await user.clear(screen.getByLabelText("Mobile"));
    await user.type(screen.getByLabelText("Mobile"), "0918");
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

    const fileInput = document.getElementById("settingsAvatarInput") as HTMLInputElement;
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

    const fileInput = document.getElementById("settingsAvatarInput") as HTMLInputElement;
    await user.upload(fileInput, makeAvatarFile());

    expect(await screen.findByRole("alert")).toHaveTextContent("That file doesn't look like a valid image.");
  });

  it("removes an existing avatar", async () => {
    const user = userEvent.setup();
    const updateProfile = vi.fn().mockResolvedValue({ ok: true });
    vi.mocked(useAuth).mockReturnValue(
      makeAuthValue({ user: makeStaffAccount({ avatarUrl: "https://cdn.test/existing.webp" }), updateProfile })
    );
    renderPage();

    await user.click(screen.getByRole("button", { name: "Remove photo" }));
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    expect(updateProfile).toHaveBeenCalledWith(expect.objectContaining({ avatarUrl: null }));
  });

  it("shows an 'Unsaved changes' chip while editing, and clears it on discard", async () => {
    const user = userEvent.setup();
    vi.mocked(useAuth).mockReturnValue(makeAuthValue({ user: makeStaffAccount({ name: "Aling Nena" }) }));
    renderPage();

    expect(screen.queryByText("Unsaved changes")).not.toBeInTheDocument();

    await user.type(screen.getByLabelText("Full name"), " Jr.");
    expect(await screen.findByText("Unsaved changes")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Discard" }));
    expect(screen.getByLabelText("Full name")).toHaveValue("Aling Nena");
    expect(screen.queryByText("Unsaved changes")).not.toBeInTheDocument();
  });

  describe("signing in", () => {
    it("changes the password", async () => {
      const user = userEvent.setup();
      vi.mocked(useAuth).mockReturnValue(makeAuthValue({ user: makeStaffAccount() }));
      renderPage();

      await user.click(screen.getAllByRole("button", { name: "Change" })[0]);
      await user.type(screen.getByLabelText("New password"), "supersecret1");
      await user.type(screen.getByLabelText("Confirm new password"), "supersecret1");
      await user.click(screen.getByRole("button", { name: "Update password" }));

      expect(updateUser).toHaveBeenCalledWith({ password: "supersecret1" });
      expect(await screen.findByRole("status")).toHaveTextContent("Password updated.");
    });

    it("validates password length and match", async () => {
      const user = userEvent.setup();
      vi.mocked(useAuth).mockReturnValue(makeAuthValue({ user: makeStaffAccount() }));
      renderPage();

      await user.click(screen.getAllByRole("button", { name: "Change" })[0]);
      await user.type(screen.getByLabelText("New password"), "short");
      await user.click(screen.getByRole("button", { name: "Update password" }));
      expect(await screen.findByRole("alert")).toHaveTextContent("Password must be at least 8 characters.");

      await user.clear(screen.getByLabelText("New password"));
      await user.type(screen.getByLabelText("New password"), "longenough1");
      await user.type(screen.getByLabelText("Confirm new password"), "different1");
      await user.click(screen.getByRole("button", { name: "Update password" }));
      expect(await screen.findByRole("alert")).toHaveTextContent("Passwords don't match.");
    });

    it("sets a real PIN via set_own_pin when the two entries match", async () => {
      const user = userEvent.setup();
      const setOwnPin = vi.fn().mockResolvedValue({ ok: true });
      vi.mocked(useAuth).mockReturnValue(
        makeAuthValue({ user: makeStaffAccount({ id: "staff-9", hasPin: false }), setOwnPin })
      );
      renderPage();

      expect(screen.queryByText("····")).not.toBeInTheDocument();
      await user.click(screen.getByRole("button", { name: "Set PIN" }));

      const dialog = screen.getByRole("dialog");
      for (const digit of ["1", "2", "3", "4"]) {
        await user.click(within(dialog).getByRole("button", { name: digit }));
      }
      for (const digit of ["1", "2", "3", "4"]) {
        await user.click(within(dialog).getByRole("button", { name: digit }));
      }

      expect(setOwnPin).toHaveBeenCalledWith("1234");
    });

    it("shows an error when the two PIN entries don't match", async () => {
      const user = userEvent.setup();
      const setOwnPin = vi.fn().mockResolvedValue({ ok: true });
      vi.mocked(useAuth).mockReturnValue(
        makeAuthValue({ user: makeStaffAccount({ id: "staff-9", hasPin: false }), setOwnPin })
      );
      renderPage();

      await user.click(screen.getByRole("button", { name: "Set PIN" }));
      const dialog = screen.getByRole("dialog");
      for (const digit of ["1", "2", "3", "4"]) {
        await user.click(within(dialog).getByRole("button", { name: digit }));
      }
      for (const digit of ["5", "6", "7", "8"]) {
        await user.click(within(dialog).getByRole("button", { name: digit }));
      }

      expect(await screen.findByRole("alert")).toHaveTextContent("PINs don't match.");
      expect(setOwnPin).not.toHaveBeenCalled();
    });

    it("shows '····' and a Change PIN button once a PIN is set", () => {
      vi.mocked(useAuth).mockReturnValue(makeAuthValue({ user: makeStaffAccount({ id: "staff-9", hasPin: true }) }));
      renderPage();

      expect(screen.getByText("····")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Change PIN" })).toBeInTheDocument();
    });

    it("toggles two-step sign-in", async () => {
      const user = userEvent.setup();
      vi.mocked(useAuth).mockReturnValue(makeAuthValue({ user: makeStaffAccount({ id: "staff-9" }) }));
      renderPage();

      const toggle = screen.getByRole("switch", { name: "Two-step sign-in" });
      expect(toggle).toHaveAttribute("aria-checked", "false");
      await user.click(toggle);
      expect(toggle).toHaveAttribute("aria-checked", "true");

      const raw = window.localStorage.getItem("tindahan-pos:settings-profile:staff-9");
      expect(JSON.parse(raw as string)).toMatchObject({ twoStepSignIn: true });
    });
  });

  describe("notifications", () => {
    it("toggles and persists notification preferences", async () => {
      const user = userEvent.setup();
      vi.mocked(useAuth).mockReturnValue(makeAuthValue({ user: makeStaffAccount({ id: "staff-9" }) }));
      renderPage();

      const toggle = screen.getByRole("switch", { name: "Every completed sale" });
      expect(toggle).toHaveAttribute("aria-checked", "false");
      await user.click(toggle);
      expect(toggle).toHaveAttribute("aria-checked", "true");

      const raw = window.localStorage.getItem("tindahan-pos:settings-profile:staff-9");
      expect(JSON.parse(raw as string).notifications).toMatchObject({ everyCompletedSale: true });
    });
  });

  describe("sign out everywhere", () => {
    it("signs out of all sessions", async () => {
      const user = userEvent.setup();
      vi.mocked(useAuth).mockReturnValue(makeAuthValue({ user: makeStaffAccount() }));
      renderPage();

      await user.click(screen.getByRole("button", { name: "Sign out all" }));

      expect(signOut).toHaveBeenCalledWith({ scope: "global" });
    });

    it("shows an error if sign-out fails", async () => {
      const user = userEvent.setup();
      signOut.mockResolvedValue({ error: { message: "Network error." } });
      vi.mocked(useAuth).mockReturnValue(makeAuthValue({ user: makeStaffAccount() }));
      renderPage();

      await user.click(screen.getByRole("button", { name: "Sign out all" }));

      expect(await screen.findByRole("alert")).toHaveTextContent("Network error.");
    });
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
  });

  describe("settings sidebar", () => {
    it("navigates to the other settings sub-pages", async () => {
      const user = userEvent.setup();
      vi.mocked(useAuth).mockReturnValue(makeAuthValue({ user: makeStaffAccount() }));
      renderPage();

      await user.click(screen.getByRole("link", { name: /Store details/ }));
      expect(await screen.findByText("Coming soon")).toBeInTheDocument();
    });
  });
});
