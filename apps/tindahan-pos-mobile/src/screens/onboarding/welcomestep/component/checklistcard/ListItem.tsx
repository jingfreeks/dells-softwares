import { Text, View } from "react-native";
import type { ListItemProps } from "./types";

export function ListItem({ item }: ListItemProps) {
  return (
    <View className="flex-row items-center py-2.5 gap-3">
      <View className="w-7 h-7 rounded-full bg-[rgba(59,130,246,0.14)] border border-[rgba(76,141,255,0.30)] items-center justify-center">
        <Text className="text-xs font-medium text-accent-soft">{item.n}</Text>
      </View>
      <View className="flex-1">
        <Text className="text-[13.5px] font-medium text-text-primary">{item.title}</Text>
        <Text className="text-[11.5px] text-text-faint mt-px">{item.detail}</Text>
      </View>
      <Text className="text-[11.5px] text-text-faint">{item.time}</Text>
    </View>
  );
}
