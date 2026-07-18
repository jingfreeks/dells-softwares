import { describe, expect, it } from "vitest";
import {
  addToCart,
  cartItemCount,
  cartTotal,
  computeChange,
  findProductByBarcode,
  removeFromCart,
  searchProductsByName,
  setQuantity,
} from "./pos";
import type { CartLine, Product } from "./types";

const chips: Product = {
  id: "p1",
  barcode: "1111",
  name: "Chips",
  price: 20,
  stock: 10,
  lowStockThreshold: 5,
  categoryId: "cat-snacks",
  category: "Snacks",
};

const soda: Product = {
  id: "p2",
  barcode: "2222",
  name: "Soda",
  price: 35,
  stock: 4,
  lowStockThreshold: 5,
  categoryId: "cat-drinks",
  category: "Drinks",
};

describe("addToCart", () => {
  it("adds a new product as a new cart line", () => {
    const cart = addToCart([], chips);
    expect(cart).toEqual([{ product: chips, quantity: 1 }]);
  });

  it("increments quantity when the same product is scanned again (story A3)", () => {
    const cart = addToCart(addToCart([], chips), chips);
    expect(cart).toEqual([{ product: chips, quantity: 2 }]);
  });

  it("adds a custom quantity in one call", () => {
    const cart = addToCart([], chips, 3);
    expect(cart[0].quantity).toBe(3);
  });

  it("does not mutate the product it's given multiple lines for other items", () => {
    const cart = addToCart(addToCart([], chips), soda);
    expect(cart).toHaveLength(2);
  });
});

describe("removeFromCart / setQuantity (story A7)", () => {
  const cart: CartLine[] = [
    { product: chips, quantity: 2 },
    { product: soda, quantity: 1 },
  ];

  it("removes only the targeted line", () => {
    const result = removeFromCart(cart, chips.id);
    expect(result).toEqual([{ product: soda, quantity: 1 }]);
  });

  it("updates quantity for the targeted line", () => {
    const result = setQuantity(cart, chips.id, 5);
    expect(result.find((l) => l.product.id === chips.id)?.quantity).toBe(5);
  });

  it("removes the line entirely when quantity drops to zero or below", () => {
    const result = setQuantity(cart, chips.id, 0);
    expect(result.some((l) => l.product.id === chips.id)).toBe(false);
  });
});

describe("cartTotal / cartItemCount", () => {
  it("sums price * quantity across all lines", () => {
    const cart: CartLine[] = [
      { product: chips, quantity: 2 }, // 40
      { product: soda, quantity: 1 }, // 35
    ];
    expect(cartTotal(cart)).toBe(75);
  });

  it("returns 0 for an empty cart", () => {
    expect(cartTotal([])).toBe(0);
  });

  it("counts total units, not line count", () => {
    const cart: CartLine[] = [
      { product: chips, quantity: 2 },
      { product: soda, quantity: 3 },
    ];
    expect(cartItemCount(cart)).toBe(5);
  });
});

describe("computeChange (story A5)", () => {
  it("returns the correct change for a sufficient payment", () => {
    expect(computeChange(75, 100)).toBe(25);
  });

  it("returns 0 when the amount tendered exactly matches the total", () => {
    expect(computeChange(50, 50)).toBe(0);
  });

  it("returns null when the amount tendered is insufficient", () => {
    expect(computeChange(75, 50)).toBeNull();
  });

  it("rounds to the nearest centavo", () => {
    expect(computeChange(10.1, 20)).toBeCloseTo(9.9, 2);
  });
});

describe("findProductByBarcode (story A1)", () => {
  const products = [chips, soda];

  it("finds a product by exact barcode match", () => {
    expect(findProductByBarcode(products, "2222")).toBe(soda);
  });

  it("returns undefined for an unknown barcode", () => {
    expect(findProductByBarcode(products, "9999")).toBeUndefined();
  });
});

describe("searchProductsByName (story A2)", () => {
  const products = [chips, soda];

  it("matches case-insensitively on a substring", () => {
    expect(searchProductsByName(products, "CHI")).toEqual([chips]);
  });

  it("returns an empty array for a blank query", () => {
    expect(searchProductsByName(products, "   ")).toEqual([]);
  });

  it("returns an empty array when nothing matches", () => {
    expect(searchProductsByName(products, "nonexistent")).toEqual([]);
  });
});
