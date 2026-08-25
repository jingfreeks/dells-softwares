import { StyleSheet, View } from "react-native";

interface Segment {
  /** 0-1 share of the total width. Segments that don't sum to 1 just leave a gap at the end. */
  fraction: number;
  color: string;
}

interface StackedBarProps {
  segments: Segment[];
  height?: number;
}

/** Horizontal multi-color proportion bar -- payment mix, category split, utang aging (§9). */
export function StackedBar({ segments, height = 9 }: StackedBarProps) {
  return (
    <View style={[styles.track, { height, borderRadius: height / 2 }]}>
      {segments.map((segment, index) => (
        <View
          key={index}
          style={{ width: `${Math.max(0, segment.fraction) * 100}%`, backgroundColor: segment.color }}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  track: { flexDirection: "row", overflow: "hidden" },
});
