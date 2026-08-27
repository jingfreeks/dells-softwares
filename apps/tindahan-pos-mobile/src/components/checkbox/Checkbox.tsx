import { Pressable, Text, View } from "react-native";
import type { CheckboxProps } from "./types";

/** Reusable labeled checkbox row, accessible as a checkbox with the label as its own tap target text. */
export function Checkbox({ checked, onToggle, label, children }: CheckboxProps) {
  return (
    <Pressable accessibilityRole="checkbox" accessibilityState={{ checked }} onPress={onToggle} className="flex-row items-start min-h-11">
      <View
        className={`w-5 h-5 rounded-[5px] border items-center justify-center mr-2.5 mt-0.5 ${
          checked ? "border-accent bg-accent" : "border-hairline"
        }`}
      >
        {checked && <View className="w-2 h-2 rounded-sm bg-text-primary" />}
      </View>
      {children ?? <Text className="flex-1 text-[13px] font-normal text-text-muted leading-[18px]">{label}</Text>}
    </Pressable>
  );
}
