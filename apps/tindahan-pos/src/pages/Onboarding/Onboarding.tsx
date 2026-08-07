import {
  StepDots,
  WelcomeStep,
  ProfileStep,
  StoreStep,
  ProductsStep,
  CongratsStep,
  OnboardingShell,
} from "./component";
import { useOnboardingWizard } from "./hooks";

export function Onboarding() {
  const {
    step,
    goToProfileStep,
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
    onAvatarSelect,
    profileError,
    savingProfile,
    onProfileNext,

    storeName,
    setStoreName,
    setStoreAddress,
    displayedStoreAddress,
    sameAsProfile,
    setSameAsProfile,
    displayedStorePhoto,
    storePhotoError,
    processingStorePhoto,
    onStorePhotoSelect,
    storeError,
    savingStore,
    onStoreFinish,

    finishing,
    finishError,
    onGoToDashboard,
  } = useOnboardingWizard();

  return (
    <OnboardingShell step={step}>
      <div className="flex min-h-full flex-1 items-center justify-center px-4 py-10">
        {step === "products" ? (
          <div className="w-full max-w-2xl">
            <ProductsStep onContinue={goToCongratsStep} onSkip={goToCongratsStep} />
          </div>
        ) : (
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
            <StepDots current={step} />

            {step === "welcome" && <WelcomeStep onNext={goToProfileStep} />}

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
                address={address}
                onAddressChange={setAddress}
                profileError={profileError}
                savingProfile={savingProfile}
                onNext={onProfileNext}
              />
            )}

            {step === "store" && (
              <StoreStep
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
                storeError={storeError}
                savingStore={savingStore}
                onBack={goToProfileStep}
                onFinish={onStoreFinish}
              />
            )}

            {step === "congrats" && (
              <CongratsStep
                name={name}
                storeName={storeName}
                finishError={finishError}
                finishing={finishing}
                onGoToDashboard={onGoToDashboard}
              />
            )}
          </div>
        )}
      </div>
    </OnboardingShell>
  );
}
