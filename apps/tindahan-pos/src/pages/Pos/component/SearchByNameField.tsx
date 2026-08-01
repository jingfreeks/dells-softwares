import type { RefObject } from "react";
import type { Product } from "@/lib";
import { PESO, LABEL_SEARCH_BY_NAME_TAB, PLACEHOLDER_SEARCH_EXAMPLE } from "@/lib";

interface SearchByNameFieldProps {
  searchInputRef: RefObject<HTMLInputElement | null>;
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  searchResults: Product[];
  priceLabel: (product: Product) => string | null;
  onAddProduct: (productId: string) => void;
}

export function SearchByNameField({
  searchInputRef,
  searchQuery,
  onSearchQueryChange,
  searchResults,
  priceLabel,
  onAddProduct,
}: SearchByNameFieldProps) {
  return (
    <div className="mt-3">
      <label htmlFor="search" className="sr-only">
        {LABEL_SEARCH_BY_NAME_TAB}
      </label>
      <input
        id="search"
        ref={searchInputRef}
        type="text"
        placeholder={PLACEHOLDER_SEARCH_EXAMPLE}
        autoFocus
        value={searchQuery}
        onChange={(e) => onSearchQueryChange(e.target.value)}
        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-[var(--color-brand)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand)]"
      />
      {searchResults.length > 0 && (
        <ul className="mt-2 divide-y divide-slate-100 rounded-xl border border-slate-100">
          {searchResults.map((product) => (
            <li key={product.id}>
              <button
                type="button"
                onClick={() => onAddProduct(product.id)}
                className="flex w-full cursor-pointer items-center justify-between px-3 py-2 text-left text-sm hover:bg-slate-50"
              >
                <span>{product.name}</span>
                <span className="tabular-nums text-slate-500">{priceLabel(product) ?? PESO.format(product.price)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
