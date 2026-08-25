import { useCallback, useEffect, useRef, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { ScreenContainer } from "../components/ScreenContainer";
import { Card } from "../components/Card";
import { PrimaryButton } from "../components/PrimaryButton";
import { TextField } from "../components/TextField";
import { colors, radii } from "../theme/colors";
import { supabase } from "../lib/supabaseClient";

interface SetupRegisterScreenProps {
  onBack: () => void;
}

interface DeviceRow {
  id: string;
  name: string;
  pairedAt: string;
  lastSeenAt: string | null;
}

function formatCountdown(msLeft: number): string {
  if (msLeft <= 0) return "Expired";
  const totalSeconds = Math.floor(msLeft / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

/** Owner-side "Set up a register" (mobile-pair-device.html) -- generate a code, list/unpair devices. */
export function SetupRegisterScreen({ onBack }: SetupRegisterScreenProps) {
  const [devices, setDevices] = useState<DeviceRow[]>([]);
  const [loadingDevices, setLoadingDevices] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [code, setCode] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [msLeft, setMsLeft] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);

  const [unpairTarget, setUnpairTarget] = useState<DeviceRow | null>(null);
  const [ownerPin, setOwnerPin] = useState("");
  const [unpairSubmitting, setUnpairSubmitting] = useState(false);
  const [unpairError, setUnpairError] = useState<string | null>(null);

  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchDevices = useCallback(async () => {
    setLoadingDevices(true);
    setLoadError(null);
    const [{ data: deviceRows, error: deviceError }] = await Promise.all([
      supabase.from("devices").select("id, name, paired_at, last_seen_at, unpaired_at"),
    ]);
    if (deviceError) {
      setLoadError(deviceError.message);
      setLoadingDevices(false);
      return;
    }
    setDevices(
      (deviceRows ?? [])
        .filter((row) => !row.unpaired_at)
        .map((row) => ({ id: row.id, name: row.name, pairedAt: row.paired_at, lastSeenAt: row.last_seen_at }))
    );
    setLoadingDevices(false);
  }, []);

  useEffect(() => {
    fetchDevices();
  }, [fetchDevices]);

  useEffect(() => {
    if (!expiresAt) {
      if (tickRef.current) clearInterval(tickRef.current);
      return;
    }
    function tick() {
      const left = new Date(expiresAt!).getTime() - Date.now();
      setMsLeft(left);
      if (left <= 0 && tickRef.current) {
        clearInterval(tickRef.current);
      }
    }
    tick();
    tickRef.current = setInterval(tick, 1000);
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, [expiresAt]);

  async function generateCode() {
    setGenerating(true);
    setGenerateError(null);
    const { data, error } = await supabase.rpc("generate_pairing_code");
    setGenerating(false);
    const row = data?.[0];
    if (error || !row) {
      setGenerateError(error?.message ?? "Could not generate a code.");
      return;
    }
    setCode(row.code);
    setExpiresAt(row.expires_at);
  }

  function openUnpairModal(device: DeviceRow) {
    setUnpairTarget(device);
    setOwnerPin("");
    setUnpairError(null);
  }

  async function submitUnpair() {
    if (!unpairTarget) return;
    if (ownerPin.trim().length !== 4) {
      setUnpairError("Enter your 4-digit PIN.");
      return;
    }
    setUnpairSubmitting(true);
    setUnpairError(null);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      const { data, error } = await supabase.functions.invoke("unpair-device", {
        body: { deviceId: unpairTarget.id, ownerPin: ownerPin.trim() },
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setUnpairTarget(null);
      await fetchDevices();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not unpair this device.";
      setUnpairError(message.includes("INVALID_OWNER_PIN") ? "That PIN is incorrect." : message);
    } finally {
      setUnpairSubmitting(false);
    }
  }

  return (
    <ScreenContainer>
      <View style={styles.headerRow}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={onBack} style={styles.backButton}>
          <Feather name="arrow-left" size={18} color={colors.textPrimary} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Set up a register</Text>
          <Text style={styles.subtitle}>For a tablet or phone at the counter</Text>
        </View>
      </View>

      {code ? (
        <Card padding={16} style={styles.codeCard}>
          <Text style={styles.codeLabel}>READ THIS CODE OUT AT THE COUNTER</Text>
          <View style={styles.codeRow}>
            {code.split("").map((char, i) => (
              <View key={i} style={styles.codeDigit}>
                <Text style={styles.codeDigitText}>{char}</Text>
              </View>
            ))}
          </View>
          <Text style={styles.codeExpiry}>
            Expires in {formatCountdown(msLeft)}
            {msLeft <= 0 ? "" : " · refreshes automatically"}
          </Text>
          {msLeft <= 0 && <PrimaryButton label="Generate a new code" onPress={generateCode} loading={generating} />}
        </Card>
      ) : (
        <>
          <PrimaryButton label="Generate a pairing code" onPress={generateCode} loading={generating} />
          {generateError && (
            <Text accessibilityRole="alert" style={styles.error}>
              {generateError}
            </Text>
          )}
        </>
      )}

      <Card padding={14} style={styles.instructionsCard}>
        <Text style={styles.instructionsTitle}>On the counter device</Text>
        <Text style={styles.instructionsBody}>
          Open Tindahan POS, tap <Text style={styles.bold}>Set up this device as a register</Text>, then type the
          code above. It confirms the store before pairing.
        </Text>
      </Card>

      <Text style={styles.sectionHeading}>Paired devices</Text>
      {loadingDevices ? (
        <Text style={styles.hint}>Loading…</Text>
      ) : loadError ? (
        <Text accessibilityRole="alert" style={styles.error}>
          {loadError}
        </Text>
      ) : devices.length === 0 ? (
        <Text style={styles.hint}>No devices paired yet.</Text>
      ) : (
        <Card padding={0}>
          {devices.map((device, i) => (
            <View key={device.id} style={[styles.deviceRow, i < devices.length - 1 && styles.deviceRowDivider]}>
              <View style={styles.deviceIcon}>
                <Feather name="tablet" size={16} color={colors.accentSoft} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.deviceName}>{device.name}</Text>
                <Text style={styles.deviceMeta}>Paired {new Date(device.pairedAt).toLocaleDateString()}</Text>
              </View>
              <Pressable accessibilityRole="button" onPress={() => openUnpairModal(device)} hitSlop={8}>
                <Text style={styles.unpairLink}>Unpair</Text>
              </Pressable>
            </View>
          ))}
        </Card>
      )}
      <Text style={styles.footnote}>
        Only an owner PIN can unpair a device. The owner&apos;s session never touches the counter device — the code
        is the only thing that crosses over.
      </Text>

      {unpairTarget && (
        <Modal visible animationType="fade" transparent onRequestClose={() => setUnpairTarget(null)}>
          <View style={styles.backdrop}>
            <Card padding={18} style={styles.modalCard}>
              <Text style={styles.modalTitle}>Unpair {unpairTarget.name}?</Text>
              <Text style={styles.modalSub}>Enter your PIN to confirm.</Text>
              <TextField
                accessibilityLabel="Owner PIN"
                value={ownerPin}
                onChangeText={setOwnerPin}
                keyboardType="number-pad"
                maxLength={4}
                secureTextEntry
              />
              {unpairError && (
                <Text accessibilityRole="alert" style={styles.error}>
                  {unpairError}
                </Text>
              )}
              <PrimaryButton label="Unpair device" onPress={submitUnpair} loading={unpairSubmitting} />
              <Pressable accessibilityRole="button" onPress={() => setUnpairTarget(null)} style={styles.cancelRow}>
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
            </Card>
          </View>
        </Modal>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 16 },
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
  title: { fontSize: 16, fontWeight: "500", color: colors.textPrimary },
  subtitle: { fontSize: 11.5, color: colors.textFaint, marginTop: 2 },
  codeCard: { alignItems: "center", marginBottom: 16 },
  codeLabel: { fontSize: 10, fontWeight: "500", color: colors.textFaint, letterSpacing: 0.8, marginBottom: 10 },
  codeRow: { flexDirection: "row", gap: 8, marginBottom: 8 },
  codeDigit: {
    width: 48,
    height: 52,
    borderRadius: radii.input,
    backgroundColor: "rgba(59, 130, 246, 0.14)",
    borderWidth: 1,
    borderColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  codeDigitText: { fontSize: 23, fontWeight: "500", color: colors.textPrimary },
  codeExpiry: { fontSize: 12, color: colors.textFaint, marginBottom: 10 },
  instructionsCard: { marginTop: 16, marginBottom: 16 },
  instructionsTitle: { fontSize: 13, fontWeight: "500", color: colors.textPrimary, marginBottom: 4 },
  instructionsBody: { fontSize: 12.5, color: colors.textDim, lineHeight: 18 },
  bold: { color: colors.textDim, fontWeight: "600" },
  sectionHeading: { fontSize: 15, fontWeight: "500", color: colors.textPrimary, marginBottom: 10 },
  hint: { fontSize: 13, color: colors.textFaint },
  deviceRow: { flexDirection: "row", alignItems: "center", padding: 14, gap: 12 },
  deviceRowDivider: { borderBottomWidth: 1, borderBottomColor: colors.hairlineFaint },
  deviceIcon: {
    width: 36,
    height: 36,
    borderRadius: radii.iconSquare,
    backgroundColor: "rgba(59, 130, 246, 0.14)",
    alignItems: "center",
    justifyContent: "center",
  },
  deviceName: { fontSize: 13.5, fontWeight: "500", color: colors.textPrimary },
  deviceMeta: { fontSize: 11.5, color: colors.textFaint, marginTop: 1 },
  unpairLink: { fontSize: 12.5, color: colors.error },
  footnote: { fontSize: 11, color: colors.textFaint, marginTop: 12, marginBottom: 24, lineHeight: 16 },
  error: { color: colors.error, fontSize: 12.5, marginTop: 8, marginBottom: 6 },
  backdrop: { flex: 1, backgroundColor: "rgba(0, 0, 0, 0.6)", justifyContent: "center", padding: 20 },
  modalCard: { backgroundColor: colors.panelSurface },
  modalTitle: { fontSize: 15, fontWeight: "500", color: colors.textPrimary, marginBottom: 4 },
  modalSub: { fontSize: 12.5, color: colors.textFaint, marginBottom: 14 },
  cancelRow: { alignItems: "center", marginTop: 10 },
  cancelText: { fontSize: 13, color: colors.textFaint },
});
