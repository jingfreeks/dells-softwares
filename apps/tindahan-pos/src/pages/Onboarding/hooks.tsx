import { useEffect, useRef, useState, type ChangeEvent } from "react";
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
} from "@/lib";
import { loadOnboardingStep, saveOnboardingStep, clearOnboardingStep } from "./onboardingProgress";
import { loadOpeningHours, saveOpeningHours, DEFAULT_OPENING_HOURS } from "./openingHoursSettings";

const AVATAR_MAX_DIMENSION = 512;
const STORE_PHOTO_MAX_DIMENSION = 1024;

export type OnboardingStep = "welcome" | "profile" | "products" | "stockAlerts" | "openRegister" | "congrats";

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

  const [storeName, setStoreName] = useState("");
  const [storeAddress, setStoreAddress] = useState("");
  const [sameAsProfile, setSameAsProfile] = useState(false);
  const [storePhotoBlob, setStorePhotoBlob] = useState<Blob | null>(null);
  const [storePhotoPreview, setStorePhotoPreview] = useState<string | null>(null);
  const [storePhotoError, setStorePhotoError] = useState<string | null>(null);
  const [processingStorePhoto, setProcessingStorePhoto] = useState(false);

  const [openTime, setOpenTime] = useState(DEFAULT_OPENING_HOURS.openTime);
  const [closeTime, setCloseTime] = useState(DEFAULT_OPENING_HOURS.closeTime);

  const [profileError, setProfileError] = useState<string | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);

  const [finishing, setFinishing] = useState(false);
  const [finishError, setFinishError] = useState<string | null>(null);

  // Resume mid-flow on reload instead of always restarting at "welcome".
  // Guarded by a ref so the very first run — which may flip `step` away
  // from its "welcome" default — doesn't immediately re-save that stale
  // default and clobber the value it just loaded.
  const hasResumedRef = useRef(false);
  useEffect(() => {
    if (!user) return;
    if (!hasResumedRef.current) {
      hasResumedRef.current = true;
      const savedStep = loadOnboardingStep(user.storeId);
      if (savedStep) setStep(savedStep);
      return;
    }
    saveOnboardingStep(user.storeId, step);
  }, [user, step]);

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

  // Opening hours have no backend column yet — draft auto-saves to
  // localStorage as the admin picks them, separate from the Supabase
  // updateProfile/updateStore writes that only happen on Continue.
  useEffect(() => {
    if (!user) return;
    const saved = loadOpeningHours(user.storeId);
    setOpenTime(saved.openTime);
    setCloseTime(saved.closeTime);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.storeId]);

  useEffect(() => {
    if (!user) return;
    saveOpeningHours(user.storeId, { openTime, closeTime });
  }, [user, openTime, closeTime]);

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

  async function handleProfileContinue() {
    if (!user) return;
    if (!name.trim()) {
      setProfileError(ERROR_NAME_REQUIRED);
      return;
    }
    if (!storeName.trim()) {
      setProfileError(ERROR_STORE_NAME_REQUIRED);
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
      const profileResult = await updateProfile({
        name: name.trim(),
        phone: phone.trim() || null,
        address: address.trim() || null,
        ...(avatarUrl !== undefined && { avatarUrl }),
      });
      if (!profileResult.ok) {
        setProfileError(profileResult.error);
        return;
      }

      let photoUrl: string | undefined;
      if (storePhotoBlob) {
        const path = `${user.storeId}/store-photo.webp`;
        photoUrl = await uploadImage(supabase, "store-photos", path, storePhotoBlob);
      }
      const effectiveAddress = sameAsProfile ? address : storeAddress;
      const storeResult = await updateStore({
        name: storeName.trim(),
        address: effectiveAddress.trim() || null,
        ...(photoUrl !== undefined && { photoUrl }),
      });
      if (!storeResult.ok) {
        setProfileError(storeResult.error);
        return;
      }

      setStep("products");
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : ERROR_COULD_NOT_SAVE_YOUR_PROFILE);
    } finally {
      setSavingProfile(false);
    }
  }

  function handleProfileSkip() {
    setStep("products");
  }

  function goToProfileStep() {
    setStep("profile");
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
    // when they leave via "Start selling"/"See the dashboard" instead.
    setStep("congrats");
  }

  async function handleFinish(destination: "/pos" | "/admin") {
    setFinishing(true);
    setFinishError(null);
    const result = await completeOnboarding();
    if (!result.ok) {
      setFinishError(result.error);
      setFinishing(false);
      return;
    }
    if (user) clearOnboardingStep(user.storeId);
    navigate(destination, { replace: true });
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

    openTime,
    setOpenTime,
    closeTime,
    setCloseTime,

    profileError,
    savingProfile,
    onProfileContinue: handleProfileContinue,
    onProfileSkip: handleProfileSkip,

    finishing,
    finishError,
    onFinish: handleFinish,
  };
}
