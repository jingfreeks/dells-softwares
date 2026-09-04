import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../../lib/auth";
import { useBillingState } from "../../lib/billing";
import { startTrialBestEffort } from "../../lib/startTrial";
import { useStoreData } from "../../lib/storeData";
import {
  computeAverageSaleValue,
  type OnboardingStep,
} from "../../lib/onboarding";
import {
  DEFAULT_OPENING_HOURS,
  clearOnboardingStep,
  loadOnboardingStep,
  loadOpeningHours,
  saveOnboardingStep,
  saveOpeningHours,
} from "../../lib/onboardingSettings";
import { pickAndOptimizeImage, uploadImage, type OptimizedImage } from "../../lib/imageUpload";
import { useStockAlertsStep } from "./useStockAlertsStep";
import { useOpenRegisterStep } from "./useOpenRegisterStep";
import { useProductsStep } from "./useProductsStep";

// Same caps as the web app's Onboarding/hooks.tsx (AVATAR_MAX_DIMENSION/STORE_PHOTO_MAX_DIMENSION).
const AVATAR_MAX_DIMENSION = 512;
const STORE_PHOTO_MAX_DIMENSION = 1024;

/** All state + logic for OnboardingScreen -- OnboardingScreen.tsx stays presentational. */
export function useOnboardingScreen() {
  const { user, store, updateProfile, updateStore, completeOnboarding } = useAuth();
  const billing = useBillingState();
  const { products, sales } = useStoreData();

  const [step, setStepRaw] = useState<OnboardingStep>("welcome");
  const [trialStarted, setTrialStarted] = useState(false);

  // Trial starts the moment the wizard reaches "done" -- that's the
  // screen whose copy confirms it (mobile-30) -- not on finish, so the
  // confirmation is already true by the time it renders. Reaching "done"
  // only happens via the real "Set Up My Store" path ("Explore Demo"
  // exits the wizard entirely before any step change), so this fires
  // unconditionally -- start_trial() itself is the idempotency guard.
  function setStep(next: OnboardingStep) {
    if (next === "done" && !billing?.trialEndsAt) {
      startTrialBestEffort("BUSINESS");
      setTrialStarted(true);
    }
    setStepRaw(next);
  }

  // Profile step
  const [name, setName] = useState(user?.name ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [address, setAddress] = useState(user?.address ?? "");
  const [storeName, setStoreName] = useState(store?.name ?? "");
  const [storeAddress, setStoreAddress] = useState(store?.address ?? "");
  const [sameAsProfile, setSameAsProfile] = useState(false);
  const [avatarImage, setAvatarImage] = useState<OptimizedImage | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [storePhotoImage, setStorePhotoImage] = useState<OptimizedImage | null>(null);
  const [storePhotoUploading, setStorePhotoUploading] = useState(false);
  const [storePhotoError, setStorePhotoError] = useState<string | null>(null);
  const [openTime, setOpenTime] = useState(DEFAULT_OPENING_HOURS.openTime);
  const [closeTime, setCloseTime] = useState(DEFAULT_OPENING_HOURS.closeTime);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);

  // Products step

  // Stock alerts step

  // Open register step

  // Done step
  // Two steps own their own state now, mirroring the web app's split of the
  // same wizard. What is left here is the wizard itself plus the profile,
  // store-details and products steps.
  const stockAlerts = useStockAlertsStep();
  const openRegister = useOpenRegisterStep();
  const productsStep = useProductsStep();

  const [finishing, setFinishing] = useState(false);
  const [finishError, setFinishError] = useState<string | null>(null);

  // Loads once per store, then every change saves back -- mirrors the web
  // app's own localStorage-only approach for these settings (there's no
  // backend column for them yet). Guarded by refs so the initial load
  // doesn't immediately re-save the just-loaded value as a "change".
  const hoursLoadedRef = useRef(false);
  const stepResumedRef = useRef(false);

  // Resumes mid-flow on reload instead of always restarting at "welcome" --
  // same guard shape as the other loaded-refs above.
  useEffect(() => {
    if (!user) return;
    loadOnboardingStep(user.storeId).then((savedStep) => {
      if (savedStep) setStep(savedStep);
      stepResumedRef.current = true;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.storeId]);

  useEffect(() => {
    if (!user || !stepResumedRef.current) return;
    saveOnboardingStep(user.storeId, step);
  }, [user, step]);

  useEffect(() => {
    if (!user) return;
    loadOpeningHours(user.storeId).then((saved) => {
      setOpenTime(saved.openTime);
      setCloseTime(saved.closeTime);
      hoursLoadedRef.current = true;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.storeId]);

  useEffect(() => {
    if (!user || !hoursLoadedRef.current) return;
    saveOpeningHours(user.storeId, { openTime, closeTime });
  }, [user, openTime, closeTime]);


  const averageSaleValue = useMemo(() => computeAverageSaleValue(sales), [sales]);


  async function handlePickAvatar() {
    setAvatarError(null);
    try {
      const picked = await pickAndOptimizeImage(AVATAR_MAX_DIMENSION);
      if (picked) setAvatarImage(picked);
    } catch (err) {
      setAvatarError(err instanceof Error ? err.message : "Could not process the image.");
    }
  }

  async function handlePickStorePhoto() {
    setStorePhotoError(null);
    try {
      const picked = await pickAndOptimizeImage(STORE_PHOTO_MAX_DIMENSION);
      if (picked) setStorePhotoImage(picked);
    } catch (err) {
      setStorePhotoError(err instanceof Error ? err.message : "Could not process the image.");
    }
  }

  async function handleProfileContinue() {
    if (!name.trim()) {
      setProfileError("Your name is required.");
      return;
    }
    if (!storeName.trim()) {
      setProfileError("Store name is required.");
      return;
    }
    setSavingProfile(true);
    setProfileError(null);
    try {
      let avatarUrl: string | undefined;
      if (avatarImage && user) {
        setAvatarUploading(true);
        avatarUrl = await uploadImage("avatars", `${user.storeId}/${user.id}/avatar.jpg`, avatarImage);
        setAvatarUploading(false);
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
      if (storePhotoImage && user) {
        setStorePhotoUploading(true);
        photoUrl = await uploadImage("store-photos", `${user.storeId}/store-photo.jpg`, storePhotoImage);
        setStorePhotoUploading(false);
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
      setProfileError(err instanceof Error ? err.message : "Could not save your profile.");
    } finally {
      setSavingProfile(false);
      setAvatarUploading(false);
      setStorePhotoUploading(false);
    }
  }





  async function handleFinish() {
    setFinishing(true);
    setFinishError(null);
    const result = await completeOnboarding();
    if (!result.ok) {
      setFinishError(result.error);
      setFinishing(false);
      return;
    }
    if (user) await clearOnboardingStep(user.storeId);
  }

  return {
    user,
    store,
    products,
    step,
    setStep,
    trialStarted,
    name,
    setName,
    phone,
    setPhone,
    address,
    setAddress,
    storeName,
    setStoreName,
    storeAddress,
    setStoreAddress,
    sameAsProfile,
    setSameAsProfile,
    avatarImage,
    avatarUploading,
    avatarError,
    handlePickAvatar,
    storePhotoImage,
    storePhotoUploading,
    storePhotoError,
    handlePickStorePhoto,
    openTime,
    setOpenTime,
    closeTime,
    setCloseTime,
    profileError,
    savingProfile,
    handleProfileContinue,
    ...productsStep,
    // Spread rather than re-listed: the screen's props are unchanged by the
    // split, so nothing downstream had to move.
    ...stockAlerts,
    ...openRegister,
    averageSaleValue,
    finishing,
    finishError,
    handleFinish,
  };
}
