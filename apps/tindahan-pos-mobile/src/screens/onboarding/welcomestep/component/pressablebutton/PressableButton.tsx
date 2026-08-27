import { Pressable, Text } from "react-native";
import type { PressableButtonProps } from "./types";

export function PressableButton({ onPress, label }: PressableButtonProps) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} className="items-center mt-3">
      <Text className="text-[13px] text-text-faint">{label}</Text>
    </Pressable>
  );
}
