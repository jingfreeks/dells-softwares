import { useEffect, useMemo } from "react";
import { useAuth } from "../../lib/auth";
import { useStoreData } from "../../lib/storeData";
import { bestSellers, completedSales, salesByCategory } from "../../lib/reports";
import { dayBounds } from "../../lib/format";
import { markFirstReportViewed } from "../../lib/checklistTracking";

/** All derived data for InsightsScreen -- InsightsScreen.tsx stays presentational. */
export function useInsightsScreen() {
  const { user } = useAuth();
  const { sales, products } = useStoreData();

  // Real behavioral signal for the onboarding checklist's "View your
  // first report" item -- set once this screen actually renders, not
  // when the checklist item itself is tapped.
  useEffect(() => {
    if (user) markFirstReportViewed(user.storeId);
  }, [user]);

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
