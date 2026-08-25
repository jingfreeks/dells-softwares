import { StyleSheet, Text, View } from "react-native";
import { colors, radii } from "../theme/colors";

type Variant = "default" | "positive" | "warning";

interface MetricCardProps {
  label: string;
  value: string;
  /** Sub-caption, e.g. "▲ 12% vs yesterday" or "Restock today" (§5 M-004). */
  caption?: string;
  variant?: Variant;
}

/**
 * One tile of the Owner Home 2x2 metric grid (§5 M-004, §9). All values
 * passed in are DESIGN REFERENCE DATA -- this component has no opinion on
 * where they come from; the calculation rules are TBD per §18.
 */
export function MetricCard({ label, value, caption, variant = "default" }: MetricCardProps) {
  const isWarning = variant === "warning";

  return (
    <View style={[styles.tile, isWarning && styles.tileWarning]}>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.value, isWarning && styles.valueWarning]}>{value}</Text>
      {caption && (
        <Text style={[styles.caption, variant === "positive" && styles.captionPositive, isWarning && styles.captionWarning]}>
          {caption}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    flexBasis: "48%",
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.hairline,
    borderRadius: radii.card,
    padding: 14,
  },
  tileWarning: { backgroundColor: "rgba(251, 191, 36, 0.08)", borderColor: "rgba(251, 191, 36, 0.25)" },
  label: {
    fontSize: 10,
    fontWeight: "500",
    color: colors.textFaint,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  value: { fontSize: 20, fontWeight: "500", color: colors.textPrimary },
  valueWarning: { color: colors.warning },
  caption: { fontSize: 11, color: colors.textFaint, marginTop: 4 },
  captionPositive: { color: colors.success },
  captionWarning: { color: colors.warning },
});
