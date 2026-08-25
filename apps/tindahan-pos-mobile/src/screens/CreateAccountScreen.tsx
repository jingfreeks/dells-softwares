import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { AppLogo } from "../components/AppLogo";
import { Checkbox } from "../components/Checkbox";
import { Divider } from "../components/Divider";
import { LinkText } from "../components/LinkText";
import { PasswordInput } from "../components/PasswordInput";
import { PasswordStrengthMeter } from "../components/PasswordStrengthMeter";
import { PrimaryButton } from "../components/PrimaryButton";
import { ScreenContainer } from "../components/ScreenContainer";
import { SecondaryButton } from "../components/SecondaryButton";
import { SegmentedControl } from "../components/SegmentedControl";
import { TextField } from "../components/TextField";
import { isValidEmail, isValidPassword, MIN_PASSWORD_LENGTH } from "../lib/validation";
import { colors } from "../theme/colors";

const SEGMENTS = ["Sign in", "Create account"] as const;

interface CreateAccountScreenProps {
  /** Navigating to Sign In is Proposed (§5 M-003), not wired to real routing yet -- Phase 3. */
  onSwitchToSignIn?: () => void;
}

/**
 * M-003 -- Create Account (MOBILE_UI_DESIGN_SPECIFICATION.md §5). Fields
 * hold local state and real client-side validation (Phase 3, §21: "form
 * validation... still without backend calls") -- there is still no
 * registration RPC to call (mobile's useAuth has no register(), unlike
 * the web app), so the submit button is validation-gated but otherwise
 * inert; wiring an actual account-creation call is Phase 4. The
 * password-strength value shown is example data, not a computed score
 * (scoring rules are TBD -- Backend/Business Logic Phase, §18).
 */
export function CreateAccountScreen({ onSwitchToSignIn }: CreateAccountScreenProps) {
  const [storeName, setStoreName] = useState("Dell's Sari-Sari Store");
  const [ownerName, setOwnerName] = useState("");
  const [email, setEmail] = useState("dell@tindahan.ph");
  const [password, setPassword] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [touched, setTouched] = useState({ storeName: false, ownerName: false, email: false, password: false });

  function markTouched(field: keyof typeof touched) {
    setTouched((prev) => ({ ...prev, [field]: true }));
  }

  function handleSegmentChange(segment: string) {
    if (segment === "Sign in") onSwitchToSignIn?.();
  }

  const storeNameError = touched.storeName && !storeName.trim() ? "Store name is required." : undefined;
  const ownerNameError = touched.ownerName && !ownerName.trim() ? "Your name is required." : undefined;
  const emailValid = isValidEmail(email);
  const emailError = touched.email && email.length > 0 && !emailValid ? "Enter a valid email address." : undefined;
  const passwordValid = isValidPassword(password);
  const passwordError =
    touched.password && password.length > 0 && !passwordValid
      ? `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`
      : undefined;

  const canSubmit =
    !!storeName.trim() && !!ownerName.trim() && emailValid && passwordValid && agreed;

  return (
    <ScreenContainer>
      <View style={styles.center}>
        <AppLogo size={40} />
      </View>

      <SegmentedControl options={SEGMENTS} value="Create account" onChange={handleSegmentChange} />

      <Text style={styles.heading}>Create your store</Text>
      <Text style={styles.subtitle}>Takes about a minute. No card needed.</Text>

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
        <Text style={styles.passwordError}>{passwordError}</Text>
      ) : (
        <PasswordStrengthMeter strength={3} hint="add a symbol to max it out" />
      )}

      <Checkbox checked={agreed} onToggle={() => setAgreed((v) => !v)}>
        <Text style={styles.termsText}>
          I agree to the <LinkText>Terms of Service</LinkText> and <LinkText>Privacy Policy</LinkText>.
        </Text>
      </Checkbox>

      <View style={styles.mt20}>
        <PrimaryButton label="Create account" onPress={() => {}} disabled={!canSubmit} />
      </View>

      <Text style={styles.footer}>
        Already have a store?{" "}
        <LinkText onPress={onSwitchToSignIn}>Sign in</LinkText>
      </Text>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: "center", marginBottom: 18 },
  heading: { fontSize: 21, fontWeight: "500", color: colors.textPrimary, textAlign: "center" },
  subtitle: { fontSize: 13, color: colors.textFaint, textAlign: "center", marginTop: 4, marginBottom: 20 },
  termsText: { fontSize: 13, color: colors.textMuted, lineHeight: 18 },
  passwordError: { fontSize: 11.5, color: colors.error, marginBottom: 16 },
  mt20: { marginTop: 4 },
  footer: { fontSize: 13, color: colors.textFaint, textAlign: "center", marginTop: 18 },
});
