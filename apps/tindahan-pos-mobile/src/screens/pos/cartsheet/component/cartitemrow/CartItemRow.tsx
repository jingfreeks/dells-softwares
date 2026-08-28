import { Pressable, Text, View } from "react-native";
import { PESO } from "../../../../../lib/money";
import { lineTotal } from "../../../../../lib/pos";
import type { CartItemRowProps } from "./types";

export function CartItemRow({ line, onIncrement, onDecrement }: CartItemRowProps) {
  return (
    <View className="flex-row items-center py-[11px] gap-2.5">
      <View className="flex-1">
        <Text className="text-[13.5px] text-text-primary">{line.product.name}</Text>
        <Text className="text-[11.5px] text-text-faint mt-px">{PESO.format(line.product.price)} each</Text>
      </View>
      <View className="flex-row items-center gap-[9px]">
        <Pressable
          accessibilityLabel={`Decrease quantity of ${line.product.name}`}
          onPress={() => onDecrement(line.product.id)}
          className="w-[26px] h-[26px] rounded-[13px] bg-panel-strong border border-hairline items-center justify-center"
        >
          <Text className="text-[15px] text-text-primary">−</Text>
        </Pressable>
        <Text className="text-[15px] text-text-primary min-w-4 text-center">{line.quantity}</Text>
        <Pressable
          accessibilityLabel={`Increase quantity of ${line.product.name}`}
          onPress={() => onIncrement(line.product.id)}
          className="w-[26px] h-[26px] rounded-[13px] bg-panel-strong border border-hairline items-center justify-center"
        >
          <Text className="text-[15px] text-text-primary">+</Text>
        </Pressable>
      </View>
      <Text className="text-[13.5px] text-text-primary min-w-[62px] text-right">
        {PESO.format(lineTotal(line.product, line.quantity))}
      </Text>
    </View>
  );
}
