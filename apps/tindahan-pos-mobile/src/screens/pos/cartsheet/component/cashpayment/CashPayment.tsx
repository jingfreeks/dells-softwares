import { Pressable, Text, TextInput, View } from "react-native";
import { colors } from "../../../../../theme/colors";
import { PESO } from "../../../../../lib/money";
import { quickCashAmounts } from "../../../../../lib/pos";
import type { CashPaymentProps } from "./types";

export function CashPayment({ total, tendered, onTenderedChange, change }: CashPaymentProps) {
  const changeOk = change !== null && change >= 0;

  return (
    <>
      <View className="flex-row flex-wrap gap-[7px] mt-3 mb-3">
        {quickCashAmounts(total).map((amount) => {
          const on = Number(tendered) === amount;
          return (
            <Pressable
              key={amount}
              onPress={() => onTenderedChange(String(amount))}
              className={`basis-[23%] h-[42px] rounded-[11px] border items-center justify-center ${
                on ? "bg-[rgba(76,141,255,0.16)] border-[rgba(76,141,255,0.35)]" : "bg-panel border-hairline"
              }`}
            >
              <Text className={`text-[13px] ${on ? "text-accent-soft font-medium" : "text-text-dim"}`}>
                {PESO.format(amount)}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <TextInput
        accessibilityLabel="Amount tendered"
        keyboardType="decimal-pad"
        value={tendered}
        onChangeText={onTenderedChange}
        placeholderTextColor={colors.textMuted}
        className="border border-hairline bg-panel-strong rounded-input px-3.5 py-3 text-base text-text-primary"
      />
      <View
        className={`flex-row justify-between items-baseline rounded-card border px-3.5 py-[11px] mt-3 mb-3.5 ${
          changeOk ? "bg-[rgba(74,222,128,0.07)] border-[rgba(74,222,128,0.28)]" : "bg-panel border-hairline"
        }`}
      >
        <Text className="text-[13px] text-text-dim">Change</Text>
        <Text className="text-[22px] font-medium text-success">{change === null ? "—" : PESO.format(change)}</Text>
      </View>
    </>
  );
}
