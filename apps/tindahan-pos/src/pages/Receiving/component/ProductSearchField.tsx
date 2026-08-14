import type { Product } from "@/lib";
import { LABEL_ADD_A_PRODUCT, PLACEHOLDER_SEARCH_BY_NAME, LABEL_SCAN_ITEM, LABEL_STOCK_PREFIX } from "@/lib";

interface ProductSearchFieldProps {
  searchQuery: string;
  searchResults: Product[];
  onSearchQueryChange: (value: string) => void;
  onScanProduct: () => void;
  onAddLine: (productId: string, productName: string) => void;
}

export function ProductSearchField({
  searchQuery,
  searchResults,
  onSearchQueryChange,
  onScanProduct,
  onAddLine,
}: ProductSearchFieldProps) {
  return (
    <div style={{ marginTop: 14 }}>
      <label htmlFor="recvSearch" className="tpl-lbl">
        {LABEL_ADD_A_PRODUCT}
      </label>
      <div className="tpl-sp" style={{ gap: 8 }}>
        <div className="tpl-fld" style={{ flex: 1 }}>
          <input
            id="recvSearch"
            type="text"
            placeholder={PLACEHOLDER_SEARCH_BY_NAME}
            value={searchQuery}
            onChange={(e) => onSearchQueryChange(e.target.value)}
          />
        </div>
        <button
          type="button"
          onClick={onScanProduct}
          aria-label={LABEL_SCAN_ITEM}
          className="tpl-btnp"
          style={{ width: "auto", height: 38, padding: "0 14px", marginBottom: 0, flexShrink: 0, gap: 6 }}
        >
          <i className="ti ti-camera" aria-hidden />
          {LABEL_SCAN_ITEM}
        </button>
      </div>
      {searchResults.length > 0 && (
        <div className="tpl-card" style={{ padding: 0, marginTop: 6 }}>
          {searchResults.map((product) => (
            <div
              key={product.id}
              role="button"
              tabIndex={0}
              className="tpl-trow"
              style={{ gridTemplateColumns: "1fr auto" }}
              onClick={() => onAddLine(product.id, product.name)}
              onKeyDown={(e) => e.key === "Enter" && onAddLine(product.id, product.name)}
            >
              <span className="tpl-sub">{product.name}</span>
              <span className="tpl-ts">
                {LABEL_STOCK_PREFIX} {product.stock}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
