import { StyleSheet, Text, View } from "react-native";
import { colors, radii } from "../theme/colors";

type Variant = "default" | "positive" | "warning" | "highlight" | "danger";

interface MetricCardProps {
  label: string;
  value: string;
  /** Sub-caption, e.g. "▲ 12% vs yesterday" or "Restock today" (§5 M-004). */
  caption?: string;
  variant?: Variant;
  /** Grid width share, e.g. "31%" for a 3-column row (Restock's OUT/CRITICAL/LOW tiles). Defaults to the 2x2 grid's ~48%. */
  flexBasis?: string;
}

const TONE_TILE: Partial<Record<Variant, object>> = {
  warning: { backgroundColor: "rgba(251, 191, 36, 0.08)", borderColor: "rgba(251, 191, 36, 0.25)" },
  highlight: { backgroundColor: "rgba(59, 130, 246, 0.10)", borderColor: "rgba(59, 130, 246, 0.28)" },
  danger: { backgroundColor: "rgba(248, 113, 113, 0.08)", borderColor: "rgba(248, 113, 113, 0.25)" },
};

const TONE_TEXT: Partial<Record<Variant, string>> = {
  warning: colors.warning,
  highlight: colors.accentSoft,
  danger: colors.error,
};

/**
 * One tile of a metric grid -- the Owner Home 2x2 grid (§5 M-004, §9) and
 * Restock's 3-column OUT/CRITICAL/LOW row reuse this same component. All
 * values passed in are DESIGN REFERENCE DATA -- this component has no
 * opinion on where they come from.
 */
export function MetricCard({ label, value, caption, variant = "default", flexBasis }: MetricCardProps) {
  const tileTone = TONE_TILE[variant];
  const textTone = TONE_TEXT[variant];

  return (
    <View style={[styles.tile, flexBasis ? { flexBasis } : null, tileTone]}>
      <Text style={[styles.label, textTone && { color: textTone }]}>{label}</Text>
      <Text style={[styles.value, textTone && { color: textTone }]}>{value}</Text>
      {caption && (
        <Text style={[styles.caption, variant === "positive" && styles.captionPositive, textTone && { color: textTone }]}>
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
  label: {
    fontSize: 10,
    fontWeight: "500",
    color: colors.textFaint,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  value: { fontSize: 20, fontWeight: "500", color: colors.textPrimary },
  caption: { fontSize: 11, color: colors.textFaint, marginTop: 4 },
  captionPositive: { color: colors.success },
});
