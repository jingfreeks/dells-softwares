import { Text, View } from "react-native";
import { Toggle } from "../../../../../../../components/toggle";
import type { ToggleRowProps } from "./types";

export function ToggleRow({ title, detail, value, onToggle, isLast }: ToggleRowProps) {
  return (
    <View className={`flex-row items-center p-3.5 gap-3 ${isLast ? "" : "border-b border-hairline-faint"}`}>
      <View className="flex-1">
        <Text className="text-[13.5px] font-medium text-text-primary">{title}</Text>
        <Text className="text-[11.5px] text-text-faint mt-0.5">{detail}</Text>
      </View>
      <Toggle accessibilityLabel={title} value={value} onToggle={onToggle} />
    </View>
  );
}
