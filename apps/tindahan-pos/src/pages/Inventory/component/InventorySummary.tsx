import { PESO, LABEL_STOCK_VALUE, TEXT_AT_COST_SUFFIX, LABEL_AVG_MARGIN, TEXT_ACROSS_ITEMS_SUFFIX, type Product } from "@/lib";

interface InventorySummaryProps {
  products: Product[];
  lowStockCount: number;
  avgMarginPercent: number;
  stockValue: number;
}

/** At-a-glance stock health, using the product data the POS currently stores. */
export function InventorySummary({ products, lowStockCount, avgMarginPercent, stockValue }: InventorySummaryProps) {
  const outOfStockCount = products.filter((product) => product.stock <= 0).length;

  return (
    <div className="tpl-g4" style={{ marginTop: 18, marginBottom: 14 }}>
      <div className="tpl-metric">
        <p className="tpl-mlbl">{LABEL_STOCK_VALUE}</p>
        <p className="tpl-mval">{PESO.format(stockValue)}</p>
        <p className="tpl-mfoot">{TEXT_AT_COST_SUFFIX}</p>
      </div>
      <div className="tpl-metric">
        <p className="tpl-mlbl">{LABEL_AVG_MARGIN}</p>
        <p className="tpl-mval">{avgMarginPercent}%</p>
        <p className="tpl-mfoot">
          across {products.length} {TEXT_ACROSS_ITEMS_SUFFIX}
        </p>
      </div>
      <div className="tpl-metric tpl-w">
        <p className="tpl-mlbl" style={{ color: "var(--tpl-warn)" }}>LOW STOCK</p>
        <p className="tpl-mval tpl-warn">{lowStockCount}</p>
        <p className="tpl-mfoot" style={{ color: "var(--tpl-warn)" }}>Reorder today</p>
      </div>
      <div className={`tpl-metric${outOfStockCount > 0 ? " tpl-r" : ""}`}>
        <p className="tpl-mlbl" style={{ color: outOfStockCount > 0 ? "var(--tpl-bad)" : undefined }}>OUT OF STOCK</p>
        <p className={`tpl-mval${outOfStockCount > 0 ? " tpl-bad" : ""}`}>{outOfStockCount}</p>
        <p className="tpl-mfoot" style={{ color: outOfStockCount > 0 ? "var(--tpl-bad)" : undefined }}>
          {outOfStockCount > 0 ? "Losing sales" : "All available"}
        </p>
      </div>
    </div>
  );
}
