import { Pressable, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { colors } from "../../theme/colors";
import type { IconButtonProps } from "./types";

/** Rounded-square icon-only button (`.iconbtn`, §5 M-004 notification bell). */
export function IconButton({ icon, onPress, accessibilityLabel, showBadge }: IconButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      // 40x40 by design; hitSlop lifts the touch target to the 44pt
      // minimum without changing how the button looks.
      hitSlop={2}
      className="w-10 h-10 rounded-icon-square bg-panel-strong border border-hairline items-center justify-center"
    >
      <Feather name={icon} size={18} color={colors.textPrimary} />
      {showBadge && <View className="absolute top-2 right-2 w-[7px] h-[7px] rounded-[4px] bg-error" />}
    </Pressable>
  );
}
