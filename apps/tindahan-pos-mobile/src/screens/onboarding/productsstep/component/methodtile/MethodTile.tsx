import { ActivityIndicator, Pressable, Text } from "react-native";
import { Feather } from "@expo/vector-icons";
import { colors } from "../../../../../theme/colors";
import type { MethodTileProps } from "./types";

export function MethodTile({ icon, label, loading, disabled, onPress }: MethodTileProps) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled}
      className="flex-1 bg-panel border border-hairline rounded-card p-3.5 items-center"
    >
      {loading ? <ActivityIndicator color={colors.textFaint} /> : <Feather name={icon} size={18} color={colors.textFaint} />}
      <Text className="text-[11.5px] text-text-dim mt-[7px] text-center">{label}</Text>
    </Pressable>
  );
}
