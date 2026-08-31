import { bestSellers, buildDailyReport, salesByCategory, salesByPaymentType } from "../reports";
import type { Customer, Product, SaleRecord } from "../types";

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
    status: "completed",
    ...overrides,
  };
}

function makeSaleItem(overrides: Partial<SaleRecord["items"][number]> = {}): SaleRecord["items"][number] {
  return { productId: "p1", name: "Item", quantity: 1, price: 10, itemType: "product", fee: 0, lineTotal: 10, ...overrides };
}

describe("salesByCategory", () => {
  it("groups product sales by their product's category", () => {
    const products = [
      makeProduct({ id: "chips", category: "Snacks" }),
      makeProduct({ id: "soda", category: "Drinks" }),
    ];
    const sales = [
      makeSale({
        items: [
          makeSaleItem({ productId: "chips", name: "Chips", quantity: 2, price: 20, lineTotal: 40 }),
          makeSaleItem({ productId: "soda", name: "Soda", quantity: 1, price: 35, lineTotal: 35 }),
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

  it("buckets service line items under 'Services', including the fee", () => {
    const sales = [
      makeSale({
        items: [makeSaleItem({ productId: "", name: "E-Load ₱100", quantity: 1, price: 100, itemType: "service", fee: 5, lineTotal: 105 })],
      }),
    ];
    expect(salesByCategory(sales, []).rows).toEqual([{ category: "Services", total: 105 }]);
  });

  it("falls back to 'Other' for a product sale item whose product no longer exists", () => {
    const sales = [makeSale({ items: [makeSaleItem({ productId: "deleted", name: "Gone", quantity: 1, lineTotal: 10 })] })];
    expect(salesByCategory(sales, []).rows).toEqual([{ category: "Other", total: 10 }]);
  });

  it("sorts categories highest total first", () => {
    const products = [makeProduct({ id: "a", category: "Snacks" }), makeProduct({ id: "b", category: "Drinks" })];
    const sales = [
      makeSale({
        items: [
          makeSaleItem({ productId: "a", name: "A", quantity: 1, price: 10, lineTotal: 10 }),
          makeSaleItem({ productId: "b", name: "B", quantity: 1, price: 50, lineTotal: 50 }),
        ],
      }),
    ];
    expect(salesByCategory(sales, products).rows.map((r) => r.category)).toEqual(["Drinks", "Snacks"]);
  });

  it("returns empty rows and a zero grand total for no sales", () => {
    expect(salesByCategory([], [])).toEqual({ rows: [], grandTotal: 0 });
  });
});

describe("bestSellers", () => {
  it("sums quantities and revenue per product across sales, and counts distinct transactions", () => {
    const products = [makeProduct({ id: "a", category: "Snacks" }), makeProduct({ id: "b", category: "Drinks" })];
    const sales = [
      makeSale({ id: "s1", items: [makeSaleItem({ productId: "a", name: "A", quantity: 2, lineTotal: 20 })] }),
      makeSale({ id: "s2", items: [makeSaleItem({ productId: "b", name: "B", quantity: 5, lineTotal: 50 })] }),
      makeSale({ id: "s3", items: [makeSaleItem({ productId: "a", name: "A", quantity: 1, lineTotal: 10 })] }),
    ];
    expect(bestSellers(sales, products)).toEqual([
      { productId: "b", name: "B", category: "Drinks", quantity: 5, revenue: 50, transactionCount: 1 },
      { productId: "a", name: "A", category: "Snacks", quantity: 3, revenue: 30, transactionCount: 2 },
    ]);
  });

  it("excludes service line items, which have no product to rank", () => {
    const products = [makeProduct({ id: "a", category: "Snacks" })];
    const sales = [
      makeSale({
        items: [
          makeSaleItem({ productId: "a", name: "A", quantity: 1, lineTotal: 10 }),
          makeSaleItem({ productId: "", name: "E-Load ₱100", quantity: 1, itemType: "service", fee: 5 }),
        ],
      }),
    ];
    expect(bestSellers(sales, products).map((b) => b.name)).toEqual(["A"]);
  });

  it("falls back to 'Other' for a product that no longer exists", () => {
    const sales = [makeSale({ items: [makeSaleItem({ productId: "gone", name: "Gone", quantity: 1 })] })];
    const [entry] = bestSellers(sales, []);
    expect(entry).toMatchObject({ category: "Other" });
  });

  it("caps results at the given limit", () => {
    const products = [makeProduct({ id: "a" }), makeProduct({ id: "b" }), makeProduct({ id: "c" })];
    const sales = [
      makeSale({
        items: [
          makeSaleItem({ productId: "a", name: "A", quantity: 3 }),
          makeSaleItem({ productId: "b", name: "B", quantity: 2 }),
          makeSaleItem({ productId: "c", name: "C", quantity: 1 }),
        ],
      }),
    ];
    expect(bestSellers(sales, products, 2).map((b) => b.name)).toEqual(["A", "B"]);
  });

  it("returns an empty list for no sales", () => {
    expect(bestSellers([], [])).toEqual([]);
  });
});

describe("salesByPaymentType", () => {
  it("groups sales by payment type, highest total first", () => {
    const sales = [
      makeSale({ id: "s1", paymentType: "cash", total: 100 }),
      makeSale({ id: "s2", paymentType: "qr", total: 50 }),
      makeSale({ id: "s3", paymentType: "cash", total: 30 }),
    ];
    expect(salesByPaymentType(sales)).toEqual([
      { paymentType: "cash", total: 130, transactionCount: 2 },
      { paymentType: "qr", total: 50, transactionCount: 1 },
    ]);
  });

  it("returns an empty list for no sales", () => {
    expect(salesByPaymentType([])).toEqual([]);
  });
});

describe("buildDailyReport", () => {
  const now = new Date("2026-07-27T15:00:00Z");

  it("aggregates the given day's sales, low stock, totals, best sellers, and recent sales", () => {
    const products = [
      makeProduct({ id: "low", name: "Low item", stock: 1, lowStockThreshold: 5 }),
      makeProduct({ id: "ok", name: "OK item", stock: 50, lowStockThreshold: 5, category: "Misc" }),
    ];
    const daySales = [
      makeSale({
        id: "today",
        timestamp: "2026-07-27T10:00:00Z",
        total: 100,
        items: [makeSaleItem({ productId: "ok", name: "OK item", quantity: 2, lineTotal: 100 })],
      }),
    ];
    const previousDaySales = [makeSale({ id: "yesterday", timestamp: "2026-07-26T10:00:00Z", total: 50 })];
    const customers = [makeCustomer({ balance: 300 }), makeCustomer({ id: "c2", balance: 200 })];

    const report = buildDailyReport(products, daySales, previousDaySales, daySales, customers, now);

    expect(report.todaysSalesTotal).toBe(100);
    expect(report.todaysTransactionCount).toBe(1);
    expect(report.salesChangePercent).toBe(100); // 100 vs 50 previous day = +100%
    expect(report.utangOutstanding).toBe(500);
    expect(report.lowStock.map((p) => p.id)).toEqual(["low"]);
    expect(report.bestSellers.map((b) => b.name)).toEqual(["OK item"]);
    expect(report.recentSales.map((s) => s.id)).toEqual(["today"]);
    expect(report.generatedAt).toBe(now.toISOString());
  });

  it("has no sales change percent when the previous day had no sales", () => {
    const daySales = [makeSale({ id: "today", timestamp: "2026-07-27T10:00:00Z", total: 100 })];
    const report = buildDailyReport([], daySales, [], daySales, [], now);
    expect(report.salesChangePercent).toBeNull();
  });

  it("caps recent sales at 10 even when there are more", () => {
    const daySales = Array.from({ length: 15 }, (_, i) => makeSale({ id: `s${i}`, timestamp: "2026-07-27T10:00:00Z" }));
    const report = buildDailyReport([], daySales, [], daySales, [], now);
    expect(report.recentSales).toHaveLength(10);
  });

  it("excludes a voided sale from totals/transactionCount but keeps recentSales completed-only", () => {
    const daySales = [
      makeSale({ id: "good", timestamp: "2026-07-27T10:00:00Z", total: 100 }),
      makeSale({ id: "voided", timestamp: "2026-07-27T11:00:00Z", total: 999, status: "voided" }),
    ];
    const report = buildDailyReport([], daySales, [], daySales, [], now);
    expect(report.todaysSalesTotal).toBe(100);
    expect(report.todaysTransactionCount).toBe(1);
    expect(report.recentSales.map((s) => s.id)).toEqual(["good"]);
  });
});
