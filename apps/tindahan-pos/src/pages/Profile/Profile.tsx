import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth, supabase, uploadImage, validateAndOptimizeImage } from "@/lib";
import { ImagePlaceholderIcon } from "@/components";

const AVATAR_MAX_DIMENSION = 512;

export function Profile() {
  const { user, updateProfile, deleteAccount } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState(user?.name ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [avatarBlob, setAvatarBlob] = useState<Blob | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [removeAvatar, setRemoveAvatar] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const [processingImage, setProcessingImage] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    setName(user?.name ?? "");
    setPhone(user?.phone ?? "");
  }, [user?.id, user?.name, user?.phone]);

  useEffect(() => {
    return () => {
      if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    };
  }, [avatarPreview]);

  async function handleImageSelect(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setImageError(null);
    setProcessingImage(true);
    try {
      const blob = await validateAndOptimizeImage(file, { maxDimension: AVATAR_MAX_DIMENSION });
      setAvatarBlob(blob);
      setRemoveAvatar(false);
      setAvatarPreview(URL.createObjectURL(blob));
    } catch (err) {
      setImageError(err instanceof Error ? err.message : "Could not process that image.");
    } finally {
      setProcessingImage(false);
    }
  }

  function handleRemoveAvatar() {
    setAvatarBlob(null);
    setAvatarPreview(null);
    setRemoveAvatar(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!user) return;
    if (!name.trim()) {
      setFormError("Name is required.");
      return;
    }

    setSubmitting(true);
    setFormError(null);
    setSaved(false);
    try {
      let avatarUrl: string | null | undefined;
      if (avatarBlob) {
        const path = `${user.storeId}/${user.id}/avatar.webp`;
        avatarUrl = await uploadImage(supabase, "avatars", path, avatarBlob);
      } else if (removeAvatar) {
        avatarUrl = null;
      }

      const result = await updateProfile({
        name: name.trim(),
        phone: phone.trim() || null,
        ...(avatarUrl !== undefined && { avatarUrl }),
      });
      if (!result.ok) {
        setFormError(result.error);
        return;
      }
      setAvatarBlob(null);
      setAvatarPreview(null);
      setRemoveAvatar(false);
      setSaved(true);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Could not save profile.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteAccount() {
    setDeleting(true);
    setDeleteError(null);
    const result = await deleteAccount();
    if (!result.ok) {
      setDeleteError(result.error);
      setDeleting(false);
      return;
    }
    navigate("/login", { replace: true });
  }

  const displayedAvatar = avatarPreview ?? (!removeAvatar ? user?.avatarUrl : null);

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold tracking-tight text-slate-900">Profile</h1>
      <p className="text-sm text-slate-500">Your account information for this store.</p>

      <div className="mt-6 max-w-md card p-4">
        <form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
          <div>
            <span className="text-xs font-medium text-slate-700">Photo</span>
            <div className="mt-1 flex items-center gap-3">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-slate-50">
                {displayedAvatar ? (
                  <img src={displayedAvatar} alt="" className="h-full w-full object-cover" />
                ) : (
                  <ImagePlaceholderIcon className="h-6 w-6 text-slate-300" />
                )}
              </div>
              <div className="flex flex-col gap-1">
                <label
                  htmlFor="avatarInput"
                  className="cursor-pointer rounded-xl border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  {processingImage ? "Processing…" : "Choose photo"}
                </label>
                <input
                  id="avatarInput"
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelect}
                  disabled={processingImage}
                  className="sr-only"
                />
                {displayedAvatar && (
                  <button
                    type="button"
                    onClick={handleRemoveAvatar}
                    className="cursor-pointer text-left text-xs text-red-600 hover:underline"
                  >
                    Remove photo
                  </button>
                )}
              </div>
            </div>
            {imageError && (
              <p role="alert" className="mt-1 text-xs text-red-600">
                {imageError}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="profileName" className="text-xs font-medium text-slate-700">
              Name
            </label>
            <input
              id="profileName"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-[var(--color-brand)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand)]"
            />
          </div>

          <div>
            <label htmlFor="profilePhone" className="text-xs font-medium text-slate-700">
              Phone (optional)
            </label>
            <input
              id="profilePhone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-[var(--color-brand)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand)]"
            />
          </div>

          <div>
            <span className="text-xs font-medium text-slate-700">Email</span>
            <p className="mt-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500">
              {user?.email}
            </p>
          </div>

          <div>
            <span className="text-xs font-medium text-slate-700">Role</span>
            <p className="mt-1 capitalize text-sm text-slate-500">{user?.role}</p>
          </div>

          {formError && (
            <p role="alert" className="text-sm text-red-600">
              {formError}
            </p>
          )}
          {saved && (
            <p role="status" className="text-sm text-emerald-600">
              Profile updated.
            </p>
          )}

          <button
            type="submit"
            disabled={submitting || processingImage}
            className="mt-1 flex h-10 cursor-pointer items-center justify-center gap-2 rounded-xl bg-[var(--color-brand)] text-sm font-semibold text-white hover:bg-[var(--color-brand-dark)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? "Saving…" : "Save changes"}
          </button>
        </form>
      </div>

      <div className="mt-6 max-w-md rounded-xl border border-red-200 bg-red-50 p-4">
        <h2 className="text-sm font-semibold text-red-800">Danger zone</h2>
        <p className="mt-1 text-xs text-red-700">
          Permanently delete your account and login access. This cannot be undone.
        </p>
        <button
          type="button"
          onClick={() => {
            setDeleteError(null);
            setShowDeleteModal(true);
          }}
          className="mt-3 cursor-pointer rounded-xl border border-red-300 bg-white px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100"
        >
          Delete my account
        </button>
      </div>

      {showDeleteModal && (
        <div className="fixed inset-0 z-10 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
            <h2 className="text-base font-semibold text-slate-900">Delete your account?</h2>
            <p className="mt-2 text-sm text-slate-600">
              This permanently deletes your login and profile. It cannot be undone. Sales and
              other records you created stay in the store's history, just no longer attributed to
              you by name.
            </p>

            {deleteError && (
              <p role="alert" className="mt-3 text-sm text-red-600">
                {deleteError}
              </p>
            )}

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                disabled={deleting}
                className="cursor-pointer rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={deleting}
                className="cursor-pointer rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {deleting ? "Deleting…" : "Delete my account"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
