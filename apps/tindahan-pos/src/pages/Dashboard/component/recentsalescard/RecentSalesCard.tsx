import type { SaleRecord } from "@/lib";
import {  LABEL_RECENT_SALES, EMPTY_STATE_NO_SALES } from "@/lib";
import { Listitem } from "./component";

export function RecentSalesCard({
  recentSales,
}: {
  recentSales: SaleRecord[];
}) {
  return (
    <div className="tpl-card">
      <p className="tpl-h3" style={{ marginBottom: 11 }}>
        {LABEL_RECENT_SALES}
      </p>
      {recentSales.map((sale) => (
        <Listitem sale={sale} />
      ))}
      {recentSales.length === 0 && (
        <p
          className="tpl-ts"
          style={{ padding: "16px 0", textAlign: "center" }}
        >
          {EMPTY_STATE_NO_SALES}
        </p>
      )}
    </div>
  );
}
