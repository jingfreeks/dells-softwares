import type { SalesByCategory } from "@/lib";
import { PESO, LABEL_SALES_BY_CATEGORY, EMPTY_STATE_NO_DATA } from "@/lib";

const SEGMENT_COLORS = ["#3B82F6", "#60A5FA", "#93C5FD", "rgba(255,255,255,.14)"];

export function SalesByCategoryCard({ categoryTotals }: { categoryTotals: SalesByCategory }) {
  return (
    <div className="tpl-card">
      <p className="tpl-h3" style={{ marginBottom: 14 }}>
        {LABEL_SALES_BY_CATEGORY}
      </p>
      {categoryTotals.rows.length > 0 && (
        <div style={{ display: "flex", height: 9, borderRadius: 5, overflow: "hidden", marginBottom: 12 }}>
          {categoryTotals.rows.map((row, i) => (
            <span
              key={row.category}
              style={{
                width: `${(row.total / categoryTotals.grandTotal) * 100}%`,
                background: SEGMENT_COLORS[i % SEGMENT_COLORS.length],
              }}
            />
          ))}
        </div>
      )}
      {categoryTotals.rows.map((row, i) => (
        <div className="tpl-sp" key={row.category} style={{ padding: "4px 0" }}>
          <span style={{ color: "var(--tpl-t4)", fontSize: 13, display: "flex", alignItems: "center", gap: 8 }}>
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: 2,
                background: SEGMENT_COLORS[i % SEGMENT_COLORS.length],
                display: "inline-block",
              }}
            />
            {row.category}
          </span>
          <span style={{ color: "var(--tpl-t2)", fontSize: 13 }}>{PESO.format(row.total)}</span>
        </div>
      ))}
      {categoryTotals.rows.length === 0 && (
        <p className="tpl-ts" style={{ padding: "16px 0", textAlign: "center" }}>
          {EMPTY_STATE_NO_DATA}
        </p>
      )}
    </div>
  );
}
