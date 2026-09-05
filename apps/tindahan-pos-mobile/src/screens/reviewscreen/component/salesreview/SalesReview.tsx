import { Text, View } from "react-native";
import { SectionHeader } from "../../../../components/sectionheader";
import { PESO } from "../../../../lib/money";
import type { ReviewBestSeller } from "../../../../lib/review";

interface SalesReviewProps {
  daily: { date: string; sales: number }[];
  bestSellers: ReviewBestSeller[];
}

/**
 * Sales trend and best sellers.
 *
 * Plain views rather than a charting library: one series, at most a month of
 * bars, on a phone. A dependency to draw that would cost more than it saves,
 * and the accessible summary below carries the real content anyway.
 */
export function SalesReview({ daily, bestSellers }: SalesReviewProps) {
  const peak = daily.reduce((max, d) => Math.max(max, d.sales), 0);
  const total = daily.reduce((sum, d) => sum + d.sales, 0);

  if (total <= 0) {
    return (
      <>
        <SectionHeader title="Sales Review" />
        <View className="bg-panel border border-hairline rounded-card p-3.5 mb-4">
          <Text className="text-[13px] text-text-faint">No sales in this period yet.</Text>
        </View>
      </>
    );
  }

  return (
    <>
      <SectionHeader title="Sales Review" />
      <View className="bg-panel border border-hairline rounded-card p-3.5 mb-4">
        <View
          className="flex-row items-end gap-[3px] h-16 mb-3.5"
          accessibilityRole="image"
          accessibilityLabel={`Daily sales: ${PESO.format(total)} across ${daily.length} days, highest ${PESO.format(peak)}`}
        >
          {daily.map((day) => (
            <View
              key={day.date}
              accessibilityElementsHidden
              className={day.sales > 0 ? "flex-1 rounded-sm bg-accent" : "flex-1 rounded-sm bg-hairline"}
              style={{
                // A day with no sales keeps a hairline column rather than
                // vanishing: an absent bar and a zero bar mean different
                // things, and only one of them is true.
                height: `${Math.max(peak > 0 ? (day.sales / peak) * 100 : 0, 2)}%`,
              }}
            />
          ))}
        </View>

        <Text className="text-[11px] font-medium tracking-[0.8px] uppercase text-text-faint mb-2">
          Best-selling products
        </Text>
        {bestSellers.map((product, index) => (
          <View key={product.id} className="flex-row items-center justify-between py-1">
            <View className="flex-row items-center gap-2.5 flex-1 pr-2">
              <Text className="text-[12px] text-text-faint">{index + 1}</Text>
              <Text className="text-[13px] text-text-secondary flex-1" numberOfLines={1}>
                {product.name}
              </Text>
            </View>
            <Text className="text-[13px] text-text-primary">{PESO.format(product.revenue)}</Text>
          </View>
        ))}
      </View>
    </>
  );
}
