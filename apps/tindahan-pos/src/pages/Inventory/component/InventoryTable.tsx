import type { Product } from "@/lib";
import { PESO, TABLE_HEADER_PRODUCT, LABEL_CATEGORY, TABLE_HEADER_BARCODE, LABEL_PRICE, TABLE_HEADER_STOCK, TABLE_HEADER_STATUS, TABLE_HEADER_ACTIONS, BUTTON_PLUS_10_STOCK, BUTTON_EDIT, BUTTON_DELETE, TEXT_NO_PRODUCTS_MATCH_PREFIX } from "@/lib";
import { packPriceLabel, stockStatus } from "@/lib/inventory";
import { StockBadge, ImagePlaceholderIcon } from "@/components";

interface InventoryTableProps {
  loading: boolean;
  pageProducts: Product[];
  filteredCount: number;
  query: string;
  packPricingEnabled: boolean;
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
  onRestock,
  onEdit,
  onRemove,
}: InventoryTableProps) {
  return (
    <div className="mt-4 overflow-x-auto card">
      <table className="w-full text-sm">
        <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-4 py-3">{TABLE_HEADER_PRODUCT}</th>
            <th className="px-4 py-3">{LABEL_CATEGORY}</th>
            <th className="px-4 py-3">{TABLE_HEADER_BARCODE}</th>
            <th className="px-4 py-3">{LABEL_PRICE}</th>
            <th className="px-4 py-3">{TABLE_HEADER_STOCK}</th>
            <th className="px-4 py-3">{TABLE_HEADER_STATUS}</th>
            <th className="px-4 py-3">{TABLE_HEADER_ACTIONS}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {loading &&
            Array.from({ length: 5 }).map((_, i) => (
              <tr key={i}>
                <td colSpan={7} className="px-4 py-3">
                  <div className="h-4 w-full animate-pulse rounded bg-slate-100" />
                </td>
              </tr>
            ))}
          {!loading &&
            pageProducts.map((product) => (
              <tr key={product.id} className="hover:bg-slate-50/60">
                <td className="px-4 py-3 font-medium text-slate-800">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
                      {product.imageUrl ? (
                        <img src={product.imageUrl} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <ImagePlaceholderIcon className="h-4 w-4 text-slate-300" />
                      )}
                    </div>
                    {product.name}
                  </div>
                </td>
                <td className="px-4 py-3 text-slate-500">{product.category}</td>
                <td className="px-4 py-3 font-mono text-xs text-slate-500">{product.barcode ?? "—"}</td>
                <td className="tabular-nums px-4 py-3 text-slate-700">
                  {PESO.format(product.price)}
                  {packPricingEnabled && packPriceLabel(product) && (
                    <span className="block text-xs text-slate-400">{packPriceLabel(product)}</span>
                  )}
                </td>
                <td className="tabular-nums px-4 py-3 text-slate-700">{product.stock}</td>
                <td className="px-4 py-3">
                  <StockBadge status={stockStatus(product)} />
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-1 text-xs">
                    <button
                      type="button"
                      onClick={() => onRestock(product.id)}
                      className="flex min-h-11 cursor-pointer items-center px-2 text-slate-600 hover:underline"
                    >
                      {BUTTON_PLUS_10_STOCK}
                    </button>
                    <button
                      type="button"
                      onClick={() => onEdit(product)}
                      className="flex min-h-11 cursor-pointer items-center px-2 text-slate-600 hover:underline"
                    >
                      {BUTTON_EDIT}
                    </button>
                    <button
                      type="button"
                      onClick={() => onRemove(product.id)}
                      className="flex min-h-11 cursor-pointer items-center px-2 text-red-600 hover:underline"
                    >
                      {BUTTON_DELETE}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          {!loading && filteredCount === 0 && (
            <tr>
              <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                {TEXT_NO_PRODUCTS_MATCH_PREFIX} "{query}".
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
