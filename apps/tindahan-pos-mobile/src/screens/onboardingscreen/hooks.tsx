import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../../lib/auth";
import { useBillingState } from "../../lib/billing";
import { startTrialBestEffort } from "../../lib/startTrial";
import { useStoreData } from "../../lib/storeData";
import {
  DEFAULT_LOW_STOCK_THRESHOLD,
  STARTER_CATALOG,
  computeAverageSaleValue,
  computeStartingFloat,
  computeStockAlertPreview,
  type DenominationCounts,
  type OnboardingStep,
} from "../../lib/onboarding";
import {
  DEFAULT_OPENING_HOURS,
  DEFAULT_STOCK_ALERT_SETTINGS,
  clearOnboardingStep,
  loadDenominationCounts,
  loadOnboardingStep,
  loadOpeningHours,
  loadStockAlertSettings,
  saveDenominationCounts,
  saveOnboardingStep,
  saveOpeningHours,
  saveStockAlertSettings,
} from "../../lib/onboardingSettings";
import { pickAndOptimizeImage, uploadImage, type OptimizedImage } from "../../lib/imageUpload";
import { pickCsvFileText } from "../../lib/documentPicker";
import { parseProductsCsv } from "../../lib/csv";
import type { Category } from "../../lib/types";
import { EMPTY_QUICK_ADD_FORM, type QuickAddForm } from "../onboarding/quickaddproductmodal";

const UNCATEGORIZED = "Uncategorized";
// Same caps as the web app's Onboarding/hooks.tsx (AVATAR_MAX_DIMENSION/STORE_PHOTO_MAX_DIMENSION).
const AVATAR_MAX_DIMENSION = 512;
const STORE_PHOTO_MAX_DIMENSION = 1024;

