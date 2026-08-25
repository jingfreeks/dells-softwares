import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { AppLogo } from "../components/AppLogo";
import { Checkbox } from "../components/Checkbox";
import { Divider } from "../components/Divider";
import { InfoCallout } from "../components/InfoCallout";
import { LinkText } from "../components/LinkText";
import { PasswordInput } from "../components/PasswordInput";
import { PrimaryButton } from "../components/PrimaryButton";
import { ScreenContainer } from "../components/ScreenContainer";
import { SecondaryButton } from "../components/SecondaryButton";
import { SegmentedControl } from "../components/SegmentedControl";
import { TextField } from "../components/TextField";
import { useAuth } from "../lib/auth";
import { isValidEmail } from "../lib/validation";
import { colors } from "../theme/colors";

const SEGMENTS = ["Sign in", "Create account"] as const;

interface LoginScreenProps {
  /** Proposed per MOBILE_UI_DESIGN_SPECIFICATION.md §5 M-002 -- not wired to real routing yet (Phase 3). */
  onSwitchToCreateAccount?: () => void;
}

export function LoginScreen({ onSwitchToCreateAccount }: LoginScreenProps) {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [keepSignedIn, setKeepSignedIn] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailTouched, setEmailTouched] = useState(false);

  const emailError = emailTouched && email.length > 0 && !isValidEmail(email) ? "Enter a valid email address." : undefined;

  async function handleSubmit() {
    if (!email.trim() || !password) return;
    setEmailTouched(true);
    if (!isValidEmail(email)) return;
    setSubmitting(true);
    setError(null);
    const result = await login(email, password, keepSignedIn);
    if (!result.ok) setError(result.error);
    setSubmitting(false);
  }

  function handleSegmentChange(segment: string) {
    if (segment === "Create account") onSwitchToCreateAccount?.();
  }

  const canSubmit = !submitting && isValidEmail(email) && !!password;

  return (
    <ScreenContainer>
      <View style={styles.center}>
        <AppLogo size={40} />
      </View>

      <SegmentedControl options={SEGMENTS} value="Sign in" onChange={handleSegmentChange} />

      <Text style={styles.heading}>Welcome back</Text>
      <Text style={styles.subtitle}>Sign in to open the register and see today's sales.</Text>

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
        onBlur={() => setEmailTouched(true)}
        error={emailError}
      />

      <View style={styles.passwordLabelRow}>
        <Text style={styles.fieldLabel}>Password</Text>
        <LinkText style={styles.forgotLink}>Forgot?</LinkText>
      </View>
      <PasswordInput
        accessibilityLabel="Password"
        placeholder="••••••••••"
        value={password}
        onChangeText={setPassword}
      />

      {error && (
        <Text accessibilityRole="alert" style={styles.error}>
          {error}
        </Text>
      )}

      <View style={styles.checkboxRow}>
        <Checkbox
          checked={keepSignedIn}
          onToggle={() => setKeepSignedIn((v) => !v)}
          label="Keep me signed in on this device"
        />
      </View>

      <PrimaryButton label="Sign in" onPress={handleSubmit} disabled={!canSubmit} loading={submitting} />

      <Text style={styles.footer}>
        New here? <LinkText onPress={onSwitchToCreateAccount}>Create an account</LinkText>
      </Text>
      <Text style={styles.microCaption}>Protected by reCAPTCHA · Contact support</Text>

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

const styles = StyleSheet.create({
  center: { alignItems: "center", marginBottom: 18 },
  heading: { fontSize: 21, fontWeight: "500", color: colors.textPrimary, textAlign: "center" },
  subtitle: { fontSize: 13, color: colors.textFaint, textAlign: "center", marginTop: 4, marginBottom: 20 },
  passwordLabelRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  fieldLabel: { fontSize: 13, fontWeight: "500", color: colors.textDim },
  forgotLink: { fontSize: 12.5 },
  error: { color: colors.error, fontSize: 13, marginTop: 4, marginBottom: 4 },
  checkboxRow: { marginTop: 12, marginBottom: 20 },
  footer: { fontSize: 13, color: colors.textFaint, textAlign: "center", marginTop: 18 },
  microCaption: { fontSize: 11, color: colors.textFaintest, textAlign: "center", marginTop: 8 },
});
