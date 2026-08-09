import type { FormEvent, RefObject } from "react";
import type { Product } from "@/lib";
import {
  PESO,
  LABEL_SCAN_OR_SEARCH_PRODUCTS,
  PLACEHOLDER_SCAN_OR_SEARCH,
  ARIA_SCAN_WITH_CAMERA,
  LABEL_CATEGORY_ALL,
  EMPTY_STATE_NO_PRODUCTS,
  TEXT_LOADING_PRODUCTS,
  ERROR_COULD_NOT_LOAD_PRODUCTS,
  BUTTON_TRY_AGAIN,
  TEXT_CUSTOM_ITEM,
  LABEL_CUSTOM_ITEM_NAME,
  LABEL_CUSTOM_ITEM_PRICE,
  PLACEHOLDER_CUSTOM_ITEM_NAME,
  BUTTON_ADD_ITEM,
  BUTTON_CANCEL,
  TEXT_LOW_STOCK_LEFT_SUFFIX,
} from "@/lib";

const NAME_ICON_KEYWORDS: [RegExp, string][] = [
  [/noodle|canton|pancit/, "ti-noodles"],
  [/egg|itlog/, "ti-egg"],
  [/coffee|kopiko|nescafe/, "ti-coffee"],
  [/candy|choco|maxx/, "ti-candy"],
  [/sardin|tuna|bangus|fish/, "ti-fish"],
  [/milk|gatas/, "ti-milk"],
  [/soap|sabon/, "ti-soap"],
  [/detergent|tide|surf|ariel|wash/, "ti-wash-machine"],
  [/cracker|cookie|biscuit|skyflakes/, "ti-cookie"],
  [/load|e-load|eload/, "ti-device-mobile-charging"],
  [/coke|sprite|pepsi|soda|juice|water|bottle/, "ti-bottle"],
];

// A brand-new product rarely matches a specific name keyword above, so
// this narrows the fallback from a generic box down to something
// recognizable for its category before giving up entirely.
const CATEGORY_ICON_KEYWORDS: [RegExp, string][] = [
  [/snack/, "ti-cookie"],
  [/drink|beverage/, "ti-bottle"],
  [/household|home/, "ti-soap"],
  [/service/, "ti-device-mobile-charging"],
];

function iconForProduct(product: Product): string {
  const name = product.name.toLowerCase();
  for (const [pattern, icon] of NAME_ICON_KEYWORDS) {
    if (pattern.test(name)) return icon;
  }
  const category = product.category.toLowerCase();
  for (const [pattern, icon] of CATEGORY_ICON_KEYWORDS) {
    if (pattern.test(category)) return icon;
  }
  return "ti-box";
}

interface ProductBrowsePanelProps {
  productsLoading: boolean;
  productsError: string | null;
  onRetryProducts: () => void;
  productInputRef: RefObject<HTMLInputElement | null>;
  productQuery: string;
  onProductQueryChange: (value: string) => void;
  onProductQuerySubmit: (e: FormEvent) => void;
  searchError: string | null;
  onOpenScanner: () => void;
  categories: string[];
  activeCategory: string;
  onCategoryChange: (category: string) => void;
  visibleProducts: Product[];
  cartQuantityByProductId: Map<string, number>;
  priceLabel: (product: Product) => string | null;
  onAddProduct: (productId: string) => void;
  customItemOpen: boolean;
  onOpenCustomItem: () => void;
  onCancelCustomItem: () => void;
  customItemName: string;
  onCustomItemNameChange: (value: string) => void;
  customItemPrice: string;
  onCustomItemPriceChange: (value: string) => void;
  onSubmitCustomItem: (e: FormEvent) => void;
}

