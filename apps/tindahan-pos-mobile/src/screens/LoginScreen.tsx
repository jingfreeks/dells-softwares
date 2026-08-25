import { useState } from "react";
import { KeyboardAvoidingView, Platform, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useAuth } from "../lib/auth";
import { Checkbox } from "../components/Checkbox";
import { PrimaryButton } from "../components/PrimaryButton";
import { TextField } from "../components/TextField";
import { colors, radii } from "../theme/colors";

export function LoginScreen() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [keepSignedIn, setKeepSignedIn] = useState(true);
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

          <TextField
            accessibilityLabel="Email"
            placeholder="Email"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            textContentType="username"
            value={email}
            onChangeText={setEmail}
          />
          <TextField
            accessibilityLabel="Password"
            placeholder="Password"
            secureTextEntry
            textContentType="password"
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
  error: { color: colors.error, fontSize: 13, marginBottom: 12 },
  checkboxRow: { marginBottom: 20 },
});
