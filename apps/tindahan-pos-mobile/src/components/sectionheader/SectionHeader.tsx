import { Pressable, Text, View } from "react-native";
import type { SectionHeaderProps } from "./types";

/** Section title + optional "See all" link (§5 M-004, §9). */
export function SectionHeader({ title, onSeeAllPress }: SectionHeaderProps) {
  return (
    <View className="flex-row items-center justify-between mb-2.5 mt-5">
      <Text className="text-base font-medium text-text-primary">{title}</Text>
      {onSeeAllPress && (
        <Pressable onPress={onSeeAllPress} hitSlop={8}>
          <Text className="text-[12.5px] font-medium text-accent-soft">See all</Text>
        </Pressable>
      )}
    </View>
  );
}
