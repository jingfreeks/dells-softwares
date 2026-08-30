import { Pressable, View } from "react-native";
import type { ToggleProps } from "./types";

/** Small on/off switch (`.tog`, §9) -- onboarding's stock-alert toggles. */
export function Toggle({ value, onToggle, accessibilityLabel }: ToggleProps) {
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      accessibilityLabel={accessibilityLabel}
      onPress={onToggle}
      className={`w-11 h-[26px] rounded-[13px] border p-0.5 justify-center ${
        value ? "bg-accent border-accent" : "bg-panel-strong border-hairline"
      }`}
    >
      <View className={`w-5 h-5 rounded-full bg-text-primary ${value ? "self-end" : ""}`} />
    </Pressable>
  );
}
