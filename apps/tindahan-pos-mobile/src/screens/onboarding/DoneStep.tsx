import { StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { Card } from "../../components/Card";
import { PrimaryButton } from "../../components/PrimaryButton";
import { colors } from "../../theme/colors";
import { PESO } from "../../lib/money";

interface DoneStepProps {
  ownerName: string;
  storeName: string;
  openTime: string;
  closeTime: string;
  productsAdded: number;
  thresholdDays: number;
  startingFloat: number;
  finishing: boolean;
  finishError: string | null;
  onFinish: () => void;
}

/** Onboarding done screen (mobile-onboarding-done.html). */
export function DoneStep({
  ownerName,
  storeName,
  openTime,
  closeTime,
  productsAdded,
  thresholdDays,
  startingFloat,
  finishing,
  finishError,
  onFinish,
}: DoneStepProps) {
  return (
    <View>
      <View style={styles.chip}>
        <Feather name="check" size={12} color={colors.success} />
        <Text style={styles.chipText}>Setup complete</Text>
      </View>
      <Text style={styles.heading}>The register is open, {ownerName || "there"}.</Text>
      <Text style={styles.sub}>
        {productsAdded} product{productsAdded === 1 ? "" : "s"} loaded, alerts set at {thresholdDays} days of cover, and{" "}
        {PESO.format(startingFloat)} counted into the drawer. Ring up your first sale whenever you&apos;re ready.
      </Text>

      <Card padding={14}>
        <Text style={styles.cardHeading}>What&apos;s set up</Text>
        <SummaryRow title="Store profile" detail={`${storeName || "Your store"} · open ${openTime}–${closeTime}`} />
        <SummaryRow title={`${productsAdded} products`} detail="From the starter list · prices set" />
        <SummaryRow title="Stock alerts" detail={`Warn at ${thresholdDays} days of cover`} />
        <SummaryRow title="Register open" detail={`Float ${PESO.format(startingFloat)} counted`} />
      </Card>

      {finishError && (
        <Text accessibilityRole="alert" style={styles.error}>
          {finishError}
        </Text>
      )}

      <View style={styles.buttonSpacing}>
        <PrimaryButton label="Start selling" onPress={onFinish} loading={finishing} />
      </View>
    </View>
  );
}

function SummaryRow({ title, detail }: { title: string; detail: string }) {
  return (
    <View style={styles.summaryRow}>
      <Feather name="check-circle" size={17} color={colors.success} />
      <View style={{ flex: 1 }}>
        <Text style={styles.summaryTitle}>{title}</Text>
        <Text style={styles.summaryDetail}>{detail}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    backgroundColor: "rgba(74, 222, 128, 0.12)",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginTop: 30,
    marginBottom: 16,
  },
  chipText: { fontSize: 12, color: colors.success, fontWeight: "500" },
  heading: { fontSize: 24, fontWeight: "500", lineHeight: 30, color: colors.textStrong, marginBottom: 10 },
  sub: { fontSize: 14, lineHeight: 22, color: colors.textDim, marginBottom: 18 },
  cardHeading: { fontSize: 13.5, fontWeight: "500", color: colors.textPrimary, marginBottom: 11 },
  summaryRow: { flexDirection: "row", gap: 10, alignItems: "flex-start", paddingVertical: 7 },
  summaryTitle: { fontSize: 13.5, color: colors.textPrimary },
  summaryDetail: { fontSize: 11.5, color: colors.textFaint, marginTop: 1 },
  error: { color: colors.error, fontSize: 13, marginTop: 14 },
  buttonSpacing: { marginTop: 18, marginBottom: 24 },
});
