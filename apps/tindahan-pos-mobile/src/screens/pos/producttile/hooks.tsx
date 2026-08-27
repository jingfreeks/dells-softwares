import type { ProductTileProps } from "./types";

/** Derived display flags for ProductTile -- ProductTile.tsx stays presentational. */
export function useProductTile({ product, quantityInCart }: Pick<ProductTileProps, "product" | "quantityInCart">) {
  const inCart = quantityInCart > 0;
  const lowStock = product.stock > 0 && product.stock <= product.lowStockThreshold;
  return { inCart, lowStock };
}
