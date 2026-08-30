import type { Product, ReceivingEntry } from "@/lib";
import { TABLE_HEADER_PRODUCT, LABEL_PRICE, TABLE_HEADER_STOCK, TABLE_HEADER_STATUS, TEXT_NO_PRODUCTS_MATCH_PREFIX } from "@/lib";
import { ProductRow, PRODUCT_ROW_COLUMNS } from "./productrow";

interface InventoryTableProps {
  loading: boolean;
  pageProducts: Product[];
  filteredCount: number;
  query: string;
  packPricingEnabled: boolean;
  receivingHistory: ReceivingEntry[];
  dailySalesRateById: Map<string, number>;
  onRestock: (id: string) => void;
  onEdit: (product: Product) => void;
  onRemove: (id: string) => void;
}

export function InventoryTable({
  loading,
  pageProducts,
  filteredCount,
  query,
  packPricingEnabled,
  receivingHistory,
  dailySalesRateById,
  onRestock,
  onEdit,
  onRemove,
}: InventoryTableProps) {
  return (
    <div className="tpl-card" style={{ padding: 0, overflowX: "auto" }}>
      <div style={{ minWidth: 480 }}>
        <div className="tpl-thead" style={{ gridTemplateColumns: PRODUCT_ROW_COLUMNS }}>
          <span>{TABLE_HEADER_PRODUCT}</span>
          <span className="tpl-right">{LABEL_PRICE}</span>
          <span>{TABLE_HEADER_STOCK}</span>
          <span>{TABLE_HEADER_STATUS}</span>
          <span />
        </div>

        {loading &&
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} style={{ padding: "12px 15px" }}>
              <div className="tpl-skel" style={{ height: 20 }} />
            </div>
          ))}

        {!loading &&
          pageProducts.map((product) => (
            <ProductRow
              key={product.id}
              product={product}
              receivingHistory={receivingHistory}
              avgDailySales={dailySalesRateById.get(product.id)}
              packPricingEnabled={packPricingEnabled}
              onRestock={onRestock}
              onEdit={onEdit}
              onRemove={onRemove}
            />
          ))}

        {!loading && filteredCount === 0 && (
          <p className="tpl-ts" style={{ padding: "32px 15px", textAlign: "center" }}>
            {TEXT_NO_PRODUCTS_MATCH_PREFIX} "{query}".
          </p>
        )}
      </div>
    </div>
  );
}