export function ProductBrowsePanel({
  productsLoading,
  productsError,
  onRetryProducts,
  productInputRef,
  productQuery,
  onProductQueryChange,
  onProductQuerySubmit,
  searchError,
  onOpenScanner,
  categories,
  activeCategory,
  onCategoryChange,
  visibleProducts,
  cartQuantityByProductId,
  priceLabel,
  onAddProduct,
  customItemOpen,
  onOpenCustomItem,
  onCancelCustomItem,
  customItemName,
  onCustomItemNameChange,
  customItemPrice,
  onCustomItemPriceChange,
  onSubmitCustomItem,
}: ProductBrowsePanelProps) {
  return (
    <div className="flex flex-col gap-3">
      <form onSubmit={onProductQuerySubmit} className="flex gap-2">
        <label htmlFor="product-query" className="sr-only">
          {LABEL_SCAN_OR_SEARCH_PRODUCTS}
        </label>
        <div className="tpl-fld" style={{ flex: 1 }}>
          <i className="ti ti-search" aria-hidden style={{ marginRight: 9, color: "var(--tpl-t6)" }} />
          <input
            id="product-query"
            ref={productInputRef}
            type="text"
            placeholder={PLACEHOLDER_SCAN_OR_SEARCH}
            autoFocus
            value={productQuery}
            onChange={(e) => onProductQueryChange(e.target.value)}
          />
        </div>
        <button
          type="button"
          onClick={onOpenScanner}
          aria-label={ARIA_SCAN_WITH_CAMERA}
          className="tpl-btn"
          style={{ width: 44, height: 44, padding: 0, justifyContent: "center", flex: "none", marginBottom: 0 }}
        >
          <i className="ti ti-camera" aria-hidden />
        </button>
      </form>
      {searchError && (
        <p role="alert" className="tpl-ts" style={{ color: "var(--tpl-bad)", marginTop: 8 }}>
          {searchError}
        </p>
      )}

      {categories.length > 1 && (
        <div className="flex flex-wrap gap-1.5" style={{ marginTop: 14 }}>
          <button
            type="button"
            onClick={() => onCategoryChange("All")}
            className={`tpl-chip${activeCategory === "All" ? " tpl-on" : ""}`}
          >
            {LABEL_CATEGORY_ALL}
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => onCategoryChange(cat)}
              className={`tpl-chip${activeCategory === cat ? " tpl-on" : ""}`}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      <div className="tpl-g4" style={{ marginTop: 14 }}>
        {productsLoading ? (
          <p className="tpl-ts">{TEXT_LOADING_PRODUCTS}</p>
        ) : productsError ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-start" }}>
            <p role="alert" className="tpl-emsg">
              <i className="ti ti-alert-circle" aria-hidden />
              {ERROR_COULD_NOT_LOAD_PRODUCTS}
            </p>
            <button type="button" className="tpl-btnp" style={{ width: "auto" }} onClick={onRetryProducts}>
              {BUTTON_TRY_AGAIN}
            </button>
          </div>
        ) : (
          <>
            {visibleProducts.map((product) => {
              const quantity = cartQuantityByProductId.get(product.id) ?? 0;
              const lowStock = product.stock > 0 && product.stock <= product.lowStockThreshold;
              return (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => onAddProduct(product.id)}
                  className={`tpl-tile${quantity > 0 ? " tpl-on" : ""}`}
                >
                  {quantity > 0 && <span className="tpl-tile-badge">{quantity}</span>}
                  <i className={`ti ${iconForProduct(product)}`} aria-hidden />
                  <p className="tpl-tn">{product.name}</p>
                  <p className="tpl-tpr">{priceLabel(product) ?? PESO.format(product.price)}</p>
                  {lowStock && (
                    <p className="tpl-tw">
                      {product.stock} {TEXT_LOW_STOCK_LEFT_SUFFIX}
                    </p>
                  )}
                </button>
              );
            })}
            {visibleProducts.length === 0 && <p className="tpl-ts">{EMPTY_STATE_NO_PRODUCTS}</p>}
          </>
        )}
      </div>

      <div className="tpl-g4" style={{ marginTop: 9 }}>
        {customItemOpen ? (
          <form onSubmit={onSubmitCustomItem} className="tpl-tile" style={{ gap: 8, cursor: "default" }}>
            <label htmlFor="custom-item-name" className="sr-only">
              {LABEL_CUSTOM_ITEM_NAME}
            </label>
            <input
              id="custom-item-name"
              type="text"
              autoFocus
              placeholder={PLACEHOLDER_CUSTOM_ITEM_NAME}
              value={customItemName}
              onChange={(e) => onCustomItemNameChange(e.target.value)}
              className="tpl-tn"
              style={{
                width: "100%",
                background: "none",
                border: "none",
                borderBottom: "0.5px solid rgba(255,255,255,.14)",
                outline: "none",
                padding: "2px 0",
              }}
            />
            <label htmlFor="custom-item-price" className="sr-only">
              {LABEL_CUSTOM_ITEM_PRICE}
            </label>
            <input
              id="custom-item-price"
              type="number"
              min="0"
              step="0.01"
              placeholder={LABEL_CUSTOM_ITEM_PRICE}
              value={customItemPrice}
              onChange={(e) => onCustomItemPriceChange(e.target.value)}
              className="tpl-tn"
              style={{
                width: "100%",
                background: "none",
                border: "none",
                borderBottom: "0.5px solid rgba(255,255,255,.14)",
                outline: "none",
                padding: "2px 0",
              }}
            />
            <div className="flex gap-3" style={{ width: "100%" }}>
              <button
                type="submit"
                className="tpl-tpr"
                style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}
              >
                {BUTTON_ADD_ITEM}
              </button>
              <button
                type="button"
                onClick={onCancelCustomItem}
                className="tpl-ts"
                style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}
              >
                {BUTTON_CANCEL}
              </button>
            </div>
          </form>
        ) : (
          <button type="button" onClick={onOpenCustomItem} className="tpl-tile tpl-dash">
            <i className="ti ti-plus" aria-hidden style={{ fontSize: 19 }} />
            {TEXT_CUSTOM_ITEM}
          </button>
        )}
      </div>
    </div>
  );
}
