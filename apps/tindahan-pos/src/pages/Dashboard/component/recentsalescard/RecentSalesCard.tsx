import type { SaleRecord } from "@/lib";
import { LABEL_RECENT_SALES, EMPTY_STATE_NO_SALES, LINK_OPEN } from "@/lib";
import { Listitem } from "./component";

export function RecentSalesCard({
  recentSales,
  onOpenReport,
}: {
  recentSales: SaleRecord[];
  onOpenReport: () => void;
}) {
  return (
    <div className="tpl-card">
      <div className="tpl-sp" style={{ marginBottom: 11 }}>
        <p className="tpl-h3">{LABEL_RECENT_SALES}</p>
        <span
          role="button"
          tabIndex={0}
          className="tpl-chip"
          style={{ fontSize: 10.5, padding: "3px 9px", gap: 4, cursor: "pointer" }}
          onClick={onOpenReport}
          onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onOpenReport()}
        >
          {LINK_OPEN} <i className="ti ti-arrow-right" aria-hidden style={{ fontSize: 11 }} />
        </span>
      </div>
      {recentSales.map((sale) => (
        <Listitem key={sale.id} sale={sale} />
      ))}
      {recentSales.length === 0 && (
        <p className="tpl-ts" style={{ padding: "16px 0", textAlign: "center" }}>
          {EMPTY_STATE_NO_SALES}
        </p>
      )}
    </div>
  );
}
