import type { Product, ReceivingEntry } from "@/lib";
import { PESO } from "@/lib";
import { stockStatus, packPriceLabel } from "@/lib/inventory";
import { ImagePlaceholderIcon } from "@/components";
import { StatusChip } from "../statuschip";
import { StockIndicator } from "../stockindicator";
import { ProductActionsMenu } from "../productactionsmenu";
import { truncateBarcode, productMarginPercent } from "../../lib";

// The 96/74/34px fixed columns (price/status/menu) plus 4 gaps already add
// up to ~250px; on a narrow viewport that leaves nothing for the two `fr`
// columns, and minmax(0, ...) let them collapse straight to 0 -- every cell
// in the product/stock columns then rendered at the same point, stacked
// unreadably on top of the neighboring fixed columns. The floors below stop
// that collapse; InventoryTable's own overflow-x:auto lets the row scroll
// sideways past this width instead.
export const PRODUCT_ROW_COLUMNS = "minmax(140px,2.1fr) 96px minmax(110px,1.5fr) 74px 34px";

interface ProductRowProps {
  product: Product;
  receivingHistory: ReceivingEntry[];
  avgDailySales: number | undefined;
  packPricingEnabled: boolean;
  onRestock: (id: string) => void;
  onEdit: (product: Product) => void;
  onRemove: (id: string) => void;
}

const ROW_VARIANT_CLASS = {
  "in-stock": "",
  low: " tpl-w",
  out: " tpl-r",
} as const;

export function ProductRow({
  product,
  receivingHistory,
  avgDailySales,
  packPricingEnabled,
  onRestock,
  onEdit,
  onRemove,
}: ProductRowProps) {
  const status = stockStatus(product);
  const margin = productMarginPercent(product, receivingHistory);
  const packLabel = packPricingEnabled ? packPriceLabel(product) : null;

  return (
    <div
      role="row"
      aria-label={product.name}
      className={`tpl-trow${ROW_VARIANT_CLASS[status]}`}
      style={{ gridTemplateColumns: PRODUCT_ROW_COLUMNS, cursor: "default" }}
    >
      <div className="tpl-row">
        <div
          style={{
            width: 32,
            height: 32,
            flex: "none",
            borderRadius: 8,
            overflow: "hidden",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "var(--tpl-gl)",
            border: "0.5px solid var(--tpl-bd)",
            color: "var(--tpl-t7)",
          }}
        >
          {product.imageUrl ? (
            <img src={product.imageUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <ImagePlaceholderIcon className="h-4 w-4" />
          )}
        </div>
        <div className="tpl-flex1">
          <p className="tpl-tp">{product.name}</p>
          <p className="tpl-ts">
            {product.category} · {truncateBarcode(product.barcode)}
          </p>
        </div>
      </div>

      <div className="tpl-right">
        <p className="tpl-tp">{PESO.format(product.price)}</p>
        {packLabel ? <p className="tpl-ts">{packLabel}</p> : margin !== null && <p className="tpl-ts tpl-ok">+{margin}%</p>}
      </div>

      <StockIndicator product={product} avgDailySales={avgDailySales} />

      <StatusChip status={status} />

      <ProductActionsMenu
        onRestock={() => onRestock(product.id)}
        onEdit={() => onEdit(product)}
        onRemove={() => onRemove(product.id)}
      />
    </div>
  );
}
