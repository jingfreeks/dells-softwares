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

export interface ReceivingLine {
  productId: string;
  productName: string;
  quantity: number;
  costEach: number;
}

/** Total cost of a receiving entry (story E2 — "optionally cost"). */
export function receivingTotalCost(lines: ReceivingLine[]): number {
  return lines.reduce((sum, l) => sum + l.quantity * l.costEach, 0);
}

/** Preview of a product's stock before/after a pending receiving line. */
export function stockPreview(
  products: Product[],
  productId: string,
  quantity: number
): { old: number; next: number } | null {
  const product = products.find((p) => p.id === productId);
  if (!product) return null;
  return { old: product.stock, next: product.stock + quantity };
}
