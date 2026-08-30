import { Text, TextInput, View } from "react-native";
import { colors } from "../../../../../theme/colors";
import type { QrPaymentProps } from "./types";

export function QrPayment({ referenceNo, onReferenceNoChange }: QrPaymentProps) {
  return (
    <View className="mt-3 mb-3.5">
      <Text className="text-[12.5px] text-text-dim mb-1.5">GCash reference number</Text>
      <TextInput
        accessibilityLabel="GCash reference number"
        placeholder="e.g. 1234567890"
        placeholderTextColor={colors.textMuted}
        value={referenceNo}
        onChangeText={onReferenceNoChange}
        className="border border-hairline bg-panel-strong rounded-input px-3.5 py-3 text-base text-text-primary"
      />
    </View>
  );
}
