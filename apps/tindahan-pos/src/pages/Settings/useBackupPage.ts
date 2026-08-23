import { useState } from "react";
import { useStoreData, useOfflineQueue, productsToCsv, salesToCsv, everythingToJson, downloadTextFile } from "@/lib";

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function useBackupPage() {
  const { products, sales, customers, refresh } = useStoreData();
  const { pendingCount } = useOfflineQueue();
  const [refreshing, setRefreshing] = useState(false);

  async function handleRefreshNow() {
    setRefreshing(true);
    try {
      await refresh();
    } finally {
      setRefreshing(false);
    }
  }

  function exportSalesCsv() {
    downloadTextFile(`sales-${today()}.csv`, salesToCsv(sales), "text/csv");
  }

  function exportProductsCsv() {
    downloadTextFile(`products-${today()}.csv`, productsToCsv(products), "text/csv");
  }

  function exportEverything() {
    downloadTextFile(`backup-${today()}.json`, everythingToJson({ products, sales, customers }), "application/json");
  }

  return {
    salesCount: sales.length,
    productsCount: products.length,
    customersCount: customers.length,
    refreshing,
    onRefreshNow: handleRefreshNow,
    pendingCount,

    exportSalesCsv,
    exportProductsCsv,
    exportEverything,
  };
}
