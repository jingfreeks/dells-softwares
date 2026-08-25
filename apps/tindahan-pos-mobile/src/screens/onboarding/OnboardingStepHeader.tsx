import { Pressable, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { colors, radii } from "../../theme/colors";
import { onboardingMinutesLeft, onboardingProgressPercent, type OnboardingStep } from "../../lib/onboarding";

interface OnboardingStepHeaderProps {
  step: OnboardingStep;
  stepNumber: number;
  totalSteps: number;
  title: string;
  onBack?: () => void;
  onSkip?: () => void;
}

/** Shared back/title/skip row + progress bar for onboarding steps 1-4 (mockup `.pbar` + `.bar`). */
export function OnboardingStepHeader({ step, stepNumber, totalSteps, title, onBack, onSkip }: OnboardingStepHeaderProps) {
  const percent = onboardingProgressPercent(step);
  const minutesLeft = onboardingMinutesLeft(step);

  return (
    <View>
      <View style={styles.row}>
        {onBack ? (
          <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={onBack} style={styles.iconButton}>
            <Feather name="arrow-left" size={18} color={colors.textPrimary} />
          </Pressable>
        ) : (
          <View style={styles.iconButton} />
        )}
        <View style={styles.textColumn}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>
            Step {stepNumber} of {totalSteps} · About {minutesLeft} min left
          </Text>
        </View>
        {onSkip ? (
          <Pressable accessibilityRole="button" onPress={onSkip} hitSlop={8}>
            <Text style={styles.skip}>Skip</Text>
          </Pressable>
        ) : (
          <View style={{ width: 32 }} />
        )}
      </View>
      <View style={styles.barTrack}>
        <View style={[styles.barFill, { width: `${percent}%` }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 14 },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: radii.iconSquare,
    backgroundColor: colors.panelStrong,
    borderWidth: 1,
    borderColor: colors.hairline,
    alignItems: "center",
    justifyContent: "center",
  },
  textColumn: { flex: 1 },
  title: { fontSize: 16, fontWeight: "500", color: colors.textPrimary },
  subtitle: { fontSize: 11.5, color: colors.textFaint, marginTop: 2 },
  skip: { fontSize: 13, color: colors.accentSoft },
  barTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    overflow: "hidden",
    marginBottom: 14,
  },
  barFill: { height: "100%", borderRadius: 2, backgroundColor: colors.accent },
});
