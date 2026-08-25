import { StyleSheet, Text, View } from "react-native";
import { colors } from "../theme/colors";

export type PasswordStrength = 0 | 1 | 2 | 3 | 4;

// Labels for 0-2 are inferred (Proposed) -- the mockup only confirms one
// data point: 3-of-4 filled bars captioned "Strong" (§5 M-003).
const LABEL: Record<PasswordStrength, string> = {
  0: "Too short",
  1: "Weak",
  2: "Fair",
  3: "Strong",
  4: "Strong",
};

interface PasswordStrengthMeterProps {
  strength: PasswordStrength;
  /** Extra caption after the strength word, e.g. "add a symbol to max it out" (§5 M-003). */
  hint?: string;
}

/**
 * 4-segment strength bar, Create Account only (§5 M-003, §9). The scoring
 * rule itself is TBD -- Backend/Business Logic Phase per §18 -- this
 * component only renders whatever `strength` value it's given.
 */
export function PasswordStrengthMeter({ strength, hint }: PasswordStrengthMeterProps) {
  return (
    <View style={styles.wrapper}>
      <View style={styles.bars}>
        {[0, 1, 2, 3].map((i) => (
          <View key={i} style={[styles.bar, i < strength && styles.barFilled]} />
        ))}
      </View>
      <Text style={styles.caption}>
        {LABEL[strength]}
        {hint ? ` · ${hint}` : ""}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: 16 },
  bars: { flexDirection: "row", gap: 5, marginBottom: 6 },
  bar: { flex: 1, height: 3, borderRadius: 2, backgroundColor: colors.hairline },
  barFilled: { backgroundColor: colors.success },
  caption: { fontSize: 11.5, color: colors.textFaint },
});
