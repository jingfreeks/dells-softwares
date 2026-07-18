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

/**
 * Effective per-unit price for a pack (e.g. 3 pcs for ₱5 → ₱1.67/pc).
 * products.price is always populated with this so every existing
 * price display keeps working unchanged; the pack fraction itself is
 * what checkout actually charges against (see lib/pos.ts lineTotal).
 */
export function packUnitPrice(packQuantity: number, packPrice: number): number {
  return Math.round((packPrice / packQuantity) * 100) / 100;
}

/** A short label for pack-priced products, e.g. "3 pcs for ₱5.00". */
export function packPriceLabel(product: Product): string | null {
  if (product.packQuantity == null || product.packPrice == null) return null;
  return `${product.packQuantity} pcs for ₱${product.packPrice.toFixed(2)}`;
}

/**
 * Find another product already using this barcode (story B1a — scanning a
 * barcode that already exists warns the admin instead of creating a
 * duplicate). Excludes the product currently being edited, if any.
 */
export function findDuplicateBarcode(
  products: Product[],
  barcode: string,
  excludeId: string | null
): Product | null {
  const trimmed = barcode.trim();
  if (!trimmed) return null;
  return products.find((p) => p.barcode === trimmed && p.id !== excludeId) ?? null;
}
