import { PESO, type SupplierCostChangeRow } from "@/lib";
import {
  TITLE_COST_CHANGES_WORTH_KNOWING,
  TEXT_MARGIN_PREFIX,
  TEXT_NO_RECENT_COST_CHANGES,
} from "@/lib";

interface SupplierCostChangesCardProps {
  rows: SupplierCostChangeRow[];
}

export function SupplierCostChangesCard({ rows }: SupplierCostChangesCardProps) {
  return (
    <div className="tpl-card">
      <p className="tpl-h3" style={{ marginBottom: 10 }}>
        {TITLE_COST_CHANGES_WORTH_KNOWING}
      </p>
      {rows.length === 0 && <p className="tpl-ts">{TEXT_NO_RECENT_COST_CHANGES}</p>}
      {rows.map((row) => {
        const up = row.newCost > row.previousCost;
        return (
          <div key={`${row.supplierId}-${row.productId}`} className="tpl-lr">
            <div className="tpl-flex1">
              <p className="tpl-tp">{row.productName}</p>
              <p className="tpl-ts">
                {row.supplierName} · {PESO.format(row.previousCost)} → {PESO.format(row.newCost)}
              </p>
            </div>
            {row.marginPercent !== null && (
              <span className={`tpl-chip${up ? " tpl-w" : " tpl-g"}`}>
                {TEXT_MARGIN_PREFIX} {row.marginPercent}%
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
