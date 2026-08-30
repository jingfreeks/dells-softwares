import {
  WelcomeStep,
  ProfileStep,
  ProductsStep,
  StockAlertsStep,
  OpenRegisterStep,
  CongratsStep,
  OnboardingShell,
} from "./component";
import { useOnboardingWizard } from "./hooks";

export function Onboarding() {
  const {
    step,
    goToExploreDemo,
    goToProfileStep,
    goToStockAlertsStep,
    goToOpenRegisterStep,
    goToCongratsStep,

    name,
    setName,
    phone,
    setPhone,
    displayedAvatar,
    avatarError,
    processingAvatar,
    onAvatarSelect,

    storeName,
    setStoreName,
    displayedStoreAddress,
    setStoreAddress,
    sameAsProfile,
    setSameAsProfile,
    displayedStorePhoto,
    storePhotoError,
    processingStorePhoto,
    onStorePhotoSelect,

    openTime,
    setOpenTime,
    closeTime,
    setCloseTime,

    profileError,
    savingProfile,
    onProfileContinue,
    onProfileSkip,

    finishing,
    finishError,
    onFinish,
    trialStarted,
  } = useOnboardingWizard();

  if (step === "welcome") {
    return <WelcomeStep onExploreDemo={goToExploreDemo} onSetUpStore={goToProfileStep} />;
  }

  if (step === "congrats") {
    return (
      <CongratsStep
        finishError={finishError}
        finishing={finishing}
        onFinish={onFinish}
        trialStarted={trialStarted}
      />
    );
  }

  return (
    <OnboardingShell step={step}>
      <div className="flex min-h-full flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-2xl">
          {step === "profile" && (
            <ProfileStep
              displayedAvatar={displayedAvatar}
              avatarError={avatarError}
              processingAvatar={processingAvatar}
              onAvatarSelect={onAvatarSelect}
              name={name}
              onNameChange={setName}
              phone={phone}
              onPhoneChange={setPhone}
              displayedStorePhoto={displayedStorePhoto}
              storePhotoError={storePhotoError}
              processingStorePhoto={processingStorePhoto}
              onStorePhotoSelect={onStorePhotoSelect}
              storeName={storeName}
              onStoreNameChange={setStoreName}
              displayedStoreAddress={displayedStoreAddress}
              onStoreAddressChange={setStoreAddress}
              sameAsProfile={sameAsProfile}
              onSameAsProfileChange={setSameAsProfile}
              openTime={openTime}
              onOpenTimeChange={setOpenTime}
              closeTime={closeTime}
              onCloseTimeChange={setCloseTime}
              profileError={profileError}
              savingProfile={savingProfile}
              onContinue={onProfileContinue}
              onSkip={onProfileSkip}
            />
          )}

          {step === "products" && (
            <ProductsStep onContinue={goToStockAlertsStep} onSkip={goToStockAlertsStep} />
          )}

          {step === "stockAlerts" && (
            <StockAlertsStep onContinue={goToOpenRegisterStep} onUseDefault={goToOpenRegisterStep} />
          )}

          {step === "openRegister" && (
            <OpenRegisterStep onOpenRegister={goToCongratsStep} onSkipCount={goToCongratsStep} />
          )}
        </div>
      </div>
    </OnboardingShell>
  );
}
