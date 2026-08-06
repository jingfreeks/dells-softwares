import { describe, expect, it } from "vitest";
import { bestSellers, buildDailyReport, isToday, salesByCategory } from "../reports";
import type { Customer, Product, SaleRecord } from "../../types";

function makeCustomer(overrides: Partial<Customer> = {}): Customer {
  return {
    id: "c1",
    name: "Aling Rosa",
    phone: null,
    creditLimit: null,
    balance: 0,
    ...overrides,
  };
}

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
    imageUrl: null,
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
    paymentType: "cash",
    customerId: null,
    referenceNo: null,
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

function makeSaleItem(overrides: Partial<SaleRecord["items"][number]> = {}): SaleRecord["items"][number] {
  return {
    productId: "p1",
    name: "Item",
    quantity: 1,
    price: 10,
    itemType: "product",
    fee: 0,
    lineTotal: 10,
    ...overrides,
  };
}

describe("isToday", () => {
  const now = new Date("2026-07-27T15:00:00Z");

  it("is true for a timestamp on the same calendar day", () => {
    expect(isToday("2026-07-27T02:00:00Z", now)).toBe(true);
  });

  it("is false for a timestamp on a different day", () => {
    // A full day earlier so this holds regardless of the runner's local
    // timezone (isToday() intentionally compares in local time, since
    // that's what "today" means to a real store).
    expect(isToday("2026-07-25T15:00:00Z", now)).toBe(false);
  });
});

describe("bestSellers (admin daily report)", () => {
  it("sums quantities per product across sales and sorts highest first", () => {
    const sales = [
      makeSale({ items: [makeSaleItem({ productId: "a", name: "A", quantity: 2 })] }),
      makeSale({ items: [makeSaleItem({ productId: "b", name: "B", quantity: 5 })] }),
      makeSale({ items: [makeSaleItem({ productId: "a", name: "A", quantity: 1 })] }),
    ];
    expect(bestSellers(sales)).toEqual([
      { name: "B", quantity: 5 },
      { name: "A", quantity: 3 },
    ]);
  });

  it("excludes service line items, which have no product to rank", () => {
    const sales = [
      makeSale({
        items: [
          makeSaleItem({ productId: "a", name: "A", quantity: 1 }),
          makeSaleItem({ productId: "", name: "E-Load ₱100", quantity: 1, itemType: "service", fee: 5 }),
        ],
      }),
    ];
    expect(bestSellers(sales)).toEqual([{ name: "A", quantity: 1 }]);
  });

  it("caps results at the given limit", () => {
    const sales = [
      makeSale({
        items: [
          makeSaleItem({ productId: "a", name: "A", quantity: 3 }),
          makeSaleItem({ productId: "b", name: "B", quantity: 2 }),
          makeSaleItem({ productId: "c", name: "C", quantity: 1 }),
        ],
      }),
    ];
    expect(bestSellers(sales, 2)).toEqual([
      { name: "A", quantity: 3 },
      { name: "B", quantity: 2 },
    ]);
  });

  it("returns an empty list for no sales", () => {
    expect(bestSellers([])).toEqual([]);
  });
});

describe("buildDailyReport (admin PDF/dashboard source of truth)", () => {
  const now = new Date("2026-07-27T15:00:00Z");

  it("aggregates today's sales, low stock, totals, best sellers, and recent sales", () => {
    const products = [
      makeProduct({ id: "low", name: "Low item", stock: 1, lowStockThreshold: 5 }),
      makeProduct({ id: "ok", name: "OK item", stock: 50, lowStockThreshold: 5 }),
    ];
    const sales = [
      makeSale({
        id: "today",
        timestamp: "2026-07-27T10:00:00Z",
        total: 100,
        items: [makeSaleItem({ productId: "ok", name: "OK item", quantity: 2, lineTotal: 100 })],
      }),
      makeSale({ id: "yesterday", timestamp: "2026-07-26T10:00:00Z", total: 50 }),
    ];
    const customers = [makeCustomer({ balance: 300 }), makeCustomer({ id: "c2", balance: 200 })];

    const report = buildDailyReport(products, sales, customers, now);

    expect(report.todaysSalesTotal).toBe(100);
    expect(report.todaysTransactionCount).toBe(1);
    expect(report.salesChangePercent).toBe(100); // 100 vs 50 yesterday = +100%
    expect(report.utangOutstanding).toBe(500);
    expect(report.lowStock.map((p) => p.id)).toEqual(["low"]);
    expect(report.bestSellers).toEqual([{ name: "OK item", quantity: 2 }]);
    expect(report.recentSales.map((s) => s.id)).toEqual(["today", "yesterday"]);
    expect(report.generatedAt).toBe(now.toISOString());
  });

  it("has no sales change percent when yesterday had no sales", () => {
    const sales = [makeSale({ id: "today", timestamp: "2026-07-27T10:00:00Z", total: 100 })];
    const report = buildDailyReport([], sales, [], now);
    expect(report.salesChangePercent).toBeNull();
  });

  it("caps recent sales at 10 even when there are more", () => {
    const sales = Array.from({ length: 15 }, (_, i) =>
      makeSale({ id: `s${i}`, timestamp: "2026-07-27T10:00:00Z" })
    );
    const report = buildDailyReport([], sales, [], now);
    expect(report.recentSales).toHaveLength(10);
  });
});
