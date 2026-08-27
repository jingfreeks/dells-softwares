import { Text, View } from "react-native";
import { AppLogo } from "../../components/applogo";
import { Checkbox } from "../../components/Checkbox";
import { Divider } from "../../components/divider";
import { InfoCallout } from "../../components/InfoCallout";
import { LinkText } from "../../components/linktext";
import { PasswordInput } from "../../components/passwordinput";
import { PrimaryButton } from "../../components/primarybutton";
import { ScreenContainer } from "../../components/screencontainer";
import { SecondaryButton } from "../../components/SecondaryButton";
import { SegmentedControl } from "../../components/SegmentedControl";
import { TextField } from "../../components/textfield";
import { SEGMENTS, useLoginScreen } from "./hooks";
import type { LoginScreenProps } from "./types";

/** "Sign in" / "Create account" auth entry screen (mobile-login.html). */
export function LoginScreen(props: LoginScreenProps) {
  const { onSwitchToCreateAccount, onSetupDevice } = props;
  const {
    email,
    setEmail,
    password,
    setPassword,
    keepSignedIn,
    toggleKeepSignedIn,
    submitting,
    error,
    emailError,
    markEmailTouched,
    handleSubmit,
    handleSegmentChange,
    canSubmit,
  } = useLoginScreen(props);

  return (
    <ScreenContainer>
      <View className="items-center mb-4.5">
        <AppLogo size={40} />
      </View>

      <SegmentedControl options={SEGMENTS} value="Sign in" onChange={handleSegmentChange} />

      <Text className="text-[21px] font-medium text-text-primary text-center">Welcome back</Text>
      <Text className="text-[13px] text-text-faint text-center mt-1 mb-5">
        Sign in to open the register and see today&apos;s sales.
      </Text>

      <SecondaryButton label="Continue with Google" onPress={() => {}} />
      <Divider label="OR" />

      <TextField
        accessibilityLabel="Email"
        label="Email"
        placeholder="you@store.com"
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        textContentType="username"
        value={email}
        onChangeText={setEmail}
        onBlur={markEmailTouched}
        error={emailError}
      />

      <View className="flex-row justify-between items-center mb-1.5">
        <Text className="text-[13px] font-medium text-text-dim">Password</Text>
        <LinkText style={{ fontSize: 12.5 }}>Forgot?</LinkText>
      </View>
      <PasswordInput
        accessibilityLabel="Password"
        placeholder="••••••••••"
        value={password}
        onChangeText={setPassword}
      />

      {error && (
        <Text accessibilityRole="alert" className="text-[13px] text-error mt-1 mb-1">
          {error}
        </Text>
      )}

      <View className="mt-3 mb-5">
        <Checkbox checked={keepSignedIn} onToggle={toggleKeepSignedIn} label="Keep me signed in on this device" />
      </View>

      <PrimaryButton label="Sign in" onPress={handleSubmit} disabled={!canSubmit} loading={submitting} />

      <Text className="text-[13px] text-text-faint text-center mt-4.5">
        New here? <LinkText onPress={onSwitchToCreateAccount}>Create an account</LinkText>
      </Text>
      {onSetupDevice && (
        <Text className="text-[13px] text-text-faint text-center mt-4.5">
          On a shared counter device? <LinkText onPress={onSetupDevice}>Set it up as a register</LinkText>
        </Text>
      )}
      <Text className="text-[11px] text-text-faintest text-center mt-2">Protected by reCAPTCHA · Contact support</Text>

      <Divider />

      <InfoCallout
        icon="tablet"
        title="Set up this device as a register"
        description="For the tablet at the counter. Pair it once, then staff sign in with a PIN."
        onPress={() => {}}
      />
    </ScreenContainer>
  );
}
