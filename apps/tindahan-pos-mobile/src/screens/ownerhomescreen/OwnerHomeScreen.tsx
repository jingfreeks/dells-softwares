import { Text, View } from "react-native";
import { ActionPill } from "../../components/actionpill";
import { Avatar } from "../../components/avatar";
import { BottomTabBar } from "../../components/BottomTabBar";
import { IconButton } from "../../components/iconbutton";
import { InfoCallout } from "../../components/infocallout";
import { ListRow } from "../../components/listrow";
import { MetricCard } from "../../components/MetricCard";
import { ScreenContainer } from "../../components/screencontainer";
import { SectionHeader } from "../../components/sectionheader";
import { formatDayLabel, formatRelativeTime, greetingForHour, saleSummaryLabel } from "../../lib/format";
import { PESO } from "../../lib/money";
import { PAYMENT_ICON, PAYMENT_LABEL, useOwnerHomeScreen } from "./hooks";
import type { OwnerHomeScreenProps } from "./types";

/**
 * Owner Home (mobile-owner-home.html). Every figure below is computed from
 * real `useStoreData()` state -- the same reports.ts/inventory.ts/
 * customers.ts functions the Today's Sales/Restock/Utang drill-down
 * screens already use, so this dashboard and those screens can never
 * silently disagree with each other.
 */
export function OwnerHomeScreen(props: OwnerHomeScreenProps) {
  const { activeTab, onChangeTab, onOpenTodaysSales, onOpenRestock } = props;
  const {
    store,
    activeCashier,
    now,
    todaysTotal,
    transactionCount,
    avgBasket,
    salesChangePercent,
    restockRows,
    customersWithBalance,
    utangOutstanding,
    recentSales,
    attentionRows,
  } = useOwnerHomeScreen(props);

  return (
    <View className="flex-1">
      <ScreenContainer reserveTabBarSpace>
        <View className="flex-row items-center mb-4.5">
          <Avatar initial={(store?.name ?? "T")[0]} />
          <View className="flex-1 ml-3">
            <Text className="text-[19px] font-medium text-text-primary">{greetingForHour(now)}</Text>
            <Text className="text-xs text-text-faint mt-0.5">
              {store?.name ?? "Store"} · {formatDayLabel(now)}
            </Text>
          </View>
          <IconButton icon="bell" accessibilityLabel="Notifications" onPress={() => {}} />
        </View>

        <View className="flex-row flex-wrap gap-[11px]">
          <MetricCard
            label="Today's Sales"
            value={PESO.format(todaysTotal)}
            caption={
              salesChangePercent !== null
                ? `${salesChangePercent >= 0 ? "▲" : "▼"} ${Math.abs(salesChangePercent)}% vs yesterday`
                : undefined
            }
            variant={salesChangePercent !== null && salesChangePercent >= 0 ? "positive" : "default"}
          />
          <MetricCard
            label="Transactions"
            value={String(transactionCount)}
            caption={transactionCount > 0 ? `${PESO.format(avgBasket)} average` : undefined}
          />
          <MetricCard
            label="Low Stock"
            value={String(restockRows.length)}
            caption={restockRows.length > 0 ? "Restock today" : undefined}
            variant={restockRows.length > 0 ? "warning" : "default"}
          />
          <MetricCard label="Utang Out" value={PESO.format(utangOutstanding)} caption={`${customersWithBalance.length} customers`} />
        </View>

        {activeCashier && (
          <View className="mt-3.5">
            <InfoCallout icon="dollar-sign" tone="success" title="Register is open" description={`${activeCashier.name} · on this device`} />
          </View>
        )}

        {attentionRows.length > 0 && (
          <>
            <SectionHeader title="Needs your attention" onSeeAllPress={onOpenRestock} />
            <View className="bg-panel border border-hairline rounded-card px-3.5">
              {attentionRows.map((row, index) => (
                <View key={row.key}>
                  <ListRow
                    icon={row.icon}
                    tone={row.tone}
                    title={row.title}
                    subtitle={row.subtitle}
                    trailing={<ActionPill label={row.actionLabel} onPress={row.onPress} />}
                  />
                  {index < attentionRows.length - 1 && <View className="h-px bg-hairline-faint" />}
                </View>
              ))}
            </View>
          </>
        )}

        <SectionHeader title="Recent sales" onSeeAllPress={onOpenTodaysSales} />
        {recentSales.length === 0 ? (
          <Text className="text-[13px] text-text-faint py-3">No sales yet today.</Text>
        ) : (
          <View className="bg-panel border border-hairline rounded-card px-3.5">
            {recentSales.map((sale, index) => (
              <View key={sale.id}>
                <ListRow
                  icon={PAYMENT_ICON[sale.paymentType]}
                  tone={sale.paymentType === "credit" ? "warning" : "default"}
                  title={saleSummaryLabel(sale.items)}
                  subtitle={`${formatRelativeTime(sale.timestamp, now)} · ${PAYMENT_LABEL[sale.paymentType]}`}
                  trailing={<Text className="text-[13.5px] font-medium text-text-primary">{PESO.format(sale.total)}</Text>}
                />
                {index < recentSales.length - 1 && <View className="h-px bg-hairline-faint" />}
              </View>
            ))}
          </View>
        )}
      </ScreenContainer>

      <BottomTabBar active={activeTab} onChange={onChangeTab} />
    </View>
  );
}
