import { StyleSheet, Text, TextInput, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { Card } from "../../components/Card";
import { MetricCard } from "../../components/MetricCard";
import { PrimaryButton } from "../../components/PrimaryButton";
import { OnboardingStepHeader } from "./OnboardingStepHeader";
import { colors, radii } from "../../theme/colors";
import { PESO } from "../../lib/money";
import {
  STARTING_CASH_DENOMINATIONS,
  computeCashHealth,
  computeStartingFloat,
  denominationSubtotal,
  type DenominationCounts,
} from "../../lib/onboarding";

const DEFAULT_DRAWER_MINIMUM = 500;

interface OpenRegisterStepProps {
  denominationCounts: DenominationCounts;
  onDenominationCountChange: (key: string, quantity: number) => void;
  averageSaleValue: number;
  assignedStaffName: string;
  onOpenRegister: () => void;
  onSkipCount: () => void;
  onBack: () => void;
}

/** Onboarding step 4 — open the register (mobile-onboarding-register.html). */
export function OpenRegisterStep({
  denominationCounts,
  onDenominationCountChange,
  averageSaleValue,
  assignedStaffName,
  onOpenRegister,
  onSkipCount,
  onBack,
}: OpenRegisterStepProps) {
  const startingFloat = computeStartingFloat(denominationCounts);
  const cashHealth = computeCashHealth(denominationCounts);

  return (
    <View>
      <OnboardingStepHeader step="openRegister" stepNumber={4} totalSteps={4} title="Open the register" onBack={onBack} />
      <Text style={styles.h1}>Count your starting cash</Text>
      <Text style={styles.sub}>
        Do this every morning — it&apos;s the only way to know if the drawer is short later.
      </Text>

      <Card padding={14} style={styles.card}>
        <Text style={styles.seclbl}>HOW MANY OF EACH</Text>
        {STARTING_CASH_DENOMINATIONS.map((def) => {
          const quantity = denominationCounts[def.key] ?? 0;
          return (
            <View key={def.key} style={styles.denomRow}>
              <Text style={styles.denomLabel}>{def.label}</Text>
              <TextInput
                accessibilityLabel={`${def.label} count`}
                keyboardType="number-pad"
                value={String(quantity)}
                onChangeText={(text) => onDenominationCountChange(def.key, Number(text) || 0)}
                style={styles.denomInput}
              />
              <Text style={styles.denomSubtotal}>{PESO.format(denominationSubtotal(def, quantity))}</Text>
            </View>
          );
        })}
      </Card>

      <View style={styles.metricRow}>
        <MetricCard label="Starting float" value={PESO.format(startingFloat)} variant="highlight" flexBasis="48%" />
        <MetricCard
          label="Keep as minimum"
          value={PESO.format(DEFAULT_DRAWER_MINIMUM)}
          caption="Blocks cash-outs below this"
          flexBasis="48%"
        />
      </View>

      <Card padding={13} style={[styles.card, cashHealth.level === "good" ? styles.healthGood : styles.healthLow]}>
        <View style={styles.healthRow}>
          <Feather
            name="info"
            size={17}
            color={cashHealth.level === "good" ? colors.success : colors.warning}
          />
          <View style={{ flex: 1 }}>
            <Text style={[styles.healthTitle, { color: cashHealth.level === "good" ? colors.successDim : colors.warningDim }]}>
              {cashHealth.level === "good" ? "Plenty of small notes and coins" : "Mostly large bills"}
            </Text>
            <Text style={styles.healthDetail}>
              {averageSaleValue > 0
                ? `Average sale is about ${PESO.format(averageSaleValue)} — ${
                    cashHealth.level === "good" ? "this covers change comfortably" : "you may run short on change"
                  }.`
                : cashHealth.level === "good"
                  ? "This should cover change comfortably."
                  : "You may run short on change for smaller sales."}
            </Text>
          </View>
        </View>
      </Card>

      <Card padding={14}>
        <View style={styles.assignedRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.assignedTitle}>Who&apos;s on the register?</Text>
            <Text style={styles.assignedDetail}>Sales get recorded under this person</Text>
          </View>
          <View style={styles.assignedPill}>
            <Text style={styles.assignedPillText}>{assignedStaffName} (you)</Text>
          </View>
        </View>
      </Card>

      <PrimaryButton label="Open the register" onPress={onOpenRegister} />
      <Text accessibilityRole="link" onPress={onSkipCount} style={styles.note}>
        Skip the count
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  h1: { fontSize: 20, fontWeight: "500", color: colors.textStrong, marginBottom: 4 },
  sub: { fontSize: 13, color: colors.textDim, marginBottom: 16 },
  card: { marginBottom: 12 },
  seclbl: { fontSize: 10, fontWeight: "500", color: colors.textFaint, letterSpacing: 0.8, marginBottom: 10 },
  denomRow: { flexDirection: "row", alignItems: "center", gap: 9, marginBottom: 9 },
  denomLabel: { width: 60, color: colors.textDim, fontSize: 13 },
  denomInput: {
    flex: 1,
    height: 38,
    borderRadius: radii.input,
    borderWidth: 1,
    borderColor: colors.hairline,
    backgroundColor: colors.panelStrong,
    color: colors.textPrimary,
    textAlign: "center",
    fontSize: 15,
  },
  denomSubtotal: { width: 60, textAlign: "right", fontSize: 12, color: colors.textFaint },
  metricRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 12 },
  healthGood: { backgroundColor: "rgba(74, 222, 128, 0.08)", borderColor: "rgba(74, 222, 128, 0.26)" },
  healthLow: { backgroundColor: "rgba(251, 191, 36, 0.08)", borderColor: "rgba(251, 191, 36, 0.26)" },
  healthRow: { flexDirection: "row", gap: 10, alignItems: "flex-start" },
  healthTitle: { fontSize: 13, fontWeight: "500" },
  healthDetail: { fontSize: 11.5, color: colors.textFaint, marginTop: 2 },
  assignedRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  assignedTitle: { fontSize: 13.5, fontWeight: "500", color: colors.textPrimary },
  assignedDetail: { fontSize: 11.5, color: colors.textFaint, marginTop: 2 },
  assignedPill: { backgroundColor: colors.panelStrong, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  assignedPillText: { fontSize: 12, color: colors.textDim },
  note: { textAlign: "center", marginTop: 14, marginBottom: 22, fontSize: 13, color: colors.textFaint },
});
