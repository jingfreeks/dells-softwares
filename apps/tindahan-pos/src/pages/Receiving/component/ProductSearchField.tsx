import type { Product } from "@/lib";
import { LABEL_ADD_A_PRODUCT, PLACEHOLDER_SEARCH_BY_NAME, LABEL_SCAN_ITEM, LABEL_STOCK_PREFIX } from "@/lib";
import { CameraIcon } from "@/components";

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
    <div className="mt-4">
      <label htmlFor="recvSearch" className="text-xs font-medium text-slate-700">
        {LABEL_ADD_A_PRODUCT}
      </label>
      <div className="mt-1 flex gap-2">
        <input
          id="recvSearch"
          type="text"
          placeholder={PLACEHOLDER_SEARCH_BY_NAME}
          value={searchQuery}
          onChange={(e) => onSearchQueryChange(e.target.value)}
          className="flex-1 rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-[var(--color-brand)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand)]"
        />
        <button
          type="button"
          onClick={onScanProduct}
          aria-label={LABEL_SCAN_ITEM}
          className="flex items-center gap-1.5 rounded-xl bg-[var(--color-brand)] px-3 py-2 text-sm font-medium text-white hover:bg-[var(--color-brand-dark)]"
        >
          <CameraIcon className="h-4 w-4" />
          {LABEL_SCAN_ITEM}
        </button>
      </div>
      {searchResults.length > 0 && (
        <ul className="mt-2 divide-y divide-slate-100 rounded-xl border border-slate-100">
          {searchResults.map((product) => (
            <li key={product.id}>
              <button
                type="button"
                onClick={() => onAddLine(product.id, product.name)}
                className="flex w-full cursor-pointer items-center justify-between px-3 py-2 text-left text-sm hover:bg-slate-50"
              >
                <span>{product.name}</span>
                <span className="text-slate-500">
                  {LABEL_STOCK_PREFIX} {product.stock}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
