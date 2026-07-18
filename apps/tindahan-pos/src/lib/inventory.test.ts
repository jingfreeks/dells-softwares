import { describe, expect, it } from "vitest";
import { deductStockForSale, lowStockProducts, receiveStock, stockStatus } from "./inventory";
import type { Product } from "./types";

function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: "p1",
    barcode: "1111",
    name: "Test Product",
    price: 10,
    stock: 20,
    lowStockThreshold: 5,
    categoryId: "cat-misc",
    category: "Misc",
    ...overrides,
  };
}

describe("stockStatus (story B5)", () => {
  it("is 'in-stock' when stock is above the threshold", () => {
    expect(stockStatus(makeProduct({ stock: 20, lowStockThreshold: 5 }))).toBe("in-stock");
  });

  it("is 'low' when stock is at or below the threshold but positive", () => {
    expect(stockStatus(makeProduct({ stock: 5, lowStockThreshold: 5 }))).toBe("low");
    expect(stockStatus(makeProduct({ stock: 1, lowStockThreshold: 5 }))).toBe("low");
  });

  it("is 'out' when stock is zero", () => {
    expect(stockStatus(makeProduct({ stock: 0, lowStockThreshold: 5 }))).toBe("out");
  });

  it("respects a per-product threshold, not a hardcoded one", () => {
    const strict = makeProduct({ stock: 8, lowStockThreshold: 10 });
    const lenient = makeProduct({ stock: 8, lowStockThreshold: 2 });
    expect(stockStatus(strict)).toBe("low");
    expect(stockStatus(lenient)).toBe("in-stock");
  });
});

describe("lowStockProducts", () => {
  it("returns only products that are low or out of stock", () => {
    const products = [
      makeProduct({ id: "a", stock: 20, lowStockThreshold: 5 }),
      makeProduct({ id: "b", stock: 3, lowStockThreshold: 5 }),
      makeProduct({ id: "c", stock: 0, lowStockThreshold: 5 }),
    ];
    expect(lowStockProducts(products).map((p) => p.id)).toEqual(["b", "c"]);
  });

  it("returns an empty array when everything is well stocked", () => {
    const products = [makeProduct({ stock: 50, lowStockThreshold: 5 })];
    expect(lowStockProducts(products)).toEqual([]);
  });
});

describe("receiveStock (story B4)", () => {
  it("adds quantity to the matching product only", () => {
    const products = [makeProduct({ id: "a", stock: 10 }), makeProduct({ id: "b", stock: 10 })];
    const result = receiveStock(products, "a", 15);
    expect(result.find((p) => p.id === "a")?.stock).toBe(25);
    expect(result.find((p) => p.id === "b")?.stock).toBe(10);
  });
});

describe("deductStockForSale (story A6)", () => {
  it("deducts the sold quantity from matching products", () => {
    const products = [makeProduct({ id: "a", stock: 10 }), makeProduct({ id: "b", stock: 10 })];
    const result = deductStockForSale(products, [{ productId: "a", quantity: 3 }]);
    expect(result.find((p) => p.id === "a")?.stock).toBe(7);
    expect(result.find((p) => p.id === "b")?.stock).toBe(10);
  });

  it("never lets stock go below zero", () => {
    const products = [makeProduct({ id: "a", stock: 2 })];
    const result = deductStockForSale(products, [{ productId: "a", quantity: 5 }]);
    expect(result.find((p) => p.id === "a")?.stock).toBe(0);
  });
});
