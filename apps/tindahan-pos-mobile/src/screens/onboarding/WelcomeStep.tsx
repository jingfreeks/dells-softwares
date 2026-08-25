import { Pressable, StyleSheet, Text, View } from "react-native";
import { Card } from "../../components/Card";
import { PrimaryButton } from "../../components/PrimaryButton";
import { colors } from "../../theme/colors";

interface WelcomeStepProps {
  onStartSetup: () => void;
  onSkipToRegister: () => void;
}

const CHECKLIST = [
  { n: 1, title: "Store profile", detail: "Your name and shop details", time: "~1 min" },
  { n: 2, title: "Add products", detail: "Start from a ready-made list", time: "~4 min" },
  { n: 3, title: "Set stock alerts", detail: "We suggest a sensible default", time: "~1 min" },
  { n: 4, title: "Open the register", detail: "Count your starting cash", time: "~2 min" },
];

/** Onboarding welcome screen (mobile-onboarding-welcome.html). */
export function WelcomeStep({ onStartSetup, onSkipToRegister }: WelcomeStepProps) {
  return (
    <View>
      <Text style={styles.heading}>Let&apos;s get your shop ready to sell.</Text>
      <Text style={styles.sub}>
        Four short steps. Everything saves as you go — stop after any of them and pick it up later from the dashboard.
      </Text>

      <Card padding={14} style={styles.card}>
        <View style={styles.cardHeaderRow}>
          <Text style={styles.cardHeading}>What we&apos;ll do</Text>
          <View style={styles.pill}>
            <Text style={styles.pillText}>4 steps</Text>
          </View>
        </View>
        {CHECKLIST.map((item) => (
          <View key={item.n} style={styles.row}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{item.n}</Text>
            </View>
            <View style={styles.rowText}>
              <Text style={styles.rowTitle}>{item.title}</Text>
              <Text style={styles.rowDetail}>{item.detail}</Text>
            </View>
            <Text style={styles.rowTime}>{item.time}</Text>
          </View>
        ))}
      </Card>

      <PrimaryButton label="Start setup" onPress={onStartSetup} />
      <Pressable accessibilityRole="button" onPress={onSkipToRegister} style={styles.skipRow}>
        <Text style={styles.skipText}>Skip — take me to the register</Text>
      </Pressable>
      <Text style={styles.note}>About 8 minutes end to end. No card, nothing to install.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  heading: { fontSize: 26, fontWeight: "500", lineHeight: 32, color: colors.textStrong, marginBottom: 10, marginTop: 20 },
  sub: { fontSize: 14, lineHeight: 22, color: colors.textDim, marginBottom: 20 },
  card: { marginBottom: 18 },
  cardHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  cardHeading: { fontSize: 13.5, fontWeight: "500", color: colors.textPrimary },
  pill: {
    backgroundColor: "rgba(59, 130, 246, 0.14)",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  pillText: { fontSize: 11, color: colors.accentSoft, fontWeight: "500" },
  row: { flexDirection: "row", alignItems: "center", paddingVertical: 10, gap: 12 },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(59, 130, 246, 0.14)",
    borderWidth: 1,
    borderColor: "rgba(76, 141, 255, 0.30)",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontSize: 12, fontWeight: "500", color: colors.accentSoft },
  rowText: { flex: 1 },
  rowTitle: { fontSize: 13.5, fontWeight: "500", color: colors.textPrimary },
  rowDetail: { fontSize: 11.5, color: colors.textFaint, marginTop: 1 },
  rowTime: { fontSize: 11.5, color: colors.textFaint },
  skipRow: { alignItems: "center", marginTop: 12 },
  skipText: { fontSize: 13, color: colors.textFaint },
  note: { textAlign: "center", marginTop: 8, fontSize: 11.5, color: colors.textFaint },
});
