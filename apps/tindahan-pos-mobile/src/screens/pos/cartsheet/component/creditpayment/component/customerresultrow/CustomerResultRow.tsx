import { Pressable, Text } from "react-native";
import { PESO } from "../../../../../../../lib/money";
import type { CustomerResultRowProps } from "./types";

export function CustomerResultRow({ customer, onSelect }: CustomerResultRowProps) {
  return (
    <Pressable
      className="py-2.5 px-3 border-b border-hairline-faint"
      onPress={() => onSelect(customer)}
    >
      <Text className="text-[13.5px] font-medium text-text-primary">{customer.name}</Text>
      <Text className="text-[11.5px] text-text-faint mt-0.5">{PESO.format(customer.balance)}</Text>
    </Pressable>
  );
}
