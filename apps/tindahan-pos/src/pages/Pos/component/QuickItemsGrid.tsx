import type { Product } from "@/lib";
import { PESO, EMPTY_STATE_NO_QUICK_ITEMS } from "@/lib";

interface QuickItemsGridProps {
  categories: string[];
  activeCategory: string;
  onCategoryChange: (category: string) => void;
  visibleQuickItems: Product[];
  priceLabel: (product: Product) => string | null;
  onAddProduct: (productId: string) => void;
}

export function QuickItemsGrid({
  categories,
  activeCategory,
  onCategoryChange,
  visibleQuickItems,
  priceLabel,
  onAddProduct,
}: QuickItemsGridProps) {
  return (
    <div className="mt-3">
      {categories.length > 1 && (
        <div className="flex flex-wrap gap-1.5">
          {["All", ...categories].map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => onCategoryChange(cat)}
              className={`cursor-pointer rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                activeCategory === cat
                  ? "bg-[var(--color-brand)] text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      )}
      <div className="mt-2 flex max-h-64 flex-wrap gap-2 overflow-y-auto pr-1">
        {visibleQuickItems.map((product) => (
          <button
            key={product.id}
            type="button"
            onClick={() => onAddProduct(product.id)}
            className="cursor-pointer rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-left text-sm hover:border-[var(--color-brand)] hover:bg-[var(--color-brand)]/5"
          >
            <span className="block font-medium text-slate-800">{product.name}</span>
            <span className="tabular-nums text-xs text-slate-500">{priceLabel(product) ?? PESO.format(product.price)}</span>
          </button>
        ))}
        {visibleQuickItems.length === 0 && <p className="text-sm text-slate-400">{EMPTY_STATE_NO_QUICK_ITEMS}</p>}
      </div>
    </div>
  );
}
