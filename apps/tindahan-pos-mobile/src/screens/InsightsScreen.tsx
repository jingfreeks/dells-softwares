import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Card } from "../components/Card";
import { DetailHeader } from "../components/DetailHeader";
import { ScreenContainer } from "../components/ScreenContainer";
import { useStoreData } from "../lib/storeData";
import { bestSellers, completedSales, salesByCategory } from "../lib/reports";
import { dayBounds } from "../lib/format";
import { PESO } from "../lib/money";
import { colors } from "../theme/colors";

// A fixed blue-family palette (matching the design reference's category
// bar) cycled across however many categories a store actually has.
const CATEGORY_COLORS = ["#3B82F6", "#60A5FA", "#93C5FD", "#2563EB", "#1D4ED8", "#7DA9F0", "#4C8DFF", "#8AB6FF"];

interface InsightsScreenProps {
  onBack?: () => void;
}

/**
 * Sales Insights drill-down (design mockup: mobile-owner-insights.html):
 * best sellers + sales by category. Date chip fixed to "Today" for this
 * pass, same scoping note as TodaysSalesScreen.
 */
export function InsightsScreen({ onBack }: InsightsScreenProps) {
  const { sales, products } = useStoreData();

  const { topSellers, categoryRows, categoryGrandTotal } = useMemo(() => {
    const { start, end } = dayBounds(new Date());
    const todays = completedSales(sales.filter((s) => {
      const t = new Date(s.timestamp);
      return t >= start && t <= end;
    }));
    const top = bestSellers(todays, products, 5);
    const categories = salesByCategory(todays, products);
    return { topSellers: top, categoryRows: categories.rows, categoryGrandTotal: categories.grandTotal };
  }, [sales, products]);

  const maxQuantity = topSellers[0]?.quantity ?? 0;

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

      <Text style={styles.sectionTitle}>Best sellers</Text>
      {topSellers.length === 0 ? (
        <Text style={styles.emptyText}>No sales yet today.</Text>
      ) : (
        <Card padding={14}>
          {topSellers.map((seller, index) => (
            <View key={seller.productId} style={index < topSellers.length - 1 ? styles.mb13 : undefined}>
              <View style={styles.sellerRow}>
                <Text style={styles.sellerName} numberOfLines={1}>
                  {seller.name}
                </Text>
                <Text style={styles.sellerCount}>{seller.quantity} sold</Text>
              </View>
              <View style={styles.barTrack}>
                <View
                  style={[
                    styles.barFill,
                    { width: `${maxQuantity > 0 ? (seller.quantity / maxQuantity) * 100 : 0}%` },
                  ]}
                />
              </View>
            </View>
          ))}
        </Card>
      )}

      <Text style={[styles.sectionTitle, styles.mt20]}>Sales by category</Text>
      {categoryRows.length === 0 ? (
        <Text style={styles.emptyText}>No sales yet today.</Text>
      ) : (
        <Card padding={14}>
          <View style={styles.stackedBar}>
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
            <View key={row.category} style={styles.legendRow}>
              <View style={styles.legendLabel}>
                <View style={[styles.dot, { backgroundColor: CATEGORY_COLORS[index % CATEGORY_COLORS.length] }]} />
                <Text style={styles.legendText}>{row.category}</Text>
              </View>
              <Text style={styles.legendValue}>{PESO.format(row.total)}</Text>
            </View>
          ))}
        </Card>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  sectionTitle: { fontSize: 16, fontWeight: "500", color: colors.textPrimary, marginBottom: 10 },
  mt20: { marginTop: 20 },
  mb13: { marginBottom: 13 },
  sellerRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  sellerName: { flex: 1, fontSize: 13.5, color: colors.textStrong, marginRight: 8 },
  sellerCount: { fontSize: 11.5, color: colors.textFaint },
  barTrack: { height: 5, borderRadius: 3, backgroundColor: colors.hairline, overflow: "hidden" },
  barFill: { height: "100%", backgroundColor: colors.accent, borderRadius: 3 },
  stackedBar: { flexDirection: "row", height: 9, borderRadius: 5, overflow: "hidden", marginBottom: 13 },
  legendRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 5 },
  legendLabel: { flexDirection: "row", alignItems: "center", flex: 1 },
  dot: { width: 8, height: 8, borderRadius: 2, marginRight: 8 },
  legendText: { fontSize: 13, color: colors.textDim },
  legendValue: { fontSize: 13, color: colors.textStrong },
  emptyText: { fontSize: 13, color: colors.textFaint, textAlign: "center", paddingVertical: 24 },
});
