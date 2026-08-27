import { Text, View } from "react-native";
import { Card } from "../../../../../components/card";
import { formatDaysLeft } from "./hooks";
import type { PreviewCardProps } from "./types";

export function PreviewCard({ preview }: PreviewCardProps) {
  return (
    <Card padding={14} style={{ marginBottom: 12 }}>
      <View className="flex-row justify-between">
        <Text className="text-[13px] text-text-primary">Today you&apos;d be warned about</Text>
        <View className="bg-[rgba(251,191,36,0.16)] rounded-pill px-2.5 py-[3px]">
          <Text className="text-[11px] text-warning font-medium">{preview.affectedCount} items</Text>
        </View>
      </View>
      <View className="flex-row flex-wrap gap-2 mt-[11px]">
        {preview.items.slice(0, 4).map((item) => (
          <View
            key={item.productId}
            className={`rounded-lg h-7 px-2.5 justify-center ${
              item.daysOfStockLeft <= 0 ? "bg-[rgba(248,113,113,0.12)]" : "bg-[rgba(251,191,36,0.10)]"
            }`}
          >
            <Text className="text-[11.5px] text-text-dim">
              {item.productName} · {formatDaysLeft(item.daysOfStockLeft)}
            </Text>
          </View>
        ))}
      </View>
    </Card>
  );
}
