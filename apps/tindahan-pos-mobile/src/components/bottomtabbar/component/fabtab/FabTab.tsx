import { Pressable, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { colors } from "../../../../theme/colors";
import type { FabTabProps } from "./types";

export function FabTab({ tab, onPress }: FabTabProps) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={tab.label} onPress={onPress} className="items-center mt-[-22px]">
      <View className="w-[52px] h-[52px] rounded-pill bg-accent items-center justify-center border-[3px] border-panel-surface">
        <Feather name={tab.icon} size={22} color={colors.textPrimary} />
      </View>
    </Pressable>
  );
}
