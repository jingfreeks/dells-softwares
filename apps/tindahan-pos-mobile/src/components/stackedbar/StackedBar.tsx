import { View } from "react-native";
import type { StackedBarProps } from "./types";

/** Horizontal multi-color proportion bar -- payment mix, category split, utang aging (§9). */
export function StackedBar({ segments, height = 9 }: StackedBarProps) {
  return (
    <View className="flex-row overflow-hidden" style={{ height, borderRadius: height / 2 }}>
      {segments.map((segment, index) => (
        <View
          key={index}
          style={{ width: `${Math.max(0, segment.fraction) * 100}%`, backgroundColor: segment.color }}
        />
      ))}
    </View>
  );
}
