import type { CartLine, Product } from "./types";

export function addToCart(cart: CartLine[], product: Product, quantity = 1): CartLine[] {
  const existing = cart.find((line) => line.product.id === product.id);
  if (existing) {
    return cart.map((line) =>
      line.product.id === product.id
        ? { ...line, quantity: line.quantity + quantity }
        : line
    );
  }
  return [...cart, { product, quantity }];
}

export function removeFromCart(cart: CartLine[], productId: string): CartLine[] {
  return cart.filter((line) => line.product.id !== productId);
}

export function setQuantity(cart: CartLine[], productId: string, quantity: number): CartLine[] {
  if (quantity <= 0) return removeFromCart(cart, productId);
  return cart.map((line) =>
    line.product.id === productId ? { ...line, quantity } : line
  );
}

export function cartTotal(cart: CartLine[]): number {
  return cart.reduce((sum, line) => sum + line.product.price * line.quantity, 0);
}

export function cartItemCount(cart: CartLine[]): number {
  return cart.reduce((sum, line) => sum + line.quantity, 0);
}

/**
 * Change due for a cash payment. Returns null if the amount tendered is
 * insufficient to cover the total (story A5).
 */
export function computeChange(total: number, amountTendered: number): number | null {
  if (amountTendered < total) return null;
  return Math.round((amountTendered - total) * 100) / 100;
}

export function findProductByBarcode(products: Product[], barcode: string): Product | undefined {
  return products.find((p) => p.barcode === barcode);
}

export function searchProductsByName(products: Product[], query: string): Product[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return products.filter((p) => p.name.toLowerCase().includes(q));
}
