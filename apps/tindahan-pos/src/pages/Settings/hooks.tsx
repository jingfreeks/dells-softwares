import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import {
  useAuth,
  supabase,
  uploadImage,
  validateAndOptimizeImage,
  ERROR_NAME_REQUIRED,
  ERROR_COULD_NOT_PROCESS_IMAGE,
  ERROR_COULD_NOT_SAVE_PROFILE,
  ERROR_PASSWORD_TOO_SHORT,
  ERROR_PASSWORDS_DO_NOT_MATCH,
  ERROR_COULD_NOT_UPDATE_PASSWORD,
  ERROR_COULD_NOT_SIGN_OUT_EVERYWHERE,
  ERROR_COULD_NOT_SET_PIN,
} from "@/lib";
import {
  loadSettingsProfileMock,
  saveSettingsProfileMock,
  DEFAULT_SETTINGS_PROFILE_MOCK,
  type NotificationPreferences,
} from "./settingsProfileMock";

const AVATAR_MAX_DIMENSION = 512;
const MIN_PASSWORD_LENGTH = 8;

export function useSettingsProfilePage() {
  const { user, updateProfile, deleteAccount, setOwnPin } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState(user?.name ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [displayName, setDisplayName] = useState("");
  const [avatarBlob, setAvatarBlob] = useState<Blob | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [removeAvatar, setRemoveAvatar] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const [processingImage, setProcessingImage] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [showSetPinModal, setShowSetPinModal] = useState(false);
  const [setPinSubmitting, setSetPinSubmitting] = useState(false);
  const [setPinError, setSetPinError] = useState<string | null>(null);
  const [twoStepSignIn, setTwoStepSignIn] = useState(false);
  const [notifications, setNotifications] = useState<NotificationPreferences>(
    DEFAULT_SETTINGS_PROFILE_MOCK.notifications
  );

  const [showChangePassword, setShowChangePassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSaved, setPasswordSaved] = useState(false);
  const [updatingPassword, setUpdatingPassword] = useState(false);

  const [signOutError, setSignOutError] = useState<string | null>(null);
  const [signingOutEverywhere, setSigningOutEverywhere] = useState(false);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    setName(user?.name ?? "");
    setPhone(user?.phone ?? "");
  }, [user?.id, user?.name, user?.phone]);

  useEffect(() => {
    if (!user) return;
    const savedMock = loadSettingsProfileMock(user.id);
    setDisplayName(savedMock.displayName);
    setTwoStepSignIn(savedMock.twoStepSignIn);
    setNotifications(savedMock.notifications);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  useEffect(() => {
    if (!user) return;
    saveSettingsProfileMock(user.id, { displayName, twoStepSignIn, notifications });
  }, [user, displayName, twoStepSignIn, notifications]);

  useEffect(() => {
    return () => {
      if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    };
  }, [avatarPreview]);

  const isDirty =
    name !== (user?.name ?? "") ||
    phone !== (user?.phone ?? "") ||
    avatarBlob !== null ||
    removeAvatar ||
    displayName !== loadSettingsProfileMock(user?.id ?? "").displayName;

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
      saveSettingsProfileMock(user.id, {
        displayName,
        twoStepSignIn,
        notifications,
      });
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

  function handleDiscard() {
    setName(user?.name ?? "");
    setPhone(user?.phone ?? "");
    setAvatarBlob(null);
    setAvatarPreview(null);
    setRemoveAvatar(false);
    setFormError(null);
    if (user) setDisplayName(loadSettingsProfileMock(user.id).displayName);
  }

  function openSetPinModal() {
    setSetPinError(null);
    setShowSetPinModal(true);
  }

  function closeSetPinModal() {
    setShowSetPinModal(false);
  }

  async function handleSetPin(pin: string) {
    setSetPinSubmitting(true);
    setSetPinError(null);
    try {
      const result = await setOwnPin(pin);
      if (!result.ok) {
        setSetPinError(result.error);
        return;
      }
      setShowSetPinModal(false);
    } catch (err) {
      setSetPinError(err instanceof Error ? err.message : ERROR_COULD_NOT_SET_PIN);
    } finally {
      setSetPinSubmitting(false);
    }
  }

  function toggleNotification(key: keyof NotificationPreferences) {
    setNotifications((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function openChangePassword() {
    setPasswordError(null);
    setPasswordSaved(false);
    setNewPassword("");
    setConfirmNewPassword("");
    setShowChangePassword(true);
  }

  function closeChangePassword() {
    setShowChangePassword(false);
  }

  async function handleChangePassword(e: FormEvent) {
    e.preventDefault();
    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      setPasswordError(ERROR_PASSWORD_TOO_SHORT);
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setPasswordError(ERROR_PASSWORDS_DO_NOT_MATCH);
      return;
    }
    setUpdatingPassword(true);
    setPasswordError(null);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) {
        setPasswordError(error.message || ERROR_COULD_NOT_UPDATE_PASSWORD);
        return;
      }
      setPasswordSaved(true);
      setNewPassword("");
      setConfirmNewPassword("");
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : ERROR_COULD_NOT_UPDATE_PASSWORD);
    } finally {
      setUpdatingPassword(false);
    }
  }

  async function handleSignOutEverywhere() {
    setSigningOutEverywhere(true);
    setSignOutError(null);
    try {
      const { error } = await supabase.auth.signOut({ scope: "global" });
      if (error) {
        setSignOutError(error.message || ERROR_COULD_NOT_SIGN_OUT_EVERYWHERE);
      }
      // A successful global sign-out also ends this session — the
      // onAuthStateChange listener in AuthProvider clears `user`, and
      // ProtectedRoute redirects to /login on its own.
    } catch (err) {
      setSignOutError(err instanceof Error ? err.message : ERROR_COULD_NOT_SIGN_OUT_EVERYWHERE);
    } finally {
      setSigningOutEverywhere(false);
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

  function openDeleteModal() {
    setDeleteError(null);
    setShowDeleteModal(true);
  }

  function closeDeleteModal() {
    setShowDeleteModal(false);
  }

  const displayedAvatar = avatarPreview ?? (!removeAvatar ? user?.avatarUrl : null);

  return {
    user,
    name,
    setName,
    phone,
    setPhone,
    displayName,
    setDisplayName,
    displayedAvatar,
    imageError,
    processingImage,
    formError,
    saved,
    submitting,
    isDirty,
    handleImageSelect,
    handleRemoveAvatar,
    handleSubmit,
    handleDiscard,

    hasPin: user?.hasPin ?? false,
    showSetPinModal,
    onSetPinClick: openSetPinModal,
    closeSetPinModal,
    setPinSubmitting,
    setPinError,
    onSetPinSubmit: handleSetPin,
    twoStepSignIn,
    setTwoStepSignIn,
    notifications,
    toggleNotification,

    showChangePassword,
    openChangePassword,
    closeChangePassword,
    newPassword,
    setNewPassword,
    confirmNewPassword,
    setConfirmNewPassword,
    passwordError,
    passwordSaved,
    updatingPassword,
    onChangePasswordSubmit: handleChangePassword,

    signOutError,
    signingOutEverywhere,
    onSignOutEverywhere: handleSignOutEverywhere,

    showDeleteModal,
    openDeleteModal,
    closeDeleteModal,
    deleteError,
    deleting,
    handleDeleteAccount,
  };
}
