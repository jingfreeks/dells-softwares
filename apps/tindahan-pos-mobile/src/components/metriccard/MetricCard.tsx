import { Text, View, type ViewStyle } from "react-native";
import { useMetricCard } from "./hooks";
import type { MetricCardProps } from "./types";

/**
 * One tile of a metric grid -- the Owner Home 2x2 grid (§5 M-004, §9) and
 * Restock's 3-column OUT/CRITICAL/LOW row reuse this same component. All
 * values passed in are DESIGN REFERENCE DATA -- this component has no
 * opinion on where they come from.
 */
export function MetricCard({ label, value, caption, variant = "default", flexBasis }: MetricCardProps) {
  const { tileToneClass, textToneClass } = useMetricCard(variant);

  return (
    <View
      className={`basis-[48%] border rounded-card p-3.5 ${tileToneClass || "bg-panel border-hairline"}`}
      style={flexBasis ? ({ flexBasis } as ViewStyle) : undefined}
    >
      <Text className={`text-[10px] font-medium tracking-[0.8px] uppercase mb-1.5 ${textToneClass || "text-text-faint"}`}>
        {label}
      </Text>
      <Text className={`text-xl font-medium ${textToneClass || "text-text-primary"}`}>{value}</Text>
      {caption && (
        <Text
          className={`text-[11px] mt-1 ${textToneClass || (variant === "positive" ? "text-success" : "text-text-faint")}`}
        >
          {caption}
        </Text>
      )}
    </View>
  );
}
