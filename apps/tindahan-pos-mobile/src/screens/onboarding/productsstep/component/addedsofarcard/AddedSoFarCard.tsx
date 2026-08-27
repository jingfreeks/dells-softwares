import { Text, View } from "react-native";
import { Card } from "../../../../../components/card";
import { PESO } from "../../../../../lib/money";
import type { AddedSoFarCardProps } from "./types";

export function AddedSoFarCard({ totalCount, previewProducts, remainingCount }: AddedSoFarCardProps) {
  return (
    <Card padding={14} style={{ marginBottom: 18 }}>
      <View className="flex-row justify-between mb-[11px]">
        <Text className="text-[13.5px] font-medium text-text-primary">Added so far</Text>
        <Text className="text-[13px] text-success">{totalCount} products</Text>
      </View>
      <View className="flex-row flex-wrap gap-2 mb-[13px]">
        {previewProducts.map((product) => (
          <View key={product.id} className="rounded-lg h-7 px-2.5 justify-center bg-panel-strong">
            <Text className="text-[11.5px] text-text-dim">
              {product.name} · {PESO.format(product.price)}
            </Text>
          </View>
        ))}
        {remainingCount > 0 && (
          <View className="rounded-lg h-7 px-2.5 justify-center bg-panel-strong">
            <Text className="text-[11.5px] text-text-dim">+{remainingCount} more</Text>
          </View>
        )}
      </View>
    </Card>
  );
}
