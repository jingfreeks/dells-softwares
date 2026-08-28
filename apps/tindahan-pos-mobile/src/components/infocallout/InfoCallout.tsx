import { Pressable, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { colors } from "../../theme/colors";
import type { InfoCalloutProps } from "./types";

/**
 * Colored callout card -- covers both the "set up this device as a
 * register" prompt (§5 M-002) and the "register is open" status card
 * (§5 M-004): same underlying pattern, different tone (§9).
 */
export function InfoCallout({ icon, tone = "info", title, description, trailing, onPress }: InfoCalloutProps) {
  const Wrapper = onPress ? Pressable : View;

  return (
    <Wrapper
      onPress={onPress}
      className={`flex-row items-center rounded-card p-3.5 ${
        tone === "success" ? "bg-[rgba(74,222,128,0.10)]" : "bg-[rgba(59,130,246,0.10)]"
      }`}
    >
      <View
        className={`w-10 h-10 rounded-icon-square items-center justify-center mr-3 ${
          tone === "success" ? "bg-success" : "bg-accent"
        }`}
      >
        <Feather name={icon} size={18} color={colors.textPrimary} />
      </View>
      <View className="flex-1">
        <Text className="text-sm font-medium text-text-primary mb-0.5">{title}</Text>
        <Text className="text-[11.5px] text-text-dim leading-[15px]">{description}</Text>
      </View>
      {trailing}
    </Wrapper>
  );
}
