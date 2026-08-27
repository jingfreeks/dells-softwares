import { Text, TextInput, View } from "react-native";
import { PESO } from "../../../../../../../lib/money";
import { denominationSubtotal } from "../../../../../../../lib/onboarding";
import type { DenominationRowProps } from "./types";

export function DenominationRow({ def, quantity, onQuantityChange }: DenominationRowProps) {
  return (
    <View className="flex-row items-center gap-[9px] mb-[9px]">
      <Text className="w-[60px] text-text-dim text-[13px]">{def.label}</Text>
      <TextInput
        accessibilityLabel={`${def.label} count`}
        keyboardType="number-pad"
        value={String(quantity)}
        onChangeText={(text) => onQuantityChange(def.key, Number(text) || 0)}
        className="flex-1 h-[38px] rounded-input border border-hairline bg-panel-strong text-text-primary text-center text-[15px]"
      />
      <Text className="w-[60px] text-right text-xs text-text-faint">{PESO.format(denominationSubtotal(def, quantity))}</Text>
    </View>
  );
}
