import { Text, View } from "react-native";
import { Avatar } from "../../../../components/avatar";
import { PESO } from "../../../../lib/money";
import { initialsOf } from "../../../../lib/format";
import { useUtangRow } from "./hooks";
import type { UtangRowProps } from "./types";

export function UtangRow({ customer, days }: UtangRowProps) {
  const { tone, isBad, description } = useUtangRow({ customer, days });

  return (
    <View className="flex-row items-center py-2.5">
      <Avatar initial={initialsOf(customer.name)} size={34} shape="circle" tone={tone} />
      <View className="flex-1 ml-3 mr-2">
        <Text className="text-[13.5px] font-medium text-text-primary mb-0.5" numberOfLines={1}>
          {customer.name}
        </Text>
        <Text className={`text-[11.5px] ${isBad ? "text-error" : "text-text-faint"}`}>{description}</Text>
      </View>
      <Text className={`text-[13.5px] font-medium ${isBad ? "text-error" : "text-text-primary"}`}>
        {PESO.format(customer.balance)}
      </Text>
    </View>
  );
}
