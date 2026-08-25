import { Pressable, StyleSheet, Text, View } from "react-native";
import { Card } from "../../components/Card";
import { PrimaryButton } from "../../components/PrimaryButton";
import { Toggle } from "../../components/Toggle";
import { OnboardingStepHeader } from "./OnboardingStepHeader";
import { colors } from "../../theme/colors";
import { MAX_THRESHOLD_DAYS, MIN_THRESHOLD_DAYS, type StockAlertPreview } from "../../lib/onboarding";

interface StockAlertsStepProps {
  thresholdDays: number;
  onThresholdDaysChange: (days: number) => void;
  fastMoverBoost: boolean;
  onFastMoverBoostChange: (value: boolean) => void;
  dailySummary: boolean;
  onDailySummaryChange: (value: boolean) => void;
  preview: StockAlertPreview;
  onContinue: () => void;
  onSkip: () => void;
  onBack: () => void;
}

function formatDaysLeft(days: number): string {
  if (days <= 0) return "out now";
  if (days < 1) return `${Math.max(1, Math.round(days * 24))} hrs`;
  return `${Math.round(days)} day${Math.round(days) === 1 ? "" : "s"}`;
}

/** Onboarding step 3 — stock alerts (mobile-onboarding-alerts.html). */
export function StockAlertsStep({
  thresholdDays,
  onThresholdDaysChange,
  fastMoverBoost,
  onFastMoverBoostChange,
  dailySummary,
  onDailySummaryChange,
  preview,
  onContinue,
  onSkip,
  onBack,
}: StockAlertsStepProps) {
  const range = MAX_THRESHOLD_DAYS - MIN_THRESHOLD_DAYS;
  const percent = ((thresholdDays - MIN_THRESHOLD_DAYS) / range) * 100;

  return (
    <View>
      <OnboardingStepHeader step="stockAlerts" stepNumber={3} totalSteps={4} title="Set stock alerts" onBack={onBack} onSkip={onSkip} />
      <Text style={styles.h1}>When should we warn you?</Text>
      <Text style={styles.sub}>One rule now, fine-tune per product later.</Text>

      <Card padding={14} style={styles.thresholdCard}>
        <View style={styles.thresholdHeaderRow}>
          <Text style={styles.thresholdLabel}>Warn me when less than</Text>
          <Text style={styles.thresholdValue}>
            {thresholdDays} days<Text style={styles.thresholdValueSuffix}> left</Text>
          </Text>
        </View>
        <View style={styles.stepperRow}>
          {Array.from({ length: range + 1 }, (_, i) => MIN_THRESHOLD_DAYS + i).map((day) => (
            <Pressable
              key={day}
              accessibilityRole="button"
              accessibilityLabel={`${day} days`}
              onPress={() => onThresholdDaysChange(day)}
              style={[styles.stepperDot, day <= thresholdDays && styles.stepperDotOn]}
            />
          ))}
        </View>
        <View style={styles.barTrack}>
          <View style={[styles.barFill, { width: `${percent}%` }]} />
        </View>
        <View style={styles.sp}>
          <Text style={styles.ts}>1 day · risky</Text>
          <Text style={styles.ts}>7 days · costly</Text>
        </View>
      </Card>

      <Card padding={14} style={styles.previewCard}>
        <View style={styles.sp}>
          <Text style={styles.previewLabel}>Today you&apos;d be warned about</Text>
          <View style={styles.previewPill}>
            <Text style={styles.previewPillText}>{preview.affectedCount} items</Text>
          </View>
        </View>
        <View style={styles.chipsRow}>
          {preview.items.slice(0, 4).map((item) => (
            <View key={item.productId} style={[styles.chip, item.daysOfStockLeft <= 0 && styles.chipCritical]}>
              <Text style={styles.chipText}>
                {item.productName} · {formatDaysLeft(item.daysOfStockLeft)}
              </Text>
            </View>
          ))}
        </View>
      </Card>

      <Card padding={0} style={styles.togglesCard}>
        <View style={styles.toggleRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.toggleTitle}>Fast movers get a longer warning</Text>
            <Text style={styles.toggleDetail}>10+/day warns at 5 days instead</Text>
          </View>
          <Toggle accessibilityLabel="Fast movers get a longer warning" value={fastMoverBoost} onToggle={() => onFastMoverBoostChange(!fastMoverBoost)} />
        </View>
        <View style={[styles.toggleRow, styles.toggleRowLast]}>
          <View style={{ flex: 1 }}>
            <Text style={styles.toggleTitle}>Send the list every morning at 7 AM</Text>
            <Text style={styles.toggleDetail}>One message, not all day</Text>
          </View>
          <Toggle accessibilityLabel="Send the list every morning at 7 AM" value={dailySummary} onToggle={() => onDailySummaryChange(!dailySummary)} />
        </View>
      </Card>

      <PrimaryButton label="Continue" onPress={onContinue} />
      <Text style={styles.note}>Use the default · saved automatically</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  h1: { fontSize: 20, fontWeight: "500", color: colors.textStrong, marginBottom: 4 },
  sub: { fontSize: 13, color: colors.textDim, marginBottom: 16 },
  thresholdCard: { marginBottom: 12 },
  thresholdHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 11 },
  thresholdLabel: { fontSize: 13.5, color: colors.textPrimary },
  thresholdValue: { fontSize: 17, fontWeight: "500", color: colors.accentSoft },
  thresholdValueSuffix: { fontSize: 12, color: colors.textFaint, fontWeight: "400" },
  stepperRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8, paddingHorizontal: 2 },
  stepperDot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.panelStrong,
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  stepperDotOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  barTrack: { height: 6, borderRadius: 3, backgroundColor: "rgba(255, 255, 255, 0.08)", overflow: "hidden", marginBottom: 8 },
  barFill: { height: "100%", borderRadius: 3, backgroundColor: colors.accent },
  sp: { flexDirection: "row", justifyContent: "space-between" },
  ts: { fontSize: 11, color: colors.textFaint },
  previewCard: { marginBottom: 12 },
  previewLabel: { fontSize: 13, color: colors.textPrimary },
  previewPill: { backgroundColor: "rgba(251, 191, 36, 0.16)", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 },
  previewPillText: { fontSize: 11, color: colors.warning, fontWeight: "500" },
  chipsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 11 },
  chip: { borderRadius: 8, height: 28, paddingHorizontal: 10, justifyContent: "center", backgroundColor: "rgba(251, 191, 36, 0.10)" },
  chipCritical: { backgroundColor: "rgba(248, 113, 113, 0.12)" },
  chipText: { fontSize: 11.5, color: colors.textDim },
  togglesCard: { marginBottom: 18 },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.hairlineFaint,
    gap: 12,
  },
  toggleRowLast: { borderBottomWidth: 0 },
  toggleTitle: { fontSize: 13.5, fontWeight: "500", color: colors.textPrimary },
  toggleDetail: { fontSize: 11.5, color: colors.textFaint, marginTop: 2 },
  note: { textAlign: "center", marginTop: 10, fontSize: 11.5, color: colors.textFaint },
});
