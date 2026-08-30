import { useMemo } from "react";
import { useAuth } from "../../lib/auth";
import { useCashierSession } from "../../lib/cashierSession";
import { useStoreData } from "../../lib/storeData";
import { completedSales } from "../../lib/reports";
import { buildRestockRows, computeRestockSuggestions, lowStockProducts } from "../../lib/inventory";
import { computeOldestDebtDays, isOverdueDebt } from "../../lib/customers";
import { dayBounds } from "../../lib/format";
import { PESO } from "../../lib/money";
import type { AttentionRow, OwnerHomeScreenProps } from "./types";

export const PAYMENT_ICON = { cash: "dollar-sign", qr: "smartphone", credit: "book" } as const;
export const PAYMENT_LABEL = { cash: "Cash", qr: "GCash", credit: "Utang" } as const;

/**
 * All derived data for OwnerHomeScreen -- OwnerHomeScreen.tsx stays
 * presentational. Every figure is computed from real useStoreData() state --
 * the same reports.ts/inventory.ts/customers.ts functions the Today's
 * Sales/Restock/Utang drill-down screens already use, so this dashboard and
 * those screens can never silently disagree with each other.
 */
export function useOwnerHomeScreen({ onOpenRestock, onOpenUtang }: OwnerHomeScreenProps) {
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
  const utangOutstanding = useMemo(
    () => customersWithBalance.reduce((sum, c) => sum + c.balance, 0),
    [customersWithBalance]
  );

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
    const rows: AttentionRow[] = [];
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

  return {
    user,
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
  };
}
