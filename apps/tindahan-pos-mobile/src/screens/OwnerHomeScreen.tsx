import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { ActionPill } from "../components/ActionPill";
import { Avatar } from "../components/Avatar";
import { BottomTabBar } from "../components/BottomTabBar";
import { IconButton } from "../components/IconButton";
import { InfoCallout } from "../components/InfoCallout";
import { ListRow } from "../components/ListRow";
import { MetricCard } from "../components/MetricCard";
import { ScreenContainer } from "../components/ScreenContainer";
import { SectionHeader } from "../components/SectionHeader";
import { useAuth } from "../lib/auth";
import { useCashierSession } from "../lib/cashierSession";
import { useStoreData } from "../lib/storeData";
import { completedSales } from "../lib/reports";
import { buildRestockRows, computeRestockSuggestions, lowStockProducts } from "../lib/inventory";
import { computeOldestDebtDays, isOverdueDebt } from "../lib/customers";
import { dayBounds, formatDayLabel, formatRelativeTime, greetingForHour, saleSummaryLabel } from "../lib/format";
import { PESO } from "../lib/money";
import { colors, radii } from "../theme/colors";

const PAYMENT_ICON = { cash: "dollar-sign", qr: "smartphone", credit: "book" } as const;
const PAYMENT_LABEL = { cash: "Cash", qr: "GCash", credit: "Utang" } as const;

interface OwnerHomeScreenProps {
  activeTab: string;
  onChangeTab: (tab: string) => void;
  onOpenTodaysSales?: () => void;
  onOpenRestock?: () => void;
  onOpenUtang?: () => void;
}

/**
 * Owner Home (mobile-owner-home.html). Every figure below is computed from
 * real `useStoreData()` state -- the same reports.ts/inventory.ts/
 * customers.ts functions the Today's Sales/Restock/Utang drill-down
 * screens already use, so this dashboard and those screens can never
 * silently disagree with each other.
 */
