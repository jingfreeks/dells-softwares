import { Text, View } from "react-native";
import { Card } from "../../../../../components/Card";
import { ListItem } from "./ListItem";
import type { ChecklistCardProps } from "./types";

export function ChecklistCard({ data }: ChecklistCardProps) {
  return (
    <Card padding={14} style={{ marginBottom: 18 }}>
      <View className="flex-row justify-between items-center mb-1">
        <Text className="text-[13.5px] font-medium text-text-primary">What we&apos;ll do</Text>
        <View className="bg-[rgba(59,130,246,0.14)] rounded-pill px-2.5 py-[3px]">
          <Text className="text-[11px] font-medium text-accent-soft">4 steps</Text>
        </View>
      </View>
      {data.map((item) => (
        <ListItem key={item.n} item={item} />
      ))}
    </Card>
  );
}
