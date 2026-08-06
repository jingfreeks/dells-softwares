import type { Product } from "@/lib";
import { TEXT_LOW_STOCK_ALERT_SUFFIX } from "@/lib";

interface InventoryAlertsProps {
  error: string | null;
  actionError: string | null;
  loading: boolean;
  lowStock: Product[];
}

export function InventoryAlerts({ error, actionError, loading, lowStock }: InventoryAlertsProps) {
  return (
    <>
      {(error || actionError) && (
        <div role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error ?? actionError}
        </div>
      )}

      {!loading && lowStock.length > 0 && (
        <div role="alert" className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {lowStock.length} product{lowStock.length === 1 ? "" : "s"} {TEXT_LOW_STOCK_ALERT_SUFFIX}{" "}
          {lowStock.map((p) => p.name).join(", ")}.
        </div>
      )}
    </>
  );
}
