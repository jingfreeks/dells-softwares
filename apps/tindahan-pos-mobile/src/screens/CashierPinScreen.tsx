import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { ScreenContainer } from "../components/ScreenContainer";
import { Avatar } from "../components/Avatar";
import { Card } from "../components/Card";
import { PrimaryButton } from "../components/PrimaryButton";
import { TextField } from "../components/TextField";
import { colors, radii } from "../theme/colors";
import { useAuth } from "../lib/auth";
import { useCashierSession } from "../lib/cashierSession";
import { supabase } from "../lib/supabaseClient";

interface PickableCashier {
  id: string;
  name: string;
  avatarUrl: string | null;
}

const PIN_LENGTH = 4;
const KEYPAD_ROWS: (string | null)[][] = [
  ["1", "2", "3"],
  ["4", "5", "6"],
  ["7", "8", "9"],
  [null, "0", "backspace"],
];

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
}

/** "Who's on the register?" PIN lock (mobile-cashier-pin.html) -- gates a paired counter device. */
export function CashierPinScreen() {
  const { store } = useAuth();
  const { startCashierSession, loading: startingSession } = useCashierSession();

  const [cashiers, setCashiers] = useState<PickableCashier[]>([]);
  const [loadingCashiers, setLoadingCashiers] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [selected, setSelected] = useState<PickableCashier | null>(null);
  const [pin, setPin] = useState("");
  const [awaitingFloat, setAwaitingFloat] = useState(false);
  const [openingFloatText, setOpeningFloatText] = useState("0");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    supabase
      .rpc("list_pickable_cashiers")
      .then(({ data, error: err }) => {
        if (cancelled) return;
        if (err) {
          setLoadError(err.message);
        } else {
          setCashiers((data ?? []).map((row) => ({ id: row.id, name: row.name, avatarUrl: row.avatar_url })));
        }
        setLoadingCashiers(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function selectCashier(cashier: PickableCashier) {
    setSelected(cashier);
    setPin("");
    setAwaitingFloat(false);
    setError(null);
  }

  function pressDigit(digit: string) {
    if (pin.length >= PIN_LENGTH) return;
    const next = pin + digit;
    setError(null);
    setPin(next);
    if (next.length === PIN_LENGTH) {
      setAwaitingFloat(true);
    }
  }

  function pressBackspace() {
    setAwaitingFloat(false);
    setPin((prev) => prev.slice(0, -1));
  }

  async function submitShiftStart() {
    if (!selected) return;
    const openingFloat = Number(openingFloatText);
    if (Number.isNaN(openingFloat) || openingFloat < 0) {
      setError("Enter a valid amount.");
      return;
    }
    const result = await startCashierSession(selected.id, pin, openingFloat);
    if (!result.ok) {
      setError(friendlyPinError(result.error));
      setPin("");
      setAwaitingFloat(false);
    }
  }

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <View style={styles.brandMark}>
          <Text style={styles.brandMarkText}>{(store?.name ?? "T")[0]}</Text>
        </View>
        <Text style={styles.storeName}>{store?.name ?? "Store"}</Text>
      </View>
      <Text style={styles.deviceLine}>Counter tablet</Text>

      {!selected ? (
        <>
          <Text style={styles.sectionLabel}>WHO&apos;S ON THE REGISTER?</Text>
          {loadingCashiers ? (
            <Text style={styles.hint}>Loading…</Text>
          ) : loadError ? (
            <Text accessibilityRole="alert" style={styles.error}>
              {loadError}
            </Text>
          ) : (
            <View style={styles.pickerGrid}>
              {cashiers.map((cashier) => (
                <Pressable
                  key={cashier.id}
                  accessibilityRole="button"
                  onPress={() => selectCashier(cashier)}
                  style={styles.pickerItem}
                >
                  <Avatar initial={initials(cashier.name)} size={46} shape="circle" />
                  <Text style={styles.pickerName}>{cashier.name}</Text>
                </Pressable>
              ))}
            </View>
          )}
        </>
      ) : !awaitingFloat ? (
        <View style={styles.pinArea}>
          <Text style={styles.greeting}>Hi {selected.name.split(" ")[0]} — enter your PIN</Text>
          <View style={styles.dotsRow}>
            {Array.from({ length: PIN_LENGTH }, (_, i) => (
              <View key={i} style={[styles.dot, i < pin.length && styles.dotOn]} />
            ))}
          </View>
          {error && (
            <Text accessibilityRole="alert" style={styles.error}>
              {error}
            </Text>
          )}
          <View style={styles.keypad}>
            {KEYPAD_ROWS.map((row, i) => (
              <View key={i} style={styles.keypadRow}>
                {row.map((key, j) =>
                  key === null ? (
                    <View key={j} style={styles.keypadBlank} />
                  ) : key === "backspace" ? (
                    <Pressable key={j} accessibilityRole="button" accessibilityLabel="Delete digit" onPress={pressBackspace} style={styles.keypadKey}>
                      <Feather name="delete" size={18} color={colors.textDim} />
                    </Pressable>
                  ) : (
                    <Pressable
                      key={j}
                      accessibilityRole="button"
                      accessibilityLabel={`Digit ${key}`}
                      onPress={() => pressDigit(key)}
                      style={styles.keypadKey}
                    >
                      <Text style={styles.keypadKeyText}>{key}</Text>
                    </Pressable>
                  )
                )}
              </View>
            ))}
          </View>
          <Pressable accessibilityRole="button" onPress={() => setSelected(null)}>
            <Text style={styles.switchLink}>Not {selected.name.split(" ")[0]}? Choose someone else</Text>
          </Pressable>
        </View>
      ) : (
        <Card padding={16} style={styles.floatCard}>
          <Text style={styles.floatTitle}>How much cash is in the drawer?</Text>
          <Text style={styles.floatSub}>Count what's there right now to start your shift.</Text>
          <TextField
            accessibilityLabel="Opening float"
            label="Cash counted"
            value={openingFloatText}
            onChangeText={setOpeningFloatText}
            keyboardType="decimal-pad"
          />
          {error && (
            <Text accessibilityRole="alert" style={styles.error}>
              {error}
            </Text>
          )}
          <PrimaryButton label="Start shift" onPress={submitShiftStart} loading={startingSession} />
          <Pressable accessibilityRole="button" onPress={() => setAwaitingFloat(false)} style={styles.backToPinRow}>
            <Text style={styles.switchLink}>Back</Text>
          </Pressable>
        </Card>
      )}
    </ScreenContainer>
  );
}

function friendlyPinError(errorCode: string): string {
  if (errorCode.includes("INACTIVE_EMPLOYEE")) return "This staff member is no longer active.";
  if (errorCode.includes("PIN_LOCKED")) return "Too many wrong attempts. Try again in a few minutes.";
  if (errorCode.includes("INVALID_PIN")) return "That PIN is incorrect.";
  return errorCode;
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", gap: 10, justifyContent: "center", marginTop: 20 },
  brandMark: {
    width: 28,
    height: 28,
    borderRadius: radii.iconSquare,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  brandMarkText: { color: colors.textPrimary, fontWeight: "600", fontSize: 13 },
  storeName: { fontSize: 16, fontWeight: "500", color: colors.textPrimary },
  deviceLine: { textAlign: "center", fontSize: 12, color: colors.textFaint, marginTop: 4, marginBottom: 20 },
  sectionLabel: { textAlign: "center", fontSize: 10, fontWeight: "500", color: colors.textFaint, letterSpacing: 0.8, marginBottom: 14 },
  hint: { textAlign: "center", color: colors.textFaint, fontSize: 13 },
  pickerGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 18 },
  pickerItem: { alignItems: "center", gap: 6, width: 64 },
  pickerName: { fontSize: 12, color: colors.textDim },
  pinArea: { alignItems: "center", marginTop: 8 },
  greeting: { fontSize: 14, color: colors.textDim, marginBottom: 14 },
  dotsRow: { flexDirection: "row", gap: 12, marginBottom: 14 },
  dot: { width: 12, height: 12, borderRadius: 6, borderWidth: 1, borderColor: colors.hairline },
  dotOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  keypad: { marginVertical: 18 },
  keypadRow: { flexDirection: "row", justifyContent: "center", gap: 14, marginBottom: 14 },
  keypadKey: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.panelStrong,
    borderWidth: 1,
    borderColor: colors.hairline,
    alignItems: "center",
    justifyContent: "center",
  },
  keypadKeyText: { fontSize: 22, color: colors.textPrimary },
  keypadBlank: { width: 64, height: 64 },
  switchLink: { fontSize: 12.5, color: colors.accentSoft, textAlign: "center" },
  backToPinRow: { marginTop: 12 },
  floatCard: { marginTop: 8 },
  floatTitle: { fontSize: 15, fontWeight: "500", color: colors.textPrimary, marginBottom: 4 },
  floatSub: { fontSize: 12, color: colors.textFaint, marginBottom: 14 },
  error: { color: colors.error, fontSize: 12.5, textAlign: "center", marginBottom: 10 },
});
