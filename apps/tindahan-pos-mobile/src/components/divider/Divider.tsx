import { Text, View } from "react-native";
import type { DividerProps } from "./types";

export function Divider({ label }: DividerProps) {
  // `flex: 1` only means "thin line, full width" inside the row below --
  // used bare (no label), it has no row to size against and would instead
  // grow to fill the parent column's height. Give it a fixed width instead.
  if (!label) return <View className="w-full h-px bg-hairline my-4" />;

  return (
    <View className="flex-row items-center my-4">
      <View className="flex-1 h-px bg-hairline" />
      <Text className="mx-3 text-[11.5px] font-normal text-text-faint">{label}</Text>
      <View className="flex-1 h-px bg-hairline" />
    </View>
  );
}
