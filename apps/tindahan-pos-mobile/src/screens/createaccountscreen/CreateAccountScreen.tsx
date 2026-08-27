import { Text, View } from "react-native";
import { AppLogo } from "../../components/applogo";
import { Checkbox } from "../../components/Checkbox";
import { Divider } from "../../components/divider";
import { LinkText } from "../../components/linktext";
import { PasswordInput } from "../../components/passwordinput";
import { PasswordStrengthMeter } from "../../components/PasswordStrengthMeter";
import { PrimaryButton } from "../../components/primarybutton";
import { ScreenContainer } from "../../components/screencontainer";
import { SecondaryButton } from "../../components/SecondaryButton";
import { SegmentedControl } from "../../components/SegmentedControl";
import { TextField } from "../../components/textfield";
import { SEGMENTS, useCreateAccountScreen } from "./hooks";
import type { CreateAccountScreenProps } from "./types";

/**
 * M-003 -- Create Account (MOBILE_UI_DESIGN_SPECIFICATION.md §5). Real
 * client-side validation plus a real register() call (Phase 4) --
 * mirrors the web app's signUp() flow, so the same handle_new_user() DB
 * trigger provisions a store + admin staff row either way. If the
 * project requires email confirmation, there's no session yet, so this
 * screen shows a "check your email" state rather than navigating
 * anywhere invented; if a session comes back immediately,
 * AuthProvider's own onAuthStateChange listener picks it up and the
 * app navigates away from this screen on its own -- no manual
 * navigation call needed here. The password-strength value shown is
 * still example data, not a computed score (scoring rules remain TBD
 * -- Backend/Business Logic Phase, §18).
 */
export function CreateAccountScreen(props: CreateAccountScreenProps) {
  const {
    storeName,
    setStoreName,
    ownerName,
    setOwnerName,
    email,
    setEmail,
    password,
    setPassword,
    agreed,
    toggleAgreed,
    markTouched,
    handleSegmentChange,
    storeNameError,
    ownerNameError,
    emailValid,
    emailError,
    passwordError,
    canSubmit,
    submitting,
    submitError,
    needsEmailConfirmation,
    setNeedsEmailConfirmation,
    handleSubmit,
  } = useCreateAccountScreen(props);

  if (needsEmailConfirmation) {
    return (
      <ScreenContainer>
        <View className="items-center mb-4.5">
          <AppLogo size={40} />
        </View>
        <Text className="text-[21px] font-medium text-text-primary text-center">Check your email</Text>
        <Text className="text-[13px] text-text-faint text-center mt-1 mb-5">
          We sent a confirmation link to {email.trim()}. Open it to finish setting up {storeName.trim()}.
        </Text>
        <Text className="text-[13px] text-text-faint text-center mt-4.5">
          Wrong email? <LinkText onPress={() => setNeedsEmailConfirmation(false)}>Go back</LinkText>
        </Text>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <View className="items-center mb-4.5">
        <AppLogo size={40} />
      </View>

      <SegmentedControl options={SEGMENTS} value="Create account" onChange={handleSegmentChange} />

      <Text className="text-[21px] font-medium text-text-primary text-center">Create your store</Text>
      <Text className="text-[13px] text-text-faint text-center mt-1 mb-5">Takes about a minute. No card needed.</Text>

      <SecondaryButton label="Sign up with Google" onPress={() => {}} />
      <Divider label="OR" />

      <TextField
        accessibilityLabel="Store name"
        label="Store name"
        placeholder="Your store's name"
        value={storeName}
        onChangeText={setStoreName}
        onBlur={() => markTouched("storeName")}
        error={storeNameError}
      />
      <TextField
        accessibilityLabel="Your name"
        label="Your name"
        placeholder="Juan Dela Cruz"
        value={ownerName}
        onChangeText={setOwnerName}
        onBlur={() => markTouched("ownerName")}
        error={ownerNameError}
      />
      <TextField
        accessibilityLabel="Email"
        label="Email"
        placeholder="you@store.com"
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        textContentType="username"
        value={email}
        onChangeText={setEmail}
        onBlur={() => markTouched("email")}
        error={emailError}
        success={!emailError && emailValid}
        hint={emailError ? undefined : "We'll send your receipt template here."}
      />
      <PasswordInput
        accessibilityLabel="Password"
        label="Password"
        placeholder="Create a password"
        value={password}
        onChangeText={setPassword}
        onBlur={() => markTouched("password")}
      />
      {passwordError ? (
        <Text className="text-[11.5px] text-error mb-4">{passwordError}</Text>
      ) : (
        <PasswordStrengthMeter strength={3} hint="add a symbol to max it out" />
      )}

      <Checkbox checked={agreed} onToggle={toggleAgreed}>
        <Text className="text-[13px] text-text-muted leading-[18px]">
          I agree to the <LinkText>Terms of Service</LinkText> and <LinkText>Privacy Policy</LinkText>.
        </Text>
      </Checkbox>

      {submitError && (
        <Text accessibilityRole="alert" className="text-[13px] text-error mt-1 mb-1">
          {submitError}
        </Text>
      )}

      <View className="mt-1">
        <PrimaryButton label="Create account" onPress={handleSubmit} disabled={!canSubmit} loading={submitting} />
      </View>

      <Text className="text-[13px] text-text-faint text-center mt-4.5">
        Already have a store? <LinkText onPress={props.onSwitchToSignIn}>Sign in</LinkText>
      </Text>
    </ScreenContainer>
  );
}
