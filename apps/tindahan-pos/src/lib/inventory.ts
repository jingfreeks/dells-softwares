import type { Product } from "./types";

export type StockStatus = "out" | "low" | "in-stock";

/**
 * Stock status for a product against its per-product low-stock threshold
 * (story B5 — threshold is settable per product).
 */
export function stockStatus(product: Product): StockStatus {
  if (product.stock <= 0) return "out";
  if (product.stock <= product.lowStockThreshold) return "low";
  return "in-stock";
}

export function lowStockProducts(products: Product[]): Product[] {
  return products.filter((p) => stockStatus(p) !== "in-stock");
}

export function receiveStock(products: Product[], productId: string, quantity: number): Product[] {
  return products.map((p) =>
    p.id === productId ? { ...p, stock: p.stock + quantity } : p
  );
}

export function deductStockForSale(
  products: Product[],
  items: { productId: string; quantity: number }[]
): Product[] {
  return products.map((p) => {
    const sold = items.find((i) => i.productId === p.id);
    if (!sold) return p;
    return { ...p, stock: Math.max(0, p.stock - sold.quantity) };
  });
}
