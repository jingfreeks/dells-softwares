import { useMemo } from "react";
import { useDemoStoreData, type DemoProduct } from "../../lib/demoData";

export interface RestockRow {
  productId: string;
  productName: string;
  stock: number;
  orderSuggestion: number;
}

/** All derived data for DemoStoreScreen -- DemoStoreScreen.tsx stays presentational. */
export function useDemoStoreScreen() {
  const { loading, error, sales, customers, totalSales, lowStockCount, totalUtang, bestSellers, products } =
    useDemoStoreData();

  const now = useMemo(() => new Date(), []);

  const recentSales = useMemo(() => sales.slice(0, 3), [sales]);

  const customersWithBalance = useMemo(() => customers.filter((c) => c.balance > 0), [customers]);

  const restockRows: RestockRow[] = useMemo(
    () =>
      products
        .filter((p: DemoProduct) => p.stock <= p.lowStockThreshold)
        .map((p) => ({
          productId: p.id,
          productName: p.name,
          stock: p.stock,
          orderSuggestion: Math.max(p.lowStockThreshold * 2, 10),
        }))
        .slice(0, 3),
    [products]
  );

  return {
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
  };
}
