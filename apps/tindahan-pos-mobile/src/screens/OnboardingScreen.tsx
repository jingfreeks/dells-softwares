import { useEffect, useMemo, useRef, useState } from "react";
import { ScreenContainer } from "../components/ScreenContainer";
import { useAuth } from "../lib/auth";
import { useStoreData } from "../lib/storeData";
import {
  DEFAULT_LOW_STOCK_THRESHOLD,
  STARTER_CATALOG,
  computeAverageSaleValue,
  computeStartingFloat,
  computeStockAlertPreview,
  type DenominationCounts,
  type OnboardingStep,
} from "../lib/onboarding";
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
} from "../lib/onboardingSettings";
import type { Category } from "../lib/types";
import { WelcomeStep } from "./onboarding/WelcomeStep";
import { ProfileStep } from "./onboarding/ProfileStep";
import { ProductsStep } from "./onboarding/ProductsStep";
import { StockAlertsStep } from "./onboarding/StockAlertsStep";
import { OpenRegisterStep } from "./onboarding/OpenRegisterStep";
import { DoneStep } from "./onboarding/DoneStep";
import { EMPTY_QUICK_ADD_FORM, type QuickAddForm } from "./onboarding/QuickAddProductModal";

const UNCATEGORIZED = "Uncategorized";

export function OnboardingScreen() {
  const { user, store, updateProfile, updateStore, completeOnboarding } = useAuth();
  const { products, categories, sales, addProduct, addCategory } = useStoreData();

  const [step, setStep] = useState<OnboardingStep>("welcome");

  // Profile step
  const [name, setName] = useState(user?.name ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [address, setAddress] = useState(user?.address ?? "");
  const [storeName, setStoreName] = useState(store?.name ?? "");
  const [storeAddress, setStoreAddress] = useState(store?.address ?? "");
  const [sameAsProfile, setSameAsProfile] = useState(false);
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
      const profileResult = await updateProfile({
        name: name.trim(),
        phone: phone.trim() || null,
        address: address.trim() || null,
      });
      if (!profileResult.ok) {
        setProfileError(profileResult.error);
        return;
      }
      const effectiveAddress = sameAsProfile ? address : storeAddress;
      const storeResult = await updateStore({
        name: storeName.trim(),
        address: effectiveAddress.trim() || null,
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

  if (step === "welcome") {
    return (
      <ScreenContainer>
        <WelcomeStep onStartSetup={() => setStep("profile")} onSkipToRegister={() => setStep("openRegister")} />
      </ScreenContainer>
    );
  }

  if (step === "done") {
    return (
      <ScreenContainer>
        <DoneStep
          ownerName={name || user?.name || ""}
          storeName={storeName}
          openTime={openTime}
          closeTime={closeTime}
          productsAdded={products.length}
          thresholdDays={thresholdDays}
          startingFloat={startingFloat}
          finishing={finishing}
          finishError={finishError}
          onFinish={handleFinish}
        />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      {step === "profile" && (
        <ProfileStep
          name={name}
          onNameChange={setName}
          phone={phone}
          onPhoneChange={setPhone}
          storeName={storeName}
          onStoreNameChange={setStoreName}
          storeAddress={storeAddress}
          onStoreAddressChange={setStoreAddress}
          sameAsProfile={sameAsProfile}
          onSameAsProfileChange={setSameAsProfile}
          address={address}
          onAddressChange={setAddress}
          openTime={openTime}
          onOpenTimeChange={setOpenTime}
          closeTime={closeTime}
          onCloseTimeChange={setCloseTime}
          error={profileError}
          saving={savingProfile}
          onContinue={handleProfileContinue}
          onSkip={() => setStep("products")}
          onBack={() => setStep("welcome")}
        />
      )}

      {step === "products" && (
        <ProductsStep
          products={products}
          enabledCategoryKeys={enabledCategoryKeys}
          onToggleCategory={(key) =>
            setEnabledCategoryKeys((prev) => {
              const next = new Set(prev);
              if (next.has(key)) next.delete(key);
              else next.add(key);
              return next;
            })
          }
          starterItemsToAddCount={starterItemsToAdd.length}
          importingStarter={importingStarter}
          starterError={starterError}
          onImportStarterCatalog={handleImportStarterCatalog}
          onScannedBarcode={handleScannedBarcode}
          quickAddForm={quickAddForm}
          onQuickAddFormChange={setQuickAddForm}
          quickAddError={quickAddError}
          savingQuickAdd={savingQuickAdd}
          onQuickAddSubmit={handleQuickAddSubmit}
          showQuickAdd={showQuickAdd}
          onShowQuickAddChange={setShowQuickAdd}
          onContinue={() => setStep("stockAlerts")}
          onSkip={() => setStep("stockAlerts")}
          onBack={() => setStep("profile")}
        />
      )}

      {step === "stockAlerts" && (
        <StockAlertsStep
          thresholdDays={thresholdDays}
          onThresholdDaysChange={setThresholdDays}
          fastMoverBoost={fastMoverBoost}
          onFastMoverBoostChange={setFastMoverBoost}
          dailySummary={dailySummary}
          onDailySummaryChange={setDailySummary}
          preview={stockAlertPreview}
          onContinue={() => setStep("openRegister")}
          onSkip={() => setStep("openRegister")}
          onBack={() => setStep("products")}
        />
      )}

      {step === "openRegister" && (
        <OpenRegisterStep
          denominationCounts={denominationCounts}
          onDenominationCountChange={(key, quantity) =>
            setDenominationCounts((prev) => ({ ...prev, [key]: quantity }))
          }
          averageSaleValue={averageSaleValue}
          assignedStaffName={user?.name ?? ""}
          onOpenRegister={() => setStep("done")}
          onSkipCount={() => setStep("done")}
          onBack={() => setStep("stockAlerts")}
        />
      )}
    </ScreenContainer>
  );
}
