import { describe, expect, it } from "vitest";
import { salesByCategory } from "./reports";
import type { Product, SaleRecord } from "./types";

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
    packQuantity: null,
    packPrice: null,
    ...overrides,
  };
}

function makeSale(overrides: Partial<SaleRecord> = {}): SaleRecord {
  return {
    id: "s1",
    timestamp: "2026-07-18T10:00:00Z",
    total: 0,
    cashierName: "Cashier",
    items: [],
    ...overrides,
  };
}

describe("salesByCategory (story E5)", () => {
  it("groups product sales by their product's category", () => {
    const products = [
      makeProduct({ id: "chips", category: "Snacks" }),
      makeProduct({ id: "soda", category: "Drinks" }),
    ];
    const sales = [
      makeSale({
        items: [
          {
            productId: "chips",
            name: "Chips",
            quantity: 2,
            price: 20,
            itemType: "product",
            fee: 0,
            lineTotal: 40,
          },
          {
            productId: "soda",
            name: "Soda",
            quantity: 1,
            price: 35,
            itemType: "product",
            fee: 0,
            lineTotal: 35,
          },
        ],
      }),
    ];
    const result = salesByCategory(sales, products);
    expect(result.rows).toEqual([
      { category: "Snacks", total: 40 },
      { category: "Drinks", total: 35 },
    ]);
    expect(result.grandTotal).toBe(75);
  });

  it("buckets service line items under 'Services', including the fee (story E3)", () => {
    const sales = [
      makeSale({
        items: [
          {
            productId: "",
            name: "E-Load ₱100",
            quantity: 1,
            price: 100,
            itemType: "service",
            fee: 5,
            lineTotal: 105,
          },
        ],
      }),
    ];
    const result = salesByCategory(sales, []);
    expect(result.rows).toEqual([{ category: "Services", total: 105 }]);
  });

  it("falls back to 'Other' for a product sale item whose product no longer exists", () => {
    const sales = [
      makeSale({
        items: [
          {
            productId: "deleted",
            name: "Gone",
            quantity: 1,
            price: 10,
            itemType: "product",
            fee: 0,
            lineTotal: 10,
          },
        ],
      }),
    ];
    const result = salesByCategory(sales, []);
    expect(result.rows).toEqual([{ category: "Other", total: 10 }]);
  });

  it("sorts categories highest total first", () => {
    const products = [
      makeProduct({ id: "a", category: "Snacks" }),
      makeProduct({ id: "b", category: "Drinks" }),
    ];
    const sales = [
      makeSale({
        items: [
          { productId: "a", name: "A", quantity: 1, price: 10, itemType: "product", fee: 0, lineTotal: 10 },
          { productId: "b", name: "B", quantity: 1, price: 50, itemType: "product", fee: 0, lineTotal: 50 },
        ],
      }),
    ];
    const result = salesByCategory(sales, products);
    expect(result.rows.map((r) => r.category)).toEqual(["Drinks", "Snacks"]);
  });

  it("uses lineTotal directly, so a pack-priced line's exact total is preserved", () => {
    const products = [makeProduct({ id: "candy", category: "Snacks", packQuantity: 3, packPrice: 5 })];
    const sales = [
      makeSale({
        items: [
          {
            productId: "candy",
            name: "Candy",
            quantity: 3,
            price: 1.67,
            itemType: "product",
            fee: 0,
            lineTotal: 5,
          },
        ],
      }),
    ];
    const result = salesByCategory(sales, products);
    expect(result.rows).toEqual([{ category: "Snacks", total: 5 }]);
  });

  it("returns empty rows and a zero grand total for no sales", () => {
    expect(salesByCategory([], [])).toEqual({ rows: [], grandTotal: 0 });
  });

  it("falls back to quantity * price + fee if lineTotal is missing (schema/deploy-order mismatch)", () => {
    const products = [makeProduct({ id: "a", category: "Snacks" })];
    const sales = [
      makeSale({
        items: [
          {
            productId: "a",
            name: "A",
            quantity: 2,
            price: 10,
            itemType: "product",
            fee: 0,
            lineTotal: null as unknown as number,
          },
        ],
      }),
    ];
    const result = salesByCategory(sales, products);
    expect(result.rows).toEqual([{ category: "Snacks", total: 20 }]);
  });
});
