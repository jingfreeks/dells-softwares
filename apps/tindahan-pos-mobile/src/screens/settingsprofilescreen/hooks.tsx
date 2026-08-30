import { useEffect, useState } from "react";
import { useAuth } from "../../lib/auth";
import { initialsOf } from "../../lib/format";
import { pickAndOptimizeImage, uploadImage, type OptimizedImage } from "../../lib/imageUpload";
import {
  DEFAULT_SETTINGS_PROFILE_MOCK,
  loadSettingsProfileMock,
  saveSettingsProfileMock,
  type NotificationPreferences,
  type SettingsProfileMock,
} from "../../lib/settingsProfileMock";

/** Same cap the onboarding wizard uses for the same bucket/path. */
const AVATAR_MAX_DIMENSION = 512;

/**
 * Everything behind mobile-settings-profile.html.
 *
 * Two persistence paths, deliberately not blurred together:
 *   - name/phone/avatar go to the real `staff` row via updateProfile()
 *   - display name, two-step sign-in and the notification toggles have no
 *     backend column, so they go to AsyncStorage via settingsProfileMock --
 *     exactly what the web app does with the same fields.
 * "Save changes" writes both; a failure in the real half is surfaced and
 * does NOT clear the user's edits.
 */
export function useSettingsProfileScreen() {
  const { user, updateProfile } = useAuth();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [mock, setMock] = useState<SettingsProfileMock>(DEFAULT_SETTINGS_PROFILE_MOCK);
  const [loaded, setLoaded] = useState(false);

  const [avatarImage, setAvatarImage] = useState<OptimizedImage | null>(null);
  /** Set when "Remove" is tapped, so Save knows to null the column out. */
  const [avatarRemoved, setAvatarRemoved] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  // Seed the form from the signed-in staff row, then load the mock-only
  // fields. Keyed on user.id so a re-login re-seeds rather than showing
  // the previous account's edits.
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setName(user.name);
    setPhone(user.phone ?? "");
    loadSettingsProfileMock(user.id).then((stored) => {
      if (!cancelled) {
        setMock(stored);
        setLoaded(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  // Compared against what's stored rather than tracked with a flag, so
  // toggling something off and back on again correctly reads as clean.
  const [storedMock, setStoredMock] = useState<SettingsProfileMock>(DEFAULT_SETTINGS_PROFILE_MOCK);
  useEffect(() => {
    if (loaded) setStoredMock(mock);
    // Only when the initial load lands -- not on every edit.
  }, [loaded]);
  const mockDirty = JSON.stringify(mock) !== JSON.stringify(storedMock);

  const dirty =
    !!user &&
    (name !== user.name ||
      phone !== (user.phone ?? "") ||
      avatarImage !== null ||
      avatarRemoved ||
      mockDirty);

  async function handlePickAvatar() {
    setAvatarError(null);
    try {
      const picked = await pickAndOptimizeImage(AVATAR_MAX_DIMENSION);
      if (picked) {
        setAvatarImage(picked);
        setAvatarRemoved(false);
      }
    } catch (err) {
      setAvatarError(err instanceof Error ? err.message : "Could not process the image.");
    }
  }

  function handleRemoveAvatar() {
    setAvatarImage(null);
    setAvatarRemoved(true);
    setAvatarError(null);
  }

  function setNotification(key: keyof NotificationPreferences, value: boolean) {
    setMock((prev) => ({ ...prev, notifications: { ...prev.notifications, [key]: value } }));
  }

  function handleDiscard() {
    if (!user) return;
    setName(user.name);
    setPhone(user.phone ?? "");
    setMock(storedMock);
    setAvatarImage(null);
    setAvatarRemoved(false);
    setAvatarError(null);
    setError(null);
    setSaved(false);
  }

  async function handleSave() {
    if (!user) return;
    if (!name.trim()) {
      setError("Your name is required.");
      return;
    }
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      let avatarUrl: string | null | undefined;
      if (avatarImage) {
        avatarUrl = await uploadImage("avatars", `${user.storeId}/${user.id}/avatar.jpg`, avatarImage);
      } else if (avatarRemoved) {
        avatarUrl = null;
      }

      const result = await updateProfile({
        name: name.trim(),
        phone: phone.trim() || null,
        ...(avatarUrl !== undefined && { avatarUrl }),
      });
      if (!result.ok) {
        // Keep the user's edits on screen -- they can fix and retry.
        setError(result.error);
        return;
      }

      await saveSettingsProfileMock(user.id, mock);
      setStoredMock(mock);
      setAvatarImage(null);
      setAvatarRemoved(false);
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save your profile.");
    } finally {
      setSaving(false);
    }
  }

  const avatarUri = avatarImage?.uri ?? (avatarRemoved ? null : user?.avatarUrl ?? null);

  return {
    name,
    setName,
    phone,
    setPhone,
    displayName: mock.displayName,
    setDisplayName: (value: string) => setMock((prev) => ({ ...prev, displayName: value })),
    twoStepSignIn: mock.twoStepSignIn,
    toggleTwoStepSignIn: () => setMock((prev) => ({ ...prev, twoStepSignIn: !prev.twoStepSignIn })),
    notifications: mock.notifications,
    setNotification,
    email: user?.email ?? "",
    initials: initialsOf(user?.name ?? ""),
    avatarUri,
    avatarError,
    hasPin: user?.hasPin ?? false,
    onPickAvatar: handlePickAvatar,
    onRemoveAvatar: handleRemoveAvatar,
    canRemoveAvatar: avatarUri !== null,
    dirty,
    saving,
    error,
    saved,
    onSave: handleSave,
    onDiscard: handleDiscard,
  };
}
