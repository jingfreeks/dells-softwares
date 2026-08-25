import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { Card } from "../components/Card";
import { DetailHeader } from "../components/DetailHeader";
import { ListRow } from "../components/ListRow";
import { MetricCard } from "../components/MetricCard";
import { StackedBar } from "../components/StackedBar";
import { ScreenContainer } from "../components/ScreenContainer";
import { useStoreData } from "../lib/storeData";
import { completedSales, salesByPaymentType } from "../lib/reports";
import { dayBounds, formatDayLabel, formatTime, saleSummaryLabel } from "../lib/format";
import { PESO } from "../lib/money";
import { colors } from "../theme/colors";

const PAYMENT_ICON = { cash: "dollar-sign", qr: "smartphone", credit: "book" } as const;
const PAYMENT_LABEL = { cash: "Cash", qr: "GCash", credit: "Utang" } as const;
const PAYMENT_COLOR = { cash: colors.accent, qr: "#60A5FA", credit: colors.warning } as const;

interface TodaysSalesScreenProps {
  onBack?: () => void;
  storeName: string;
  onOpenInsights?: () => void;
}

/**
 * Today's Sales drill-down (design mockup: mobile-owner-todays-sales.html).
 * The date chip is fixed to "Today" for this pass -- switching to another
 * day is a real feature (needs a date picker + fetchSalesInRange call) left
 * for a follow-up rather than faked here.
 */
export function TodaysSalesScreen({ onBack, storeName, onOpenInsights }: TodaysSalesScreenProps) {
  const { sales, loading } = useStoreData();
  const now = useMemo(() => new Date(), []);

  const { todaysCompletedSales, totalSales, transactionCount, itemsSold, avgBasket, paymentMix } = useMemo(() => {
    const { start, end } = dayBounds(now);
    const todays = sales.filter((sale) => {
      const t = new Date(sale.timestamp);
      return t >= start && t <= end;
    });
    const completed = completedSales(todays);
    const total = completed.reduce((sum, s) => sum + s.total, 0);
    const items = completed.reduce((sum, s) => sum + s.items.reduce((n, i) => n + i.quantity, 0), 0);
    return {
      todaysCompletedSales: completed.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()),
      totalSales: total,
      transactionCount: completed.length,
      itemsSold: items,
      avgBasket: completed.length > 0 ? total / completed.length : 0,
      paymentMix: salesByPaymentType(completed),
    };
  }, [sales, now]);

  const paymentMixTotal = paymentMix.reduce((sum, p) => sum + p.total, 0);

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

      <View style={styles.grid}>
        <MetricCard label="Total sales" value={PESO.format(totalSales)} variant="highlight" />
        <MetricCard label="Transactions" value={String(transactionCount)} />
        <MetricCard label="Items sold" value={String(itemsSold)} />
        <MetricCard label="Avg basket" value={PESO.format(avgBasket)} />
      </View>

      {paymentMixTotal > 0 && (
        <Card padding={14} style={styles.mt14}>
          <StackedBar
            segments={paymentMix.map((p) => ({ fraction: p.total / paymentMixTotal, color: PAYMENT_COLOR[p.paymentType] }))}
          />
          <View style={styles.mt12}>
            {paymentMix.map((p) => (
              <View key={p.paymentType} style={styles.sumRow}>
                <Text style={[styles.sumLabel, p.paymentType === "credit" && styles.warnText]}>
                  {PAYMENT_LABEL[p.paymentType]}
                </Text>
                <Text style={[styles.sumValue, p.paymentType === "credit" && styles.warnText]}>{PESO.format(p.total)}</Text>
              </View>
            ))}
          </View>
        </Card>
      )}

      {onOpenInsights && (
        <Pressable accessibilityRole="button" onPress={onOpenInsights} style={styles.insightsLink}>
          <Text style={styles.insightsLinkText}>See best sellers &amp; category breakdown</Text>
          <Feather name="chevron-right" size={16} color={colors.accentSoft} />
        </Pressable>
      )}

      <View style={styles.sectionHeadRow}>
        <Text style={styles.sectionTitle}>Transactions</Text>
        <Text style={styles.countCaption}>
          {todaysCompletedSales.length} of {todaysCompletedSales.length}
        </Text>
      </View>

      {loading ? (
        <Text style={styles.emptyText}>Loading…</Text>
      ) : todaysCompletedSales.length === 0 ? (
        <Text style={styles.emptyText}>No sales yet today.</Text>
      ) : (
        <Card>
          {todaysCompletedSales.map((sale, index) => (
            <View key={sale.id}>
              <ListRow
                icon={PAYMENT_ICON[sale.paymentType]}
                title={saleSummaryLabel(sale.items)}
                subtitle={`${formatTime(sale.timestamp)} · ${sale.cashierName} · ${PAYMENT_LABEL[sale.paymentType]}`}
                trailing={<Text style={styles.amount}>{PESO.format(sale.total)}</Text>}
              />
              {index < todaysCompletedSales.length - 1 && <View style={styles.rowDivider} />}
            </View>
          ))}
        </Card>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 11, marginBottom: 12 },
  mt14: { marginBottom: 14 },
  insightsLink: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 8 },
  insightsLinkText: { fontSize: 13, color: colors.accentSoft, fontWeight: "500" },
  mt12: { marginTop: 12 },
  sumRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 3 },
  sumLabel: { fontSize: 13, color: colors.textDim },
  sumValue: { fontSize: 13, color: colors.textPrimary },
  warnText: { color: colors.warning },
  sectionHeadRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 20, marginBottom: 10 },
  sectionTitle: { fontSize: 16, fontWeight: "500", color: colors.textPrimary },
  countCaption: { fontSize: 11.5, color: colors.textFaint },
  amount: { fontSize: 13.5, fontWeight: "500", color: colors.textPrimary },
  rowDivider: { height: 1, backgroundColor: colors.hairlineFaint },
  emptyText: { fontSize: 13, color: colors.textFaint, textAlign: "center", paddingVertical: 24 },
});
