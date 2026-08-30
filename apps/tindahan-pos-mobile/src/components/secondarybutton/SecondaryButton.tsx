import { Text, TouchableOpacity, View } from "react-native";
import type { SecondaryButtonProps } from "./types";

/**
 * Neutral/glass button (`.btn`, §9) -- used for "Continue with Google" /
 * "Sign up with Google". No brand icon library is available in this app
 * yet, so the mark is a plain "G" badge rather than a real Google glyph --
 * PROPOSED placeholder per MOBILE_UI_DESIGN_SPECIFICATION.md §8 Icons.
 */
export function SecondaryButton({ label, onPress, disabled }: SecondaryButtonProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      className={`min-h-11 flex-row items-center justify-center border border-hairline rounded-button bg-panel-strong mb-4 ${
        disabled ? "opacity-40" : ""
      }`}
    >
      <View className="w-[18px] h-[18px] rounded-[4px] bg-accent items-center justify-center mr-2.5">
        <Text className="text-[11px] font-medium text-text-primary">G</Text>
      </View>
      <Text className="text-sm font-medium text-text-primary">{label}</Text>
    </TouchableOpacity>
  );
}
