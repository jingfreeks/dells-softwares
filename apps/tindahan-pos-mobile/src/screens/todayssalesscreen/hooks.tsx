import { useMemo } from "react";
import { useStoreData } from "../../lib/storeData";
import { completedSales, salesByPaymentType } from "../../lib/reports";
import { dayBounds } from "../../lib/format";
import { colors } from "../../theme/colors";

export const PAYMENT_ICON = { cash: "dollar-sign", qr: "smartphone", credit: "book" } as const;
export const PAYMENT_LABEL = { cash: "Cash", qr: "GCash", credit: "Utang" } as const;
export const PAYMENT_COLOR = { cash: colors.accent, qr: "#60A5FA", credit: colors.warning } as const;

/** All derived data for TodaysSalesScreen -- TodaysSalesScreen.tsx stays presentational. */
export function useTodaysSalesScreen() {
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
      todaysCompletedSales: completed.sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      ),
      totalSales: total,
      transactionCount: completed.length,
      itemsSold: items,
      avgBasket: completed.length > 0 ? total / completed.length : 0,
      paymentMix: salesByPaymentType(completed),
    };
  }, [sales, now]);

  const paymentMixTotal = paymentMix.reduce((sum, p) => sum + p.total, 0);

  return { now, loading, todaysCompletedSales, totalSales, transactionCount, itemsSold, avgBasket, paymentMix, paymentMixTotal };
}
