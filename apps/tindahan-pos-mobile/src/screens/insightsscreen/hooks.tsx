import { useMemo } from "react";
import { useStoreData } from "../../lib/storeData";
import { bestSellers, completedSales, salesByCategory } from "../../lib/reports";
import { dayBounds } from "../../lib/format";

/** All derived data for InsightsScreen -- InsightsScreen.tsx stays presentational. */
export function useInsightsScreen() {
  const { sales, products } = useStoreData();

  const { topSellers, categoryRows, categoryGrandTotal } = useMemo(() => {
    const { start, end } = dayBounds(new Date());
    const todays = completedSales(
      sales.filter((s) => {
        const t = new Date(s.timestamp);
        return t >= start && t <= end;
      })
    );
    const top = bestSellers(todays, products, 5);
    const categories = salesByCategory(todays, products);
    return { topSellers: top, categoryRows: categories.rows, categoryGrandTotal: categories.grandTotal };
  }, [sales, products]);

  const maxQuantity = topSellers[0]?.quantity ?? 0;

  return { topSellers, categoryRows, categoryGrandTotal, maxQuantity };
}