export function OwnerHomeScreen({ activeTab, onChangeTab, onOpenTodaysSales, onOpenRestock, onOpenUtang }: OwnerHomeScreenProps) {
  const { user, store } = useAuth();
  const { activeCashier } = useCashierSession();
  const { products, sales, customers } = useStoreData();

  const now = useMemo(() => new Date(), []);

  const { todaysTotal, transactionCount, avgBasket, salesChangePercent } = useMemo(() => {
    const today = dayBounds(now);
    const yesterday = dayBounds(new Date(now.getTime() - 24 * 60 * 60 * 1000));
    const inRange = (timestamp: string, range: { start: Date; end: Date }) => {
      const t = new Date(timestamp);
      return t >= range.start && t <= range.end;
    };
    const todaysSales = completedSales(sales.filter((s) => inRange(s.timestamp, today)));
    const yesterdaysSales = completedSales(sales.filter((s) => inRange(s.timestamp, yesterday)));
    const total = todaysSales.reduce((sum, s) => sum + s.total, 0);
    const yesterdayTotal = yesterdaysSales.reduce((sum, s) => sum + s.total, 0);
    return {
      todaysTotal: total,
      transactionCount: todaysSales.length,
      avgBasket: todaysSales.length > 0 ? total / todaysSales.length : 0,
      salesChangePercent: yesterdayTotal > 0 ? Math.round(((total - yesterdayTotal) / yesterdayTotal) * 100) : null,
    };
  }, [sales, now]);

  const restockRows = useMemo(() => {
    const low = lowStockProducts(products);
    const suggestions = computeRestockSuggestions(products, completedSales(sales));
    return buildRestockRows(low, suggestions);
  }, [products, sales]);

  const customersWithBalance = useMemo(() => customers.filter((c) => c.balance > 0), [customers]);
  const utangOutstanding = useMemo(() => customersWithBalance.reduce((sum, c) => sum + c.balance, 0), [customersWithBalance]);

  const mostOverdueCustomer = useMemo(() => {
    let worst: { name: string; balance: number; days: number } | null = null;
    for (const customer of customersWithBalance) {
      const days = computeOldestDebtDays(sales, customer);
      if (days !== null && isOverdueDebt(days) && (worst === null || days > worst.days)) {
        worst = { name: customer.name, balance: customer.balance, days };
      }
    }
    return worst;
  }, [customersWithBalance, sales]);

  const recentSales = useMemo(
    () =>
      completedSales(sales)
        .slice()
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 3),
    [sales]
  );

  const attentionRows = useMemo(() => {
    const rows: { key: string; icon: "alert-circle" | "box" | "book"; tone: "error" | "warning"; title: string; subtitle: string; actionLabel: string; onPress?: () => void }[] = [];
    for (const row of restockRows) {
      if (row.severity === "out") {
        rows.push({
          key: `restock-${row.productId}`,
          icon: "alert-circle",
          tone: "error",
          title: `${row.productName} is out of stock`,
          subtitle: row.avgDailySales !== null ? `Sells ~${row.avgDailySales}/day · losing sales now` : "Losing sales now",
          actionLabel: "Order",
          onPress: onOpenRestock,
        });
      }
    }
    for (const row of restockRows) {
      if (rows.length >= 2) break;
      if (row.severity !== "out") {
        rows.push({
          key: `restock-${row.productId}`,
          icon: "box",
          tone: "warning",
          title: `${row.productName} — ${row.stock} left`,
          subtitle:
            row.daysOfStockLeft !== null
              ? `Out in about ${row.daysOfStockLeft < 1 ? "a few hours" : `${Math.round(row.daysOfStockLeft)} day${Math.round(row.daysOfStockLeft) === 1 ? "" : "s"}`}`
              : "Running low",
          actionLabel: "Order",
          onPress: onOpenRestock,
        });
      }
    }
    if (mostOverdueCustomer && rows.length < 3) {
      rows.push({
        key: "utang",
        icon: "book",
        tone: "warning",
        title: `${mostOverdueCustomer.name} is ${mostOverdueCustomer.days} days overdue`,
        subtitle: PESO.format(mostOverdueCustomer.balance),
        actionLabel: "Remind",
        onPress: onOpenUtang,
      });
    }
    return rows.slice(0, 3);
  }, [restockRows, mostOverdueCustomer, onOpenRestock, onOpenUtang]);

  return (
    <View style={styles.flex}>
      <ScreenContainer reserveTabBarSpace>
        <View style={styles.appBar}>
          <Avatar initial={(store?.name ?? "T")[0]} />
          <View style={styles.appBarText}>
            <Text style={styles.greeting}>{greetingForHour(now)}</Text>
            <Text style={styles.storeLine}>
              {store?.name ?? "Store"} · {formatDayLabel(now)}
            </Text>
          </View>
          <IconButton icon="bell" accessibilityLabel="Notifications" onPress={() => {}} />
        </View>

        <View style={styles.grid}>
          <MetricCard
            label="Today's Sales"
            value={PESO.format(todaysTotal)}
            caption={salesChangePercent !== null ? `${salesChangePercent >= 0 ? "▲" : "▼"} ${Math.abs(salesChangePercent)}% vs yesterday` : undefined}
            variant={salesChangePercent !== null && salesChangePercent >= 0 ? "positive" : "default"}
          />
          <MetricCard label="Transactions" value={String(transactionCount)} caption={transactionCount > 0 ? `${PESO.format(avgBasket)} average` : undefined} />
          <MetricCard
            label="Low Stock"
            value={String(restockRows.length)}
            caption={restockRows.length > 0 ? "Restock today" : undefined}
            variant={restockRows.length > 0 ? "warning" : "default"}
          />
          <MetricCard label="Utang Out" value={PESO.format(utangOutstanding)} caption={`${customersWithBalance.length} customers`} />
        </View>

        {activeCashier && (
          <View style={styles.registerCardSpacing}>
            <InfoCallout icon="dollar-sign" tone="success" title="Register is open" description={`${activeCashier.name} · on this device`} />
          </View>
        )}

        {attentionRows.length > 0 && (
          <>
            <SectionHeader title="Needs your attention" onSeeAllPress={onOpenRestock} />
            <View style={styles.card}>
              {attentionRows.map((row, index) => (
                <View key={row.key}>
                  <ListRow
                    icon={row.icon}
                    tone={row.tone}
                    title={row.title}
                    subtitle={row.subtitle}
                    trailing={<ActionPill label={row.actionLabel} onPress={row.onPress} />}
                  />
                  {index < attentionRows.length - 1 && <View style={styles.rowDivider} />}
                </View>
              ))}
            </View>
          </>
        )}

        <SectionHeader title="Recent sales" onSeeAllPress={onOpenTodaysSales} />
        {recentSales.length === 0 ? (
          <Text style={styles.emptyText}>No sales yet today.</Text>
        ) : (
          <View style={styles.card}>
            {recentSales.map((sale, index) => (
              <View key={sale.id}>
                <ListRow
                  icon={PAYMENT_ICON[sale.paymentType]}
                  tone={sale.paymentType === "credit" ? "warning" : "default"}
                  title={saleSummaryLabel(sale.items)}
                  subtitle={`${formatRelativeTime(sale.timestamp, now)} · ${PAYMENT_LABEL[sale.paymentType]}`}
                  trailing={<Text style={styles.amount}>{PESO.format(sale.total)}</Text>}
                />
                {index < recentSales.length - 1 && <View style={styles.rowDivider} />}
              </View>
            ))}
          </View>
        )}
      </ScreenContainer>

      <BottomTabBar active={activeTab} onChange={onChangeTab} />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  appBar: { flexDirection: "row", alignItems: "center", marginBottom: 18 },
  appBarText: { flex: 1, marginLeft: 12 },
  greeting: { fontSize: 19, fontWeight: "500", color: colors.textPrimary },
  storeLine: { fontSize: 12, color: colors.textFaint, marginTop: 2 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 11 },
  registerCardSpacing: { marginTop: 14 },
  card: {
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.hairline,
    borderRadius: radii.card,
    paddingHorizontal: 14,
  },
  rowDivider: { height: 1, backgroundColor: colors.hairlineFaint },
  amount: { fontSize: 13.5, fontWeight: "500", color: colors.textPrimary },
  emptyText: { fontSize: 13, color: colors.textFaint, paddingVertical: 12 },
});
