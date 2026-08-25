import { useMemo } from "react";
import { Share, StyleSheet, Text, View } from "react-native";
import { BottomTabBar } from "../components/BottomTabBar";
import { Card } from "../components/Card";
import { DetailHeader } from "../components/DetailHeader";
import { InfoCallout } from "../components/InfoCallout";
import { ListRow } from "../components/ListRow";
import { MetricCard } from "../components/MetricCard";
import { ScreenContainer } from "../components/ScreenContainer";
import { useStoreData } from "../lib/storeData";
import { completedSales } from "../lib/reports";
import { buildRestockRows, computeRestockSuggestions, lowStockProducts, type RestockRow } from "../lib/inventory";
import { colors } from "../theme/colors";

interface RestockScreenProps {
  onBack?: () => void;
  activeTab: string;
  onChangeTab: (tab: string) => void;
}

function rowDescription(row: RestockRow): string {
  if (row.isOut) {
    return row.avgDailySales !== null ? `0 left · sells ~${row.avgDailySales}/day` : "0 left";
  }
  if (row.daysOfStockLeft !== null) {
    const label = row.daysOfStockLeft < 1 ? "out in less than a day" : `out in ~${Math.round(row.daysOfStockLeft)} day${Math.round(row.daysOfStockLeft) === 1 ? "" : "s"}`;
    return `${row.stock} left · ${label}`;
  }
  return `${row.stock} left`;
}

/**
 * Restock report (design mockup: mobile-owner-restock.html). "Send the
 * list" opens the native Share sheet with a plain-text order summary --
 * real, working, and generic (not addressed to a named supplier, since
 * mobile doesn't fetch `suppliers` yet -- see lib/inventory.ts's
 * buildRestockRows doc comment for the OUT/CRITICAL/LOW judgment call).
 */
export function RestockScreen({ onBack, activeTab, onChangeTab }: RestockScreenProps) {
  const { products, sales } = useStoreData();

  const rows = useMemo(() => {
    const low = lowStockProducts(products);
    const suggestions = computeRestockSuggestions(products, completedSales(sales));
    return buildRestockRows(low, suggestions);
  }, [products, sales]);

  const outCount = rows.filter((r) => r.severity === "out").length;
  const criticalCount = rows.filter((r) => r.severity === "critical").length;
  const lowCount = rows.filter((r) => r.severity === "low").length;

  async function handleSendList() {
    const lines = rows.map((r) => `${r.productName} — order ${r.suggestedQuantity ?? "?"}`);
    await Share.share({
      message: `Restock order — ${rows.length} product(s)\n\n${lines.join("\n")}`,
    });
  }

  return (
    <View style={styles.flex}>
      <ScreenContainer reserveTabBarSpace>
        <DetailHeader
          title="Needs restocking"
          subtitle={`${rows.length} products · most urgent first`}
          onBack={onBack}
          trailingIcon="printer"
          trailingLabel="Print"
          onTrailingPress={() => {}}
        />

        <View style={styles.grid}>
          <MetricCard label="Out" value={String(outCount)} variant="danger" flexBasis="31%" />
          <MetricCard label="Critical" value={String(criticalCount)} variant="warning" flexBasis="31%" />
          <MetricCard label="Low" value={String(lowCount)} flexBasis="31%" />
        </View>

        {rows.length === 0 ? (
          <Text style={styles.emptyText}>Everything's well stocked.</Text>
        ) : (
          <Card>
            {rows.map((row, index) => (
              <View key={row.productId}>
                <ListRow
                  icon={row.isOut ? "alert-circle" : "box"}
                  tone={row.isOut ? "error" : "warning"}
                  title={row.productName}
                  subtitle={rowDescription(row)}
                  trailing={
                    row.suggestedQuantity !== null ? (
                      <Text style={styles.orderPill}>Order {row.suggestedQuantity}</Text>
                    ) : undefined
                  }
                />
                {index < rows.length - 1 && <View style={styles.rowDivider} />}
              </View>
            ))}
          </Card>
        )}

        {rows.length > 0 && (
          <View style={styles.mt14}>
            <InfoCallout
              icon="truck"
              title="Send the list"
              description="Opens a message with quantities filled in"
              onPress={handleSendList}
            />
          </View>
        )}
      </ScreenContainer>

      <BottomTabBar active={activeTab} onChange={onChangeTab} />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  grid: { flexDirection: "row", gap: 8, marginBottom: 14 },
  rowDivider: { height: 1, backgroundColor: colors.hairlineFaint },
  orderPill: {
    fontSize: 12,
    fontWeight: "500",
    color: colors.textPrimary,
    backgroundColor: colors.accent,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    overflow: "hidden",
  },
  mt14: { marginTop: 14 },
  emptyText: { fontSize: 13, color: colors.textFaint, textAlign: "center", paddingVertical: 24 },
});
