import { Pressable, Text, TextInput, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { colors } from "../../../../../theme/colors";
import type { DiscountSectionProps } from "./types";

export function DiscountSection({
  discountEnabled,
  discountType,
  discountValueText,
  onToggleDiscount,
  onDiscountTypeChange,
  onDiscountValueChange,
}: DiscountSectionProps) {
  if (!discountEnabled) {
    return (
      <Pressable accessibilityRole="button" onPress={onToggleDiscount}>
        <Text className="text-[13px] text-accent-soft font-medium mb-2.5">+ Add discount</Text>
      </Pressable>
    );
  }

  return (
    <View className="flex-row items-center gap-2 mb-2.5">
      <View className="flex-row border border-hairline rounded-lg overflow-hidden">
        <Pressable
          onPress={() => onDiscountTypeChange("percentage")}
          className={`px-3 py-2 ${discountType === "percentage" ? "bg-accent" : ""}`}
        >
          <Text className={`text-[13px] ${discountType === "percentage" ? "text-text-primary" : "text-text-dim"}`}>%</Text>
        </Pressable>
        <Pressable
          onPress={() => onDiscountTypeChange("flat")}
          className={`px-3 py-2 ${discountType === "flat" ? "bg-accent" : ""}`}
        >
          <Text className={`text-[13px] ${discountType === "flat" ? "text-text-primary" : "text-text-dim"}`}>₱</Text>
        </Pressable>
      </View>
      <TextInput
        accessibilityLabel="Discount value"
        placeholder={discountType === "percentage" ? "10" : "50"}
        placeholderTextColor={colors.textMuted}
        keyboardType="decimal-pad"
        value={discountValueText}
        onChangeText={onDiscountValueChange}
        className="flex-1 border border-hairline bg-panel-strong rounded-lg px-3 py-2 text-sm text-text-primary"
      />
      <Pressable accessibilityLabel="Remove discount" onPress={onToggleDiscount}>
        <Feather name="x" size={16} color={colors.textFaint} />
      </Pressable>
    </View>
  );
}
