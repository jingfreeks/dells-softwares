import { Pressable, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { Card } from "../../components/card";
import { DetailHeader } from "../../components/detailheader";
import { ListRow } from "../../components/listrow";
import { MetricCard } from "../../components/metriccard";
import { StackedBar } from "../../components/stackedbar";
import { ScreenContainer } from "../../components/screencontainer";
import { formatDayLabel, formatTime, saleSummaryLabel } from "../../lib/format";
import { PESO } from "../../lib/money";
import { colors } from "../../theme/colors";
import { PAYMENT_COLOR, PAYMENT_ICON, PAYMENT_LABEL, useTodaysSalesScreen } from "./hooks";
import type { TodaysSalesScreenProps } from "./types";

/**
 * Today's Sales drill-down (design mockup: mobile-owner-todays-sales.html).
 * The date chip is fixed to "Today" for this pass -- switching to another
 * day is a real feature (needs a date picker + fetchSalesInRange call) left
 * for a follow-up rather than faked here.
 */
export function TodaysSalesScreen({ onBack, storeName, onOpenInsights }: TodaysSalesScreenProps) {
  const {
    now,
    loading,
    todaysCompletedSales,
    totalSales,
    transactionCount,
    itemsSold,
    avgBasket,
    paymentMix,
    paymentMixTotal,
  } = useTodaysSalesScreen();

  return (
    <ScreenContainer>
      <DetailHeader
        title="Today's sales"
        subtitle={`${formatDayLabel(now)} · ${storeName}`}
        onBack={onBack}
        trailingIcon="download"
        trailingLabel="Export"
        onTrailingPress={() => {}}
      />

      <View className="flex-row flex-wrap gap-[11px] mb-3">
        <MetricCard label="Total sales" value={PESO.format(totalSales)} variant="highlight" />
        <MetricCard label="Transactions" value={String(transactionCount)} />
        <MetricCard label="Items sold" value={String(itemsSold)} />
        <MetricCard label="Avg basket" value={PESO.format(avgBasket)} />
      </View>

      {paymentMixTotal > 0 && (
        <Card padding={14} style={{ marginBottom: 14 }}>
          <StackedBar
            segments={paymentMix.map((p) => ({ fraction: p.total / paymentMixTotal, color: PAYMENT_COLOR[p.paymentType] }))}
          />
          <View className="mt-3">
            {paymentMix.map((p) => (
              <View key={p.paymentType} className="flex-row justify-between py-[3px]">
                <Text className={`text-[13px] ${p.paymentType === "credit" ? "text-warning" : "text-text-dim"}`}>
                  {PAYMENT_LABEL[p.paymentType]}
                </Text>
                <Text className={`text-[13px] ${p.paymentType === "credit" ? "text-warning" : "text-text-primary"}`}>
                  {PESO.format(p.total)}
                </Text>
              </View>
            ))}
          </View>
        </Card>
      )}

      {onOpenInsights && (
        <Pressable
          accessibilityRole="button"
          onPress={onOpenInsights}
          className="flex-row items-center justify-between py-2"
        >
          <Text className="text-[13px] text-accent-soft font-medium">See best sellers &amp; category breakdown</Text>
          <Feather name="chevron-right" size={16} color={colors.accentSoft} />
        </Pressable>
      )}

      <View className="flex-row justify-between items-center mt-5 mb-2.5">
        <Text className="text-base font-medium text-text-primary">Transactions</Text>
        <Text className="text-[11.5px] text-text-faint">
          {todaysCompletedSales.length} of {todaysCompletedSales.length}
        </Text>
      </View>

      {loading ? (
        <Text className="text-[13px] text-text-faint text-center py-6">Loading…</Text>
      ) : todaysCompletedSales.length === 0 ? (
        <Text className="text-[13px] text-text-faint text-center py-6">No sales yet today.</Text>
      ) : (
        <Card>
          {todaysCompletedSales.map((sale, index) => (
            <View key={sale.id}>
              <ListRow
                icon={PAYMENT_ICON[sale.paymentType]}
                title={saleSummaryLabel(sale.items)}
                subtitle={`${formatTime(sale.timestamp)} · ${sale.cashierName} · ${PAYMENT_LABEL[sale.paymentType]}`}
                trailing={<Text className="text-[13.5px] font-medium text-text-primary">{PESO.format(sale.total)}</Text>}
              />
              {index < todaysCompletedSales.length - 1 && <View className="h-px bg-hairline-faint" />}
            </View>
          ))}
        </Card>
      )}
    </ScreenContainer>
  );
}
