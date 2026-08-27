import { Text, View } from "react-native";
import { Card } from "../../components/Card";
import { DetailHeader } from "../../components/DetailHeader";
import { ScreenContainer } from "../../components/ScreenContainer";
import { PESO } from "../../lib/money";
import { useInsightsScreen } from "./hooks";
import { CATEGORY_COLORS } from "./types";
import type { InsightsScreenProps } from "./types";

/**
 * Sales Insights drill-down (design mockup: mobile-owner-insights.html):
 * best sellers + sales by category. Date chip fixed to "Today" for this
 * pass, same scoping note as TodaysSalesScreen.
 */
export function InsightsScreen({ onBack }: InsightsScreenProps) {
  const { topSellers, categoryRows, categoryGrandTotal, maxQuantity } = useInsightsScreen();

  return (
    <ScreenContainer>
      <DetailHeader
        title="Sales insights"
        subtitle="Best sellers & sales by category"
        onBack={onBack}
        trailingIcon="download"
        trailingLabel="Export"
        onTrailingPress={() => {}}
      />

      <Text className="text-base font-medium text-text-primary mb-2.5">Best sellers</Text>
      {topSellers.length === 0 ? (
        <Text className="text-[13px] text-text-faint text-center py-6">No sales yet today.</Text>
      ) : (
        <Card padding={14}>
          {topSellers.map((seller, index) => (
            <View key={seller.productId} className={index < topSellers.length - 1 ? "mb-[13px]" : undefined}>
              <View className="flex-row justify-between mb-1.5">
                <Text className="flex-1 text-[13.5px] text-text-strong mr-2" numberOfLines={1}>
                  {seller.name}
                </Text>
                <Text className="text-[11.5px] text-text-faint">{seller.quantity} sold</Text>
              </View>
              <View className="h-[5px] rounded-[3px] bg-hairline overflow-hidden">
                <View
                  className="h-full bg-accent rounded-[3px]"
                  style={{ width: `${maxQuantity > 0 ? (seller.quantity / maxQuantity) * 100 : 0}%` }}
                />
              </View>
            </View>
          ))}
        </Card>
      )}

      <Text className="text-base font-medium text-text-primary mb-2.5 mt-5">Sales by category</Text>
      {categoryRows.length === 0 ? (
        <Text className="text-[13px] text-text-faint text-center py-6">No sales yet today.</Text>
      ) : (
        <Card padding={14}>
          <View className="flex-row h-[9px] rounded-[5px] overflow-hidden mb-[13px]">
            {categoryRows.map((row, index) => (
              <View
                key={row.category}
                style={{
                  width: `${categoryGrandTotal > 0 ? (row.total / categoryGrandTotal) * 100 : 0}%`,
                  backgroundColor: CATEGORY_COLORS[index % CATEGORY_COLORS.length],
                }}
              />
            ))}
          </View>
          {categoryRows.map((row, index) => (
            <View key={row.category} className="flex-row justify-between items-center py-[5px]">
              <View className="flex-row items-center flex-1">
                <View
                  className="w-2 h-2 rounded-[2px] mr-2"
                  style={{ backgroundColor: CATEGORY_COLORS[index % CATEGORY_COLORS.length] }}
                />
                <Text className="text-[13px] text-text-dim">{row.category}</Text>
              </View>
              <Text className="text-[13px] text-text-strong">{PESO.format(row.total)}</Text>
            </View>
          ))}
        </Card>
      )}
    </ScreenContainer>
  );
}
