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
        <div role="alert" className="tpl-alert" style={{ marginTop: 14 }}>
          {error ?? actionError}
        </div>
      )}

      {!loading && lowStock.length > 0 && (
        <div role="alert" className="tpl-note tpl-w" style={{ marginTop: 14 }}>
          <i className="ti ti-alert-triangle" aria-hidden style={{ color: "var(--tpl-warn)" }} />
          <p className="tpl-ns" style={{ color: "var(--tpl-t3)" }}>
            {lowStock.length} product{lowStock.length === 1 ? "" : "s"} {TEXT_LOW_STOCK_ALERT_SUFFIX}{" "}
            {lowStock.map((p) => p.name).join(", ")}.
          </p>
        </div>
      )}
    </>
  );
}
