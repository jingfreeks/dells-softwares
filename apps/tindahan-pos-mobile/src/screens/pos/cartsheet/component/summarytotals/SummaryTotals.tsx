import { Text, View } from "react-native";
import { PESO } from "../../../../../lib/money";
import type { SummaryTotalsProps } from "./types";

export function SummaryTotals({ subtotal, discountAmount, total }: SummaryTotalsProps) {
  return (
    <>
      {discountAmount > 0 && (
        <>
          <View className="flex-row justify-between py-0.5">
            <Text className="text-[13px] text-text-dim">Subtotal</Text>
            <Text className="text-[13px] text-text-dim">{PESO.format(subtotal)}</Text>
          </View>
          <View className="flex-row justify-between py-0.5 border-b border-hairline-faint pb-2.5 mb-1">
            <Text className="text-[13px] text-text-dim">Discount</Text>
            <Text className="text-[13px] text-success">−{PESO.format(discountAmount)}</Text>
          </View>
        </>
      )}

      <View className="flex-row justify-between items-baseline mt-1.5 mb-3.5">
        <Text className="text-base font-medium text-text-primary">Total</Text>
        <Text className="text-[30px] font-medium text-text-strong">{PESO.format(total)}</Text>
      </View>
    </>
  );
}
