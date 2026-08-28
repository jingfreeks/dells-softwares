import { Pressable, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useListRow } from "./hooks";
import type { ListRowProps } from "./types";

/**
 * One row shape shared by "Needs your attention" and "Recent sales" (§5
 * M-004, §9) -- icon square, title/subtitle, and a variable trailing slot.
 */
export function ListRow({ icon, tone = "default", title, subtitle, trailing, onPress }: ListRowProps) {
  const Wrapper = onPress ? Pressable : View;
  const { iconColor, iconBackground } = useListRow(tone);

  return (
    <Wrapper onPress={onPress} className="flex-row items-center py-2.5">
      <View
        className="w-9 h-9 rounded-icon-square items-center justify-center mr-3"
        style={{ backgroundColor: iconBackground }}
      >
        <Feather name={icon} size={16} color={iconColor} />
      </View>
      <View className="flex-1 mr-2">
        <Text className="text-[13.5px] font-medium text-text-primary mb-0.5" numberOfLines={1}>
          {title}
        </Text>
        <Text className="text-[11.5px] text-text-faint" numberOfLines={1}>
          {subtitle}
        </Text>
      </View>
      {trailing}
    </Wrapper>
  );
}
