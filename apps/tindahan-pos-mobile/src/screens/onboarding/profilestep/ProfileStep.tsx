import { Text, View } from "react-native";
import { PrimaryButton } from "../../../components/PrimaryButton";
import { OnboardingStepHeader } from "../OnboardingStepHeader";
import { HoursCard, PersonalCard, StoreCard } from "./component";
import type { ProfileStepProps } from "./types";

/** Onboarding step 1 — store profile (mobile-onboarding-profile.html). */
export function ProfileStep(props: ProfileStepProps) {
  const { error, saving, onContinue, onSkip, onBack } = props;

  return (
    <View>
      <OnboardingStepHeader step="profile" stepNumber={1} totalSteps={4} title="Store profile" onBack={onBack} onSkip={onSkip} />
      <Text className="text-xl font-medium text-text-strong mb-1">Tell us about you and your shop</Text>
      <Text className="text-[13px] text-text-dim mb-4">Appears on receipts and the dashboard. Change it later in Settings.</Text>

      <PersonalCard
        name={props.name}
        onNameChange={props.onNameChange}
        phone={props.phone}
        onPhoneChange={props.onPhoneChange}
        avatarUri={props.avatarUri}
        avatarUploading={props.avatarUploading}
        avatarError={props.avatarError}
        onPickAvatar={props.onPickAvatar}
      />

      <StoreCard
        storeName={props.storeName}
        onStoreNameChange={props.onStoreNameChange}
        storeAddress={props.storeAddress}
        onStoreAddressChange={props.onStoreAddressChange}
        sameAsProfile={props.sameAsProfile}
        onSameAsProfileChange={props.onSameAsProfileChange}
        address={props.address}
        onAddressChange={props.onAddressChange}
        storePhotoUri={props.storePhotoUri}
        storePhotoUploading={props.storePhotoUploading}
        storePhotoError={props.storePhotoError}
        onPickStorePhoto={props.onPickStorePhoto}
      />

      <HoursCard
        openTime={props.openTime}
        onOpenTimeChange={props.onOpenTimeChange}
        closeTime={props.closeTime}
        onCloseTimeChange={props.onCloseTimeChange}
      />

      {error && (
        <Text accessibilityRole="alert" className="text-error text-[13px] mb-2.5">
          {error}
        </Text>
      )}

      <PrimaryButton label="Continue" onPress={onContinue} loading={saving} />
      <Text className="text-center mt-2.5 text-[11.5px] text-text-faint">Saved automatically</Text>
    </View>
  );
}
