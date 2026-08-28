import { Pressable, Text } from "react-native";
import type { SegmentProps } from "./types";

export function Segment({ option, active, onPress }: SegmentProps) {
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      className={`flex-1 min-h-9 items-center justify-center rounded-[7px] ${active ? "bg-accent" : ""}`}
    >
      <Text className={`text-sm font-medium ${active ? "text-text-primary" : "text-text-muted"}`}>{option}</Text>
    </Pressable>
  );
}
