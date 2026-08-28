import { Pressable, Text } from "react-native";
import { Feather } from "@expo/vector-icons";
import { colors } from "../../../../theme/colors";
import type { TabProps } from "./types";

export function Tab({ tab, active, onPress }: TabProps) {
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      className="items-center gap-1 min-w-11"
    >
      <Feather name={tab.icon} size={18} color={active ? colors.accentSoft : colors.textFaint} />
      <Text className={`text-[10.5px] ${active ? "text-accent-soft font-medium" : "text-text-faint"}`}>
        {tab.label}
      </Text>
    </Pressable>
  );
}
