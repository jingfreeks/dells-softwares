import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MetricCard } from "../../components/metriccard";
import { ListRow } from "../../components/listrow";
import { SectionHeader } from "../../components/sectionheader";
import { ScreenContainer } from "../../components/screencontainer";
import { formatRelativeTime, greetingForHour } from "../../lib/format";
import { PESO } from "../../lib/money";
import { useDemoStoreScreen } from "./hooks";
import type { DemoStoreScreenProps } from "./types";

/**
 * Explore Demo Store (mobile-26-demo-store-banner 2.html) -- an isolated,
 * read-only sample sari-sari store. Every figure comes from public.demo_*
 * rows (see migrations 20260815139000/140000/141000), never hardcoded, and
 * nothing on this screen writes anywhere.
 */
export function DemoStoreScreen({ onExitDemo }: DemoStoreScreenProps) {
  const {
    loading,
    error,
    now,
    totalSales,
    lowStockCount,
    totalUtang,
    customersWithBalance,
    recentSales,
    bestSellers,
    restockRows,
  } = useDemoStoreScreen();

  const maxSold = bestSellers[0]?.soldCount ?? 1;
  // This banner is the topmost element on screen (mounted above
  // ScreenContainer, not inside it), so it needs the safe-area top inset
  // itself -- same fix as TrialBanner, which sits above ScreenContainer too.
  const insets = useSafeAreaInsets();

  return (
    <View className="flex-1">
      <View
        style={{
          backgroundColor: "rgba(76,141,255,.10)",
          borderBottomColor: "rgba(76,141,255,.30)",
          paddingTop: insets.top + 10,
        }}
        className="border-b px-3.5 pb-2.5"
        accessibilityRole="summary"
      >
        <View className="flex-row items-center gap-2 mb-1.5">
          <View className="bg-accent rounded-pill px-2 py-0.5">
            <Text className="text-[9.5px] font-medium text-text-primary tracking-[0.4px]">DEMO STORE</Text>
          </View>
          <Text className="text-[11px] text-accent-soft flex-1">You&apos;re exploring with sample data.</Text>
        </View>
        <Pressable
          onPress={onExitDemo}
          accessibilityRole="button"
          className="h-8 rounded-button bg-accent items-center justify-center"
        >
          <Text className="text-xs font-medium text-text-primary">Start My Free Trial</Text>
        </Pressable>
      </View>

      <ScreenContainer reserveTabBarSpace>
        <Text className="text-[19px] font-medium text-text-primary mb-0.5">{greetingForHour(now)}</Text>
        <Text className="text-xs text-text-faint mb-4.5">Aling Nena&apos;s Sari-Sari Store · Demo data</Text>

        {loading && <Text className="text-[13px] text-text-faint">Loading sample data…</Text>}
        {error && (
          <Text accessibilityRole="alert" className="text-error text-[13px]">
            {error}
          </Text>
        )}

        {!loading && !error && (
          <>
            <View className="flex-row flex-wrap gap-[11px]">
              <MetricCard label="Today's Sales" value={PESO.format(totalSales)} />
              <MetricCard label="Transactions" value={String(recentSales.length)} />
              <MetricCard
                label="Low Stock"
                value={String(lowStockCount)}
                caption={lowStockCount > 0 ? "Restock today" : undefined}
                variant={lowStockCount > 0 ? "warning" : "default"}
              />
              <MetricCard label="Utang Out" value={PESO.format(totalUtang)} caption={`${customersWithBalance.length} customers`} />
            </View>

            <SectionHeader title="Recent sales" />
            <View className="bg-panel border border-hairline rounded-card px-3.5">
              {recentSales.map((sale, index) => (
                <View key={sale.id}>
                  <ListRow
                    icon="shopping-cart"
                    title={`${sale.itemCount} item${sale.itemCount === 1 ? "" : "s"}`}
                    subtitle={formatRelativeTime(sale.occurredAt, now)}
                    trailing={<Text className="text-[13.5px] font-medium text-text-primary">{PESO.format(sale.total)}</Text>}
                  />
                  {index < recentSales.length - 1 && <View className="h-px bg-hairline-faint" />}
                </View>
              ))}
            </View>

            <SectionHeader title="Best sellers" />
            <View className="bg-panel border border-hairline rounded-card p-3.5">
              {bestSellers.map((product, index) => (
                <View key={product.id} className={index < bestSellers.length - 1 ? "mb-2.5" : ""}>
                  <View className="flex-row justify-between mb-1">
                    <Text className="text-[13px] text-text-dim">{product.name}</Text>
                    <Text className="text-[11px] text-text-faint">{product.soldCount} sold</Text>
                  </View>
                  <View className="h-1.5 rounded-[2px] bg-[rgba(255,255,255,0.08)] overflow-hidden">
                    <View
                      className="h-full rounded-[2px] bg-accent"
                      style={{ width: `${Math.max(4, (product.soldCount / maxSold) * 100)}%` }}
                    />
                  </View>
                </View>
              ))}
            </View>

            {restockRows.length > 0 && (
              <>
                <SectionHeader title="Needs restocking" />
                <View className="bg-panel border border-hairline rounded-card px-3.5">
                  {restockRows.map((row, index) => (
                    <View key={row.productId}>
                      <View className="flex-row items-center py-2.5">
                        <View className="flex-1 mr-2">
                          <Text className="text-[13.5px] font-medium text-text-primary mb-0.5">{row.productName}</Text>
                          <Text className="text-[11.5px] text-text-faint">{row.stock} left</Text>
                        </View>
                        <View className="rounded-chip bg-accent px-3.5 py-[7px]">
                          <Text className="text-xs font-medium text-text-primary">Order {row.orderSuggestion}</Text>
                        </View>
                      </View>
                      {index < restockRows.length - 1 && <View className="h-px bg-hairline-faint" />}
                    </View>
                  ))}
                </View>
              </>
            )}
          </>
        )}
      </ScreenContainer>
    </View>
  );
}
