import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useAuth } from "../lib/auth";
import { colors, minTouchTarget, radii } from "../theme/colors";

export function LoginScreen() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [keepSignedIn, setKeepSignedIn] = useState(true);
  const [focusedField, setFocusedField] = useState<"email" | "password" | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (!email.trim() || !password) return;
    setSubmitting(true);
    setError(null);
    const result = await login(email, password, keepSignedIn);
    if (!result.ok) setError(result.error);
    setSubmitting(false);
  }

  const canSubmit = !submitting && !!email.trim() && !!password;

  return (
    <LinearGradient
      colors={[colors.backgroundEnd, colors.backgroundStart]}
      style={styles.background}
    >
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.panel}>
          <Text style={styles.title}>Tindahan POS</Text>
          <Text style={styles.subtitle}>Sign in to start a shift</Text>

          <TextInput
            accessibilityLabel="Email"
            placeholder="Email"
            placeholderTextColor={colors.textMuted}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            textContentType="username"
            value={email}
            onChangeText={setEmail}
            onFocus={() => setFocusedField("email")}
            onBlur={() => setFocusedField(null)}
            style={[styles.input, focusedField === "email" && styles.inputFocused]}
          />
          <TextInput
            accessibilityLabel="Password"
            placeholder="Password"
            placeholderTextColor={colors.textMuted}
            secureTextEntry
            textContentType="password"
            value={password}
            onChangeText={setPassword}
            onFocus={() => setFocusedField("password")}
            onBlur={() => setFocusedField(null)}
            style={[styles.input, focusedField === "password" && styles.inputFocused]}
          />

          {error && (
            <Text accessibilityRole="alert" style={styles.error}>
              {error}
            </Text>
          )}

          <Pressable
            accessibilityRole="checkbox"
            accessibilityState={{ checked: keepSignedIn }}
            onPress={() => setKeepSignedIn((v) => !v)}
            style={styles.checkboxRow}
          >
            <View style={[styles.checkbox, keepSignedIn && styles.checkboxChecked]}>
              {keepSignedIn && <View style={styles.checkboxDot} />}
            </View>
            <Text style={styles.checkboxLabel}>Keep me signed in on this device</Text>
          </Pressable>

          <TouchableOpacity
            onPress={handleSubmit}
            disabled={!canSubmit}
            style={[styles.button, !canSubmit && styles.buttonDisabled]}
          >
            {submitting ? (
              <ActivityIndicator color={colors.textPrimary} />
            ) : (
              <Text style={styles.buttonText}>Sign in</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  background: { flex: 1 },
  container: { flex: 1, justifyContent: "center", padding: 24 },
  panel: {
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.hairline,
    borderRadius: radii.card,
    padding: 24,
  },
  title: { fontSize: 24, fontWeight: "500", color: colors.textPrimary, textAlign: "center" },
  subtitle: {
    fontSize: 13,
    fontWeight: "400",
    color: colors.textMuted,
    textAlign: "center",
    marginTop: 4,
    marginBottom: 28,
  },
  input: {
    minHeight: minTouchTarget,
    borderWidth: 1,
    borderColor: colors.hairline,
    borderRadius: radii.control,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    fontWeight: "400",
    color: colors.textPrimary,
    backgroundColor: colors.panelStrong,
    marginBottom: 12,
    // @ts-expect-error RN Web-only property; suppresses the browser's
    // default focus outline so our own focus border color is the only ring.
    outlineStyle: "none",
  },
  inputFocused: { borderColor: colors.accent },
  error: { color: colors.error, fontSize: 13, marginBottom: 12 },
  checkboxRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    minHeight: minTouchTarget,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: colors.hairline,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  checkboxChecked: { borderColor: colors.accent, backgroundColor: colors.accent },
  checkboxDot: { width: 8, height: 8, borderRadius: 2, backgroundColor: colors.textPrimary },
  checkboxLabel: { fontSize: 13, fontWeight: "400", color: colors.textMuted },
  button: {
    minHeight: minTouchTarget,
    backgroundColor: colors.accent,
    borderRadius: radii.control,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonDisabled: { opacity: 0.4 },
  buttonText: { color: colors.textPrimary, fontSize: 16, fontWeight: "500" },
});