/** All state + logic for OnboardingScreen -- OnboardingScreen.tsx stays presentational. */
export function useOnboardingScreen() {
  const { user, store, updateProfile, updateStore, completeOnboarding } = useAuth();
  const billing = useBillingState();
  const { products, categories, sales, addProduct, addCategory } = useStoreData();

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
  const [enabledCategoryKeys, setEnabledCategoryKeys] = useState<Set<string>>(
    () => new Set(STARTER_CATALOG.map((c) => c.key))
  );
  const [importingStarter, setImportingStarter] = useState(false);
  const [starterError, setStarterError] = useState<string | null>(null);
  const [importingCsv, setImportingCsv] = useState(false);
  const [csvError, setCsvError] = useState<string | null>(null);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [quickAddForm, setQuickAddForm] = useState<QuickAddForm>(EMPTY_QUICK_ADD_FORM);
  const [quickAddError, setQuickAddError] = useState<string | null>(null);
  const [savingQuickAdd, setSavingQuickAdd] = useState(false);

  // Stock alerts step
  const [thresholdDays, setThresholdDays] = useState(DEFAULT_STOCK_ALERT_SETTINGS.thresholdDays);
  const [fastMoverBoost, setFastMoverBoost] = useState(DEFAULT_STOCK_ALERT_SETTINGS.fastMoverBoost);
  const [dailySummary, setDailySummary] = useState(DEFAULT_STOCK_ALERT_SETTINGS.dailySummary);

  // Open register step
  const [denominationCounts, setDenominationCounts] = useState<DenominationCounts>({});

  // Done step
  const [finishing, setFinishing] = useState(false);
  const [finishError, setFinishError] = useState<string | null>(null);

  // Loads once per store, then every change saves back -- mirrors the web
  // app's own localStorage-only approach for these settings (there's no
  // backend column for them yet). Guarded by refs so the initial load
  // doesn't immediately re-save the just-loaded value as a "change".
  const hoursLoadedRef = useRef(false);
  const stockAlertsLoadedRef = useRef(false);
  const denominationsLoadedRef = useRef(false);
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
    loadStockAlertSettings(user.storeId).then((saved) => {
      setThresholdDays(saved.thresholdDays);
      setFastMoverBoost(saved.fastMoverBoost);
      setDailySummary(saved.dailySummary);
      stockAlertsLoadedRef.current = true;
    });
    loadDenominationCounts(user.storeId).then((saved) => {
      setDenominationCounts(saved);
      denominationsLoadedRef.current = true;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.storeId]);

  useEffect(() => {
    if (!user || !hoursLoadedRef.current) return;
    saveOpeningHours(user.storeId, { openTime, closeTime });
  }, [user, openTime, closeTime]);

  useEffect(() => {
    if (!user || !stockAlertsLoadedRef.current) return;
    saveStockAlertSettings(user.storeId, { thresholdDays, fastMoverBoost, dailySummary });
  }, [user, thresholdDays, fastMoverBoost, dailySummary]);

  useEffect(() => {
    if (!user || !denominationsLoadedRef.current) return;
    saveDenominationCounts(user.storeId, denominationCounts);
  }, [user, denominationCounts]);

  const starterItemsToAdd = useMemo(
    () => STARTER_CATALOG.filter((c) => enabledCategoryKeys.has(c.key)).flatMap((c) => c.items),
    [enabledCategoryKeys]
  );

  const stockAlertPreview = useMemo(
    () => computeStockAlertPreview(products, sales, thresholdDays, fastMoverBoost),
    [products, sales, thresholdDays, fastMoverBoost]
  );

  const averageSaleValue = useMemo(() => computeAverageSaleValue(sales), [sales]);
  const startingFloat = useMemo(() => computeStartingFloat(denominationCounts), [denominationCounts]);

  async function resolveCategoryId(categoryName: string): Promise<string> {
    const existing = categories.find((c) => c.name.toLowerCase() === categoryName.toLowerCase());
    if (existing) return existing.id;
    const created: Category = await addCategory(categoryName);
    return created.id;
  }

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

  async function handleImportStarterCatalog() {
    setImportingStarter(true);
    setStarterError(null);
    try {
      const categoriesToImport = STARTER_CATALOG.filter((c) => enabledCategoryKeys.has(c.key));
      for (const category of categoriesToImport) {
        const categoryId = await resolveCategoryId(category.label);
        for (const item of category.items) {
          await addProduct({
            barcode: null,
            name: item.name,
            price: item.price,
            stock: 0,
            lowStockThreshold: DEFAULT_LOW_STOCK_THRESHOLD,
            categoryId,
            packQuantity: null,
            packPrice: null,
            imageUrl: null,
          });
        }
      }
    } catch (err) {
      setStarterError(err instanceof Error ? err.message : "Could not import the starter list.");
    } finally {
      setImportingStarter(false);
    }
  }

  async function handleImportCsv() {
    setImportingCsv(true);
    setCsvError(null);
    try {
      const text = await pickCsvFileText();
      if (text === null) return; // user cancelled
      const { rows, error } = parseProductsCsv(text);
      if (error === "empty") {
        setCsvError("That file doesn't have any product rows.");
        return;
      }
      if (error === "missing-columns") {
        setCsvError("The file needs at least a name and price column.");
        return;
      }
      for (const row of rows) {
        const categoryId = await resolveCategoryId(row.category ?? UNCATEGORIZED);
        await addProduct({
          barcode: row.barcode,
          name: row.name,
          price: row.price,
          stock: 0,
          lowStockThreshold: DEFAULT_LOW_STOCK_THRESHOLD,
          categoryId,
          packQuantity: null,
          packPrice: null,
          imageUrl: null,
        });
      }
    } catch (err) {
      setCsvError(err instanceof Error ? err.message : "Could not import that file.");
    } finally {
      setImportingCsv(false);
    }
  }

  function handleScannedBarcode(code: string) {
    setShowQuickAdd(true);
    setQuickAddForm({ ...EMPTY_QUICK_ADD_FORM, barcode: code });
  }

  async function handleQuickAddSubmit() {
    const trimmedName = quickAddForm.name.trim();
    const price = Number(quickAddForm.price);
    if (!trimmedName) {
      setQuickAddError("Name is required.");
      return;
    }
    if (Number.isNaN(price) || price < 0) {
      setQuickAddError("Enter a valid price.");
      return;
    }
    setSavingQuickAdd(true);
    setQuickAddError(null);
    try {
      const categoryId = await resolveCategoryId(UNCATEGORIZED);
      await addProduct({
        barcode: quickAddForm.barcode.trim() || null,
        name: trimmedName,
        price,
        stock: 0,
        lowStockThreshold: DEFAULT_LOW_STOCK_THRESHOLD,
        categoryId,
        packQuantity: null,
        packPrice: null,
        imageUrl: null,
      });
      setQuickAddForm(EMPTY_QUICK_ADD_FORM);
      setShowQuickAdd(false);
    } catch (err) {
      setQuickAddError(err instanceof Error ? err.message : "Could not add product.");
    } finally {
      setSavingQuickAdd(false);
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
    enabledCategoryKeys,
    setEnabledCategoryKeys,
    starterItemsToAdd,
    importingStarter,
    starterError,
    handleImportStarterCatalog,
    importingCsv,
    csvError,
    handleImportCsv,
    showQuickAdd,
    setShowQuickAdd,
    quickAddForm,
    setQuickAddForm,
    quickAddError,
    savingQuickAdd,
    handleQuickAddSubmit,
    handleScannedBarcode,
    thresholdDays,
    setThresholdDays,
    fastMoverBoost,
    setFastMoverBoost,
    dailySummary,
    setDailySummary,
    stockAlertPreview,
    denominationCounts,
    setDenominationCounts,
    averageSaleValue,
    startingFloat,
    finishing,
    finishError,
    handleFinish,
  };
}
