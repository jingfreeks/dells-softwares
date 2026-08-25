import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { ScreenContainer } from "../components/ScreenContainer";
import { Card } from "../components/Card";
import { PrimaryButton } from "../components/PrimaryButton";
import { TextField } from "../components/TextField";
import { colors } from "../theme/colors";
import { useAuth } from "../lib/auth";

interface PairDeviceScreenProps {
  onBack: () => void;
}

/** "Set up this device as a register" -- the counter-device side of pairing (mobile-pair-device.html's own instructions). */
export function PairDeviceScreen({ onBack }: PairDeviceScreenProps) {
  const { pairDevice } = useAuth();
  const [code, setCode] = useState("");
  const [deviceName, setDeviceName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleCodeChange(value: string) {
    setCode(value.toUpperCase().slice(0, 6));
    setError(null);
  }

  async function handleSubmit() {
    if (code.trim().length !== 6 || !deviceName.trim()) {
      setError("Enter the 6-character code and a name for this device.");
      return;
    }
    setSubmitting(true);
    setError(null);
    const result = await pairDevice(code, deviceName);
    setSubmitting(false);
    if (!result.ok) {
      setError(result.error);
    }
    // On success, AuthProvider's own session listener picks up the new
    // signed-in device automatically -- Root() switches away from here.
  }

  return (
    <ScreenContainer>
      <View style={styles.headerRow}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={onBack} style={styles.backButton}>
          <Feather name="arrow-left" size={18} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.title}>Set up this device as a register</Text>
      </View>
      <Text style={styles.sub}>
        Ask the owner to open Settings on their phone and generate a pairing code, then type it here.
      </Text>

      <Card padding={16} style={styles.card}>
        <TextField
          accessibilityLabel="Pairing code"
          label="Pairing code"
          value={code}
          onChangeText={handleCodeChange}
          autoCapitalize="characters"
          maxLength={6}
          placeholder="T4K9XY"
        />
        <TextField
          accessibilityLabel="Device name"
          label="Name this device"
          value={deviceName}
          onChangeText={setDeviceName}
          placeholder="Counter tablet"
        />
      </Card>

      {error && (
        <Text accessibilityRole="alert" style={styles.error}>
          {error}
        </Text>
      )}

      <PrimaryButton label="Pair this device" onPress={handleSubmit} loading={submitting} />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 8 },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.panelStrong,
    borderWidth: 1,
    borderColor: colors.hairline,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { flex: 1, fontSize: 16, fontWeight: "500", color: colors.textPrimary },
  sub: { fontSize: 13, color: colors.textDim, marginBottom: 16, lineHeight: 19 },
  card: { marginBottom: 16 },
  error: { color: colors.error, fontSize: 13, marginBottom: 10 },
});
