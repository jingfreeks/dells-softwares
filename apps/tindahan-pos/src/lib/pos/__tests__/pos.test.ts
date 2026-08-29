import { describe, expect, it } from "vitest";
import {
  addToCart,
  cartItemCount,
  cartTotal,
  computeChange,
  findInsufficientStock,
  formatInsufficientStockMessage,
  findProductByBarcode,
  lineTotal,
  removeFromCart,
  searchProductsByName,
  setQuantity,
} from "../pos";
import type { CartLine, Product } from "../../types";

const chips: Product = {
  id: "p1",
  barcode: "1111",
  name: "Chips",
  price: 20,
  stock: 10,
  lowStockThreshold: 5,
  categoryId: "cat-snacks",
  category: "Snacks",
  packQuantity: null,
  packPrice: null,
  imageUrl: null,
  cost: null,
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
  packQuantity: null,
  packPrice: null,
  imageUrl: null,
  cost: null,
};

const candy: Product = {
  id: "p3",
  barcode: null,
  name: "Candy",
  price: 1.67,
  stock: 30,
  lowStockThreshold: 5,
  categoryId: "cat-snacks",
  category: "Snacks",
  packQuantity: 3,
  packPrice: 5,
  imageUrl: null,
  cost: null,
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

  it("caps quantity at available stock instead of overselling (soda has 4 in stock)", () => {
    const cart = addToCart([], soda, 6);
    expect(cart[0].quantity).toBe(4);
  });

  it("caps a repeated scan at available stock once the line is already at the limit", () => {
    const atLimit: CartLine[] = [{ product: soda, quantity: 4 }];
    const cart = addToCart(atLimit, soda);
    expect(cart).toEqual(atLimit);
  });

  it("does not add a line for a product with zero or negative stock", () => {
    const outOfStock = { ...soda, stock: 0 };
    expect(addToCart([], outOfStock)).toEqual([]);
    expect(addToCart([], { ...soda, stock: -2 })).toEqual([]);
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

  it("caps the target quantity at available stock (soda has 4 in stock)", () => {
    const result = setQuantity(cart, soda.id, 9);
    expect(result.find((l) => l.product.id === soda.id)?.quantity).toBe(4);
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

  it("sums pack-priced lines using lineTotal, not qty * price", () => {
    const cart: CartLine[] = [{ product: candy, quantity: 3 }];
    expect(cartTotal(cart)).toBe(5);
  });
});

describe("lineTotal (pack pricing, e.g. '3 pcs for ₱5')", () => {
  it("charges the exact pack price when buying a full pack", () => {
    expect(lineTotal(candy, 3)).toBe(5);
  });

  it("charges an exact multiple for multiple full packs", () => {
    expect(lineTotal(candy, 6)).toBe(10);
  });

  it("is proportional for a partial-pack quantity, rounded to the centavo", () => {
    expect(lineTotal(candy, 1)).toBeCloseTo(1.67, 2);
    expect(lineTotal(candy, 2)).toBeCloseTo(3.33, 2);
  });

  it("falls back to price * quantity for a regular (non-pack) product", () => {
    expect(lineTotal(chips, 2)).toBe(40);
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

describe("findInsufficientStock (checkout validation)", () => {
  it("reports every overstocked cart line with the stock currently available", () => {
    const shortages = findInsufficientStock([
      { product: chips, quantity: 11 },
      { product: soda, quantity: 6 },
    ]);

    expect(shortages).toEqual([
      { productId: "p1", productName: "Chips", availableQuantity: 10 },
      { productId: "p2", productName: "Soda", availableQuantity: 4 },
    ]);
    expect(formatInsufficientStockMessage(shortages)).toBe(
      "Chips: Insufficient stock. Only 10 item(s) available. Soda: Insufficient stock. Only 4 item(s) available."
    );
  });

  it("treats negative stock as zero and permits an in-stock line", () => {
    const negativeStockProduct = { ...chips, stock: -3 };
    expect(findInsufficientStock([{ product: negativeStockProduct, quantity: 1 }])).toEqual([
      { productId: "p1", productName: "Chips", availableQuantity: 0 },
    ]);
    expect(findInsufficientStock([{ product: soda, quantity: 4 }])).toEqual([]);
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
