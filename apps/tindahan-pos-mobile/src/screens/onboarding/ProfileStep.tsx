import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { Card } from "../../components/Card";
import { Checkbox } from "../../components/Checkbox";
import { PrimaryButton } from "../../components/PrimaryButton";
import { TextField } from "../../components/TextField";
import { OnboardingStepHeader } from "./OnboardingStepHeader";
import { colors, radii } from "../../theme/colors";

interface ProfileStepProps {
  name: string;
  onNameChange: (value: string) => void;
  phone: string;
  onPhoneChange: (value: string) => void;
  avatarUri: string | null;
  avatarUploading: boolean;
  avatarError: string | null;
  onPickAvatar: () => void;
  storeName: string;
  onStoreNameChange: (value: string) => void;
  storeAddress: string;
  onStoreAddressChange: (value: string) => void;
  sameAsProfile: boolean;
  onSameAsProfileChange: (value: boolean) => void;
  address: string;
  onAddressChange: (value: string) => void;
  storePhotoUri: string | null;
  storePhotoUploading: boolean;
  storePhotoError: string | null;
  onPickStorePhoto: () => void;
  openTime: string;
  onOpenTimeChange: (value: string) => void;
  closeTime: string;
  onCloseTimeChange: (value: string) => void;
  error: string | null;
  saving: boolean;
  onContinue: () => void;
  onSkip: () => void;
  onBack: () => void;
}

