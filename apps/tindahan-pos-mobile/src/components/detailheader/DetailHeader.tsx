import { Text, View } from "react-native";
import { IconButton } from "../IconButton";
import type { DetailHeaderProps } from "./types";

/**
 * Back-arrow + title/subtitle + one trailing action -- shared by every
 * Owner drill-down screen (Today's Sales, Insights, Restock, Utang).
 */
export function DetailHeader({ title, subtitle, onBack, trailingIcon, trailingLabel, onTrailingPress }: DetailHeaderProps) {
  return (
    <View className="flex-row items-center mb-4.5 gap-3">
      <IconButton icon="arrow-left" accessibilityLabel="Back" onPress={onBack} />
      <View className="flex-1">
        <Text className="text-lg font-medium text-text-primary">{title}</Text>
        <Text className="text-xs text-text-faint mt-0.5">{subtitle}</Text>
      </View>
      {trailingIcon && (
        <IconButton icon={trailingIcon} accessibilityLabel={trailingLabel ?? "Action"} onPress={onTrailingPress} />
      )}
    </View>
  );
}
