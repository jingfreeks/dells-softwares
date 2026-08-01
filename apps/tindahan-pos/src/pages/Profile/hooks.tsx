import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth, supabase, uploadImage, validateAndOptimizeImage, ERROR_NAME_REQUIRED, ERROR_COULD_NOT_PROCESS_IMAGE, ERROR_COULD_NOT_SAVE_PROFILE } from "@/lib";

const AVATAR_MAX_DIMENSION = 512;

export function useProfilePage() {
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
      setImageError(err instanceof Error ? err.message : ERROR_COULD_NOT_PROCESS_IMAGE);
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
      setFormError(ERROR_NAME_REQUIRED);
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
      setFormError(err instanceof Error ? err.message : ERROR_COULD_NOT_SAVE_PROFILE);
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

  function openDeleteModal() {
    setDeleteError(null);
    setShowDeleteModal(true);
  }

  function closeDeleteModal() {
    setShowDeleteModal(false);
  }

  return {
    user,
    name,
    setName,
    phone,
    setPhone,
    displayedAvatar,
    imageError,
    processingImage,
    formError,
    saved,
    submitting,
    showDeleteModal,
    openDeleteModal,
    closeDeleteModal,
    deleteError,
    deleting,
    handleImageSelect,
    handleRemoveAvatar,
    handleSubmit,
    handleDeleteAccount,
  };
}