/** Onboarding step 1 — store profile (mobile-onboarding-profile.html). */
export function ProfileStep({
  name,
  onNameChange,
  phone,
  onPhoneChange,
  avatarUri,
  avatarUploading,
  avatarError,
  onPickAvatar,
  storeName,
  onStoreNameChange,
  storeAddress,
  onStoreAddressChange,
  sameAsProfile,
  onSameAsProfileChange,
  address,
  onAddressChange,
  storePhotoUri,
  storePhotoUploading,
  storePhotoError,
  onPickStorePhoto,
  openTime,
  onOpenTimeChange,
  closeTime,
  onCloseTimeChange,
  error,
  saving,
  onContinue,
  onSkip,
  onBack,
}: ProfileStepProps) {
  return (
    <View>
      <OnboardingStepHeader step="profile" stepNumber={1} totalSteps={4} title="Store profile" onBack={onBack} onSkip={onSkip} />
      <Text style={styles.h1}>Tell us about you and your shop</Text>
      <Text style={styles.sub}>Appears on receipts and the dashboard. Change it later in Settings.</Text>

      <Card padding={15} style={styles.card}>
        <View style={styles.photoRow}>
          <Pressable accessibilityRole="button" onPress={onPickAvatar} disabled={avatarUploading} style={styles.avatarCircle}>
            {avatarUploading ? (
              <ActivityIndicator color={colors.textPrimary} />
            ) : avatarUri ? (
              <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
            ) : (
              <Feather name="user" size={20} color={colors.textFaint} />
            )}
          </Pressable>
          <View style={{ flex: 1 }}>
            <Pressable accessibilityRole="button" onPress={onPickAvatar} disabled={avatarUploading} style={styles.photoButton}>
              <Text style={styles.photoButtonText}>Add your photo</Text>
            </Pressable>
            <Text style={styles.photoCaption}>Optional · shown to staff</Text>
          </View>
        </View>
        {avatarError && (
          <Text accessibilityRole="alert" style={styles.photoError}>
            {avatarError}
          </Text>
        )}
        <TextField accessibilityLabel="Your name" label="Your name" value={name} onChangeText={onNameChange} />
        <TextField
          accessibilityLabel="Mobile number"
          label="Mobile number"
          value={phone}
          onChangeText={onPhoneChange}
          keyboardType="phone-pad"
        />
      </Card>

      <Card padding={15} style={styles.card}>
        <View style={styles.photoRow}>
          <Pressable accessibilityRole="button" onPress={onPickStorePhoto} disabled={storePhotoUploading} style={styles.avatarSquare}>
            {storePhotoUploading ? (
              <ActivityIndicator color={colors.textPrimary} />
            ) : storePhotoUri ? (
              <Image source={{ uri: storePhotoUri }} style={styles.avatarImage} />
            ) : (
              <Text style={styles.avatarSquareLetter}>{(storeName || "D")[0].toUpperCase()}</Text>
            )}
          </Pressable>
          <View style={{ flex: 1 }}>
            <Pressable accessibilityRole="button" onPress={onPickStorePhoto} disabled={storePhotoUploading} style={styles.photoButton}>
              <Text style={styles.photoButtonText}>Add store logo</Text>
            </Pressable>
            <Text style={styles.photoCaption}>Optional · printed on receipts</Text>
          </View>
        </View>
        {storePhotoError && (
          <Text accessibilityRole="alert" style={styles.photoError}>
            {storePhotoError}
          </Text>
        )}
        <TextField accessibilityLabel="Store name" label="Store name" value={storeName} onChangeText={onStoreNameChange} />
        <Checkbox checked={sameAsProfile} onToggle={() => onSameAsProfileChange(!sameAsProfile)} label="Address same as mine" />
        <View style={styles.addressSpacing}>
          {sameAsProfile ? (
            <TextField accessibilityLabel="Your address" label="Address" value={address} onChangeText={onAddressChange} />
          ) : (
            <TextField
              accessibilityLabel="Store address"
              label="Store address"
              value={storeAddress}
              onChangeText={onStoreAddressChange}
            />
          )}
        </View>
      </Card>

      <Card padding={14} style={styles.card}>
        <Text style={styles.hoursHeading}>When are you usually open?</Text>
        <Text style={styles.hoursSub}>Used to work out how fast things sell, so stock alerts are accurate.</Text>
        <View style={styles.hoursRow}>
          <View style={styles.hoursField}>
            <TextField accessibilityLabel="Opening time" value={openTime} onChangeText={onOpenTimeChange} placeholder="06:00" />
          </View>
          <Text style={styles.hoursTo}>to</Text>
          <View style={styles.hoursField}>
            <TextField accessibilityLabel="Closing time" value={closeTime} onChangeText={onCloseTimeChange} placeholder="21:00" />
          </View>
        </View>
      </Card>

      {error && (
        <Text accessibilityRole="alert" style={styles.error}>
          {error}
        </Text>
      )}

      <PrimaryButton label="Continue" onPress={onContinue} loading={saving} />
      <Text style={styles.note}>Saved automatically</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  h1: { fontSize: 20, fontWeight: "500", color: colors.textStrong, marginBottom: 4 },
  sub: { fontSize: 13, color: colors.textDim, marginBottom: 16 },
  card: { marginBottom: 12 },
  photoRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 13 },
  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.panelStrong,
    borderWidth: 1,
    borderColor: colors.hairline,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarSquare: {
    width: 48,
    height: 48,
    borderRadius: radii.iconSquare,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarSquareLetter: { fontSize: 18, fontWeight: "600", color: colors.textPrimary },
  avatarImage: { width: "100%", height: "100%" },
  photoButton: {
    alignSelf: "flex-start",
    height: 34,
    paddingHorizontal: 12,
    borderRadius: radii.control,
    borderWidth: 1,
    borderColor: colors.hairline,
    backgroundColor: colors.panelStrong,
    alignItems: "center",
    justifyContent: "center",
  },
  photoButtonText: { fontSize: 12.5, color: colors.textDim, fontWeight: "500" },
  photoCaption: { fontSize: 11, color: colors.textFaint, marginTop: 6 },
  photoError: { color: colors.error, fontSize: 12, marginBottom: 10 },
  addressSpacing: { marginTop: 4 },
  hoursHeading: { fontSize: 13.5, fontWeight: "500", color: colors.textPrimary, marginBottom: 3 },
  hoursSub: { fontSize: 11.5, color: colors.textFaint, marginBottom: 11 },
  hoursRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  hoursField: { flex: 1 },
  hoursTo: { fontSize: 12, color: colors.textFaint },
  error: { color: colors.error, fontSize: 13, marginBottom: 10 },
  note: { textAlign: "center", marginTop: 10, fontSize: 11.5, color: colors.textFaint },
});
