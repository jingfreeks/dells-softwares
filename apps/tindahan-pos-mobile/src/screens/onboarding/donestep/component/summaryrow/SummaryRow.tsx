import { Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { colors } from "../../../../../theme/colors";
import type { SummaryRowProps } from "./types";

export function SummaryRow({ title, detail }: SummaryRowProps) {
  return (
    <View className="flex-row gap-2.5 items-start py-[7px]">
      <Feather name="check-circle" size={17} color={colors.success} />
      <View className="flex-1">
        <Text className="text-[13.5px] text-text-primary">{title}</Text>
        <Text className="text-[11.5px] text-text-faint mt-px">{detail}</Text>
      </View>
    </View>
  );
}
