import { Pressable, Text, View } from "react-native";
import { formatDate } from "../../../../lib/format";
import { Feather } from "@expo/vector-icons";
import { colors } from "../../../../theme/colors";
import type { DeviceRowProps } from "./types";

export function DeviceRow({ device, isLast, onUnpair }: DeviceRowProps) {
  return (
    <View className={`flex-row items-center p-3.5 gap-3 ${isLast ? "" : "border-b border-hairline-faint"}`}>
      <View className="w-9 h-9 rounded-icon-square bg-[rgba(59,130,246,0.14)] items-center justify-center">
        <Feather name="tablet" size={16} color={colors.accentSoft} />
      </View>
      <View className="flex-1">
        <Text className="text-[13.5px] font-medium text-text-primary">{device.name}</Text>
        <Text className="text-[11.5px] text-text-faint mt-px">Paired {formatDate(device.pairedAt)}</Text>
      </View>
      <Pressable accessibilityRole="button" onPress={() => onUnpair(device)} hitSlop={8}>
        <Text className="text-[12.5px] text-error">Unpair</Text>
      </Pressable>
    </View>
  );
}
