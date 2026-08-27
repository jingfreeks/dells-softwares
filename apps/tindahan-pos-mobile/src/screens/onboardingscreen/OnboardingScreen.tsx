import { ScreenContainer } from "../../components/ScreenContainer";
import { WelcomeStep } from "../onboarding";
import { ProfileStep } from "../onboarding/ProfileStep";
import { ProductsStep } from "../onboarding/ProductsStep";
import { StockAlertsStep } from "../onboarding/StockAlertsStep";
import { OpenRegisterStep } from "../onboarding/OpenRegisterStep";
import { DoneStep } from "../onboarding/DoneStep";
import { useOnboardingScreen } from "./hooks";

export function OnboardingScreen() {
  const {
    user,
    store,
    products,
    step,
    setStep,
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
  } = useOnboardingScreen();

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
          avatarUri={avatarImage?.uri ?? user?.avatarUrl ?? null}
          avatarUploading={avatarUploading}
          avatarError={avatarError}
          onPickAvatar={handlePickAvatar}
          storeName={storeName}
          onStoreNameChange={setStoreName}
          storeAddress={storeAddress}
          onStoreAddressChange={setStoreAddress}
          sameAsProfile={sameAsProfile}
          onSameAsProfileChange={setSameAsProfile}
          address={address}
          onAddressChange={setAddress}
          storePhotoUri={storePhotoImage?.uri ?? store?.photoUrl ?? null}
          storePhotoUploading={storePhotoUploading}
          storePhotoError={storePhotoError}
          onPickStorePhoto={handlePickStorePhoto}
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
          importingCsv={importingCsv}
          csvError={csvError}
          onImportCsv={handleImportCsv}
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
