import { useEffect, useState, type ChangeEvent } from "react";
import { useNavigate } from "react-router-dom";
import {
  useAuth,
  supabase,
  uploadImage,
  validateAndOptimizeImage,
  ERROR_NAME_REQUIRED,
  ERROR_STORE_NAME_REQUIRED,
  ERROR_COULD_NOT_PROCESS_IMAGE,
  ERROR_COULD_NOT_SAVE_YOUR_PROFILE,
  ERROR_COULD_NOT_SAVE_YOUR_STORE,
} from "@/lib";

const AVATAR_MAX_DIMENSION = 512;
const STORE_PHOTO_MAX_DIMENSION = 1024;

export type OnboardingStep =
  | "welcome"
  | "profile"
  | "store"
  | "products"
  | "stockAlerts"
  | "openRegister"
  | "congrats";

export function useOnboardingWizard() {
  const { user, store, updateProfile, updateStore, completeOnboarding } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState<OnboardingStep>("welcome");

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [avatarBlob, setAvatarBlob] = useState<Blob | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [processingAvatar, setProcessingAvatar] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);

  const [storeName, setStoreName] = useState("");
  const [storeAddress, setStoreAddress] = useState("");
  const [sameAsProfile, setSameAsProfile] = useState(false);
  const [storePhotoBlob, setStorePhotoBlob] = useState<Blob | null>(null);
  const [storePhotoPreview, setStorePhotoPreview] = useState<string | null>(null);
  const [storePhotoError, setStorePhotoError] = useState<string | null>(null);
  const [processingStorePhoto, setProcessingStorePhoto] = useState(false);
  const [storeError, setStoreError] = useState<string | null>(null);
  const [savingStore, setSavingStore] = useState(false);

  const [finishing, setFinishing] = useState(false);
  const [finishError, setFinishError] = useState<string | null>(null);

  // Seed once per signed-in user, not on every keystroke re-render.
  useEffect(() => {
    setName(user?.name ?? "");
    setPhone(user?.phone ?? "");
    setAddress(user?.address ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Seed once per store, not on every keystroke re-render.
  useEffect(() => {
    setStoreName(store?.name ?? "");
    setStoreAddress(store?.address ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store?.id]);

  useEffect(() => {
    return () => {
      if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    };
  }, [avatarPreview]);

  useEffect(() => {
    return () => {
      if (storePhotoPreview) URL.revokeObjectURL(storePhotoPreview);
    };
  }, [storePhotoPreview]);

  async function handleAvatarSelect(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setAvatarError(null);
    setProcessingAvatar(true);
    try {
      const blob = await validateAndOptimizeImage(file, { maxDimension: AVATAR_MAX_DIMENSION });
      setAvatarBlob(blob);
      setAvatarPreview(URL.createObjectURL(blob));
    } catch (err) {
      setAvatarError(err instanceof Error ? err.message : ERROR_COULD_NOT_PROCESS_IMAGE);
    } finally {
      setProcessingAvatar(false);
    }
  }

  async function handleStorePhotoSelect(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setStorePhotoError(null);
    setProcessingStorePhoto(true);
    try {
      const blob = await validateAndOptimizeImage(file, { maxDimension: STORE_PHOTO_MAX_DIMENSION });
      setStorePhotoBlob(blob);
      setStorePhotoPreview(URL.createObjectURL(blob));
    } catch (err) {
      setStorePhotoError(err instanceof Error ? err.message : ERROR_COULD_NOT_PROCESS_IMAGE);
    } finally {
      setProcessingStorePhoto(false);
    }
  }

  async function handleProfileNext() {
    if (!user) return;
    if (!name.trim()) {
      setProfileError(ERROR_NAME_REQUIRED);
      return;
    }
    setSavingProfile(true);
    setProfileError(null);
    try {
      let avatarUrl: string | undefined;
      if (avatarBlob) {
        const path = `${user.storeId}/${user.id}/avatar.webp`;
        avatarUrl = await uploadImage(supabase, "avatars", path, avatarBlob);
      }
      const result = await updateProfile({
        name: name.trim(),
        phone: phone.trim() || null,
        address: address.trim() || null,
        ...(avatarUrl !== undefined && { avatarUrl }),
      });
      if (!result.ok) {
        setProfileError(result.error);
        return;
      }
      setStep("store");
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : ERROR_COULD_NOT_SAVE_YOUR_PROFILE);
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleStoreFinish() {
    if (!user) return;
    if (!storeName.trim()) {
      setStoreError(ERROR_STORE_NAME_REQUIRED);
      return;
    }
    const effectiveAddress = sameAsProfile ? address : storeAddress;
    setSavingStore(true);
    setStoreError(null);
    try {
      let photoUrl: string | undefined;
      if (storePhotoBlob) {
        const path = `${user.storeId}/store-photo.webp`;
        photoUrl = await uploadImage(supabase, "store-photos", path, storePhotoBlob);
      }
      const storeResult = await updateStore({
        name: storeName.trim(),
        address: effectiveAddress.trim() || null,
        ...(photoUrl !== undefined && { photoUrl }),
      });
      if (!storeResult.ok) {
        setStoreError(storeResult.error);
        return;
      }
      setStep("products");
    } catch (err) {
      setStoreError(err instanceof Error ? err.message : ERROR_COULD_NOT_SAVE_YOUR_STORE);
    } finally {
      setSavingStore(false);
    }
  }

  function goToStockAlertsStep() {
    setStep("stockAlerts");
  }

  function goToOpenRegisterStep() {
    setStep("openRegister");
  }

  function goToCongratsStep() {
    // Deliberately not marking onboarding complete yet — that flips
    // user.onboardedAt, and OnboardingRoute would immediately redirect
    // away before the congrats step ever renders. It's marked complete
    // when they leave via "Go to dashboard" instead.
    setStep("congrats");
  }

  async function handleGoToDashboard() {
    setFinishing(true);
    setFinishError(null);
    const result = await completeOnboarding();
    if (!result.ok) {
      setFinishError(result.error);
      setFinishing(false);
      return;
    }
    navigate("/admin", { replace: true });
  }

  function goToProfileStep() {
    setStep("profile");
  }

  const displayedAvatar = avatarPreview ?? user?.avatarUrl ?? null;
  const displayedStorePhoto = storePhotoPreview ?? store?.photoUrl ?? null;
  const displayedStoreAddress = sameAsProfile ? address : storeAddress;

  return {
    step,
    goToProfileStep,
    goToStockAlertsStep,
    goToOpenRegisterStep,
    goToCongratsStep,

    name,
    setName,
    phone,
    setPhone,
    address,
    setAddress,
    displayedAvatar,
    avatarError,
    processingAvatar,
    onAvatarSelect: handleAvatarSelect,
    profileError,
    savingProfile,
    onProfileNext: handleProfileNext,

    storeName,
    setStoreName,
    storeAddress,
    setStoreAddress,
    displayedStoreAddress,
    sameAsProfile,
    setSameAsProfile,
    displayedStorePhoto,
    storePhotoError,
    processingStorePhoto,
    onStorePhotoSelect: handleStorePhotoSelect,
    storeError,
    savingStore,
    onStoreFinish: handleStoreFinish,

    finishing,
    finishError,
    onGoToDashboard: handleGoToDashboard,
  };
}
