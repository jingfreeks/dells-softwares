import { useMemo } from "react";
import { Share } from "react-native";
import { useStoreData } from "../../lib/storeData";
import { completedSales } from "../../lib/reports";
import { buildRestockRows, computeRestockSuggestions, lowStockProducts, type RestockRow } from "../../lib/inventory";

export function rowDescription(row: RestockRow): string {
  if (row.isOut) {
    return row.avgDailySales !== null ? `0 left · sells ~${row.avgDailySales}/day` : "0 left";
  }
  if (row.daysOfStockLeft !== null) {
    const label =
      row.daysOfStockLeft < 1
        ? "out in less than a day"
        : `out in ~${Math.round(row.daysOfStockLeft)} day${Math.round(row.daysOfStockLeft) === 1 ? "" : "s"}`;
    return `${row.stock} left · ${label}`;
  }
  return `${row.stock} left`;
}

/** All derived data + logic for RestockScreen -- RestockScreen.tsx stays presentational. */
export function useRestockScreen() {
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

  return { rows, outCount, criticalCount, lowCount, handleSendList };
}
