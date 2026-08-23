import { describe, expect, it } from "vitest";
import {
  bestSellers,
  buildDailyReport,
  buildRangeReport,
  completedSales,
  isToday,
  receiptNumberRange,
  salesByCategory,
  salesByCashier,
  salesByPaymentType,
  totalDiscounts,
  vatSummary,
  voidSummary,
} from "../reports";
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
    cost: null,
    ...overrides,
  };
}

function makeSale(overrides: Partial<SaleRecord> = {}): SaleRecord {
  return {
    id: "s1",
    timestamp: "2026-07-18T10:00:00Z",
    total: 0,
    cashierName: "Cashier",
    cashierId: "staff-1",
    items: [],
    paymentType: "cash",
    customerId: null,
    referenceNo: null,
    receiptNumber: null,
    status: "completed",
    voidedAt: null,
    voidedByName: null,
    voidReason: null,
    vatStatus: "non_vat",
    vatRate: null,
    vatableSales: 0,
    vatAmount: 0,
    vatExemptSales: 0,
    zeroRatedSales: 0,
    deviceId: null,
    deviceName: null,
    discountType: null,
    discountValue: null,
    discountAmount: 0,
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
            id: "si-chips",
            productId: "chips",
            name: "Chips",
            quantity: 2,
            price: 20,
            itemType: "product",
            fee: 0,
            lineTotal: 40,
          },
          {
            id: "si-soda",
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
            id: "si-eload",
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
            id: "si-gone",
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
          { id: "si-a", productId: "a", name: "A", quantity: 1, price: 10, itemType: "product", fee: 0, lineTotal: 10 },
          { id: "si-b", productId: "b", name: "B", quantity: 1, price: 50, itemType: "product", fee: 0, lineTotal: 50 },
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
            id: "si-candy",
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
            id: "si-a2",
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
    id: "sale-item-1",
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
  it("sums quantities and revenue per product across sales, and counts distinct transactions", () => {
    const products = [makeProduct({ id: "a", barcode: "1234", category: "Snacks" }), makeProduct({ id: "b", barcode: "5678", category: "Drinks" })];
    const sales = [
      makeSale({ id: "s1", items: [makeSaleItem({ productId: "a", name: "A", quantity: 2, lineTotal: 20 })] }),
      makeSale({ id: "s2", items: [makeSaleItem({ productId: "b", name: "B", quantity: 5, lineTotal: 50 })] }),
      makeSale({ id: "s3", items: [makeSaleItem({ productId: "a", name: "A", quantity: 1, lineTotal: 10 })] }),
    ];
    expect(bestSellers(sales, products)).toEqual([
      { productId: "b", name: "B", barcode: "5678", category: "Drinks", quantity: 5, revenue: 50, transactionCount: 1 },
      { productId: "a", name: "A", barcode: "1234", category: "Snacks", quantity: 3, revenue: 30, transactionCount: 2 },
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

  it("falls back to 'Other' and no barcode for a product that no longer exists", () => {
    const sales = [makeSale({ items: [makeSaleItem({ productId: "gone", name: "Gone", quantity: 1 })] })];
    const [entry] = bestSellers(sales, []);
    expect(entry).toMatchObject({ category: "Other", barcode: null });
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

describe("buildDailyReport (admin dashboard source of truth)", () => {
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
    const daySales = Array.from({ length: 15 }, (_, i) =>
      makeSale({ id: `s${i}`, timestamp: "2026-07-27T10:00:00Z" })
    );
    const report = buildDailyReport([], daySales, [], daySales, [], now);
    expect(report.recentSales).toHaveLength(10);
  });
});

describe("salesByCashier", () => {
  it("groups sales by cashier, highest total first", () => {
    const sales = [
      makeSale({ id: "s1", cashierId: "c1", cashierName: "Aling Nena", total: 100 }),
      makeSale({ id: "s2", cashierId: "c2", cashierName: "Mang Jose", total: 50 }),
      makeSale({ id: "s3", cashierId: "c1", cashierName: "Aling Nena", total: 30 }),
    ];
    expect(salesByCashier(sales)).toEqual([
      { cashierId: "c1", cashierName: "Aling Nena", total: 130, transactionCount: 2 },
      { cashierId: "c2", cashierName: "Mang Jose", total: 50, transactionCount: 1 },
    ]);
  });

  it("buckets sales with no cashier id together under their reported name", () => {
    const sales = [
      makeSale({ id: "s1", cashierId: null, cashierName: "Unknown", total: 20 }),
      makeSale({ id: "s2", cashierId: null, cashierName: "Unknown", total: 15 }),
    ];
    expect(salesByCashier(sales)).toEqual([
      { cashierId: null, cashierName: "Unknown", total: 35, transactionCount: 2 },
    ]);
  });
});

describe("buildRangeReport", () => {
  it("computes total, count, and average across the given sales", () => {
    const sales = [
      makeSale({ id: "s1", total: 100 }),
      makeSale({ id: "s2", total: 50 }),
    ];
    const report = buildRangeReport(sales, []);
    expect(report.totalSales).toBe(150);
    expect(report.transactionCount).toBe(2);
    expect(report.averageSale).toBe(75);
    expect(report.sales).toBe(sales);
  });

  it("reports a zero average sale for an empty range instead of NaN", () => {
    const report = buildRangeReport([], []);
    expect(report.totalSales).toBe(0);
    expect(report.transactionCount).toBe(0);
    expect(report.averageSale).toBe(0);
  });

  it("includes per-cashier, best-seller, and category breakdowns", () => {
    const products = [makeProduct({ id: "p1", category: "Snacks" })];
    const sales = [
      makeSale({
        id: "s1",
        cashierId: "c1",
        cashierName: "Aling Nena",
        total: 20,
        items: [
          { id: "si-chips2", productId: "p1", name: "Chips", quantity: 2, price: 10, itemType: "product", fee: 0, lineTotal: 20 },
        ],
      }),
    ];
    const report = buildRangeReport(sales, products);
    expect(report.byCashier).toEqual([
      { cashierId: "c1", cashierName: "Aling Nena", total: 20, transactionCount: 1 },
    ]);
    expect(report.bestSellers.map((b) => b.name)).toEqual(["Chips"]);
    expect(report.categoryTotals.rows).toEqual([{ category: "Snacks", total: 20 }]);
  });
});

describe("void support (BIR compliance §39) — a voided sale is never counted, but stays visible", () => {
  const products = [makeProduct({ id: "p1", category: "Snacks" })];
  const completed = makeSale({ id: "s1", total: 20, status: "completed" });
  const voided = makeSale({
    id: "s2",
    total: 30,
    status: "voided",
    items: [
      { id: "si-chips3", productId: "p1", name: "Chips", quantity: 3, price: 10, itemType: "product", fee: 0, lineTotal: 30 },
    ],
  });

  it("completedSales() drops voided rows only", () => {
    expect(completedSales([completed, voided])).toEqual([completed]);
  });

  it("salesByCategory excludes a voided sale's items from the total", () => {
    const result = salesByCategory([completed, voided], products);
    expect(result.grandTotal).toBe(0);
  });

  it("bestSellers excludes a voided sale's quantity/revenue", () => {
    const result = bestSellers([voided], products);
    expect(result).toEqual([]);
  });

  it("salesByCashier excludes a voided sale from the cashier's total", () => {
    const result = salesByCashier([{ ...voided, cashierId: "c1", cashierName: "Aling Nena" }]);
    expect(result).toEqual([]);
  });

  it("buildRangeReport excludes voided from every aggregate but keeps it in `sales`", () => {
    const report = buildRangeReport([completed, voided], products);
    expect(report.totalSales).toBe(20);
    expect(report.transactionCount).toBe(1);
    expect(report.sales).toEqual([completed, voided]);
  });

  it("buildDailyReport excludes voided from totals/transactionCount but keeps recentSales completed-only", () => {
    const now = new Date("2026-07-30T12:00:00Z");
    const report = buildDailyReport([...products], [completed, voided], [], [], [], now);
    expect(report.todaysSalesTotal).toBe(20);
    expect(report.todaysTransactionCount).toBe(1);
    expect(report.recentSales).toEqual([completed]);
  });
});

describe("vatSummary", () => {
  it("sums VAT breakdown fields across mixed VAT statuses, excluding a voided sale", () => {
    const sales = [
      makeSale({ id: "s1", vatStatus: "vat_registered", vatableSales: 100, vatAmount: 12 }),
      makeSale({ id: "s2", vatStatus: "zero_rated", zeroRatedSales: 250 }),
      makeSale({ id: "s3", vatStatus: "vat_exempt", vatExemptSales: 75 }),
      makeSale({
        id: "s4",
        status: "voided",
        vatStatus: "vat_registered",
        vatableSales: 1000,
        vatAmount: 120,
      }),
    ];
    expect(vatSummary(sales)).toEqual({
      vatableSales: 100,
      vatAmount: 12,
      vatExemptSales: 75,
      zeroRatedSales: 250,
    });
  });

  it("is all zeroes when there are no sales", () => {
    expect(vatSummary([])).toEqual({ vatableSales: 0, vatAmount: 0, vatExemptSales: 0, zeroRatedSales: 0 });
  });
});

describe("voidSummary (BIR compliance §39)", () => {
  it("counts and sums voided sales only, ignoring completed ones", () => {
    const sales = [
      makeSale({ id: "s1", status: "completed", total: 100 }),
      makeSale({ id: "s2", status: "voided", total: 30 }),
      makeSale({ id: "s3", status: "voided", total: 45 }),
    ];
    expect(voidSummary(sales)).toEqual({ count: 2, totalAmount: 75 });
  });

  it("is zero when there are no voided sales", () => {
    expect(voidSummary([makeSale({ status: "completed" })])).toEqual({ count: 0, totalAmount: 0 });
    expect(voidSummary([])).toEqual({ count: 0, totalAmount: 0 });
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

describe("receiptNumberRange (Z-reading beginning/ending)", () => {
  it("finds the min and max receipt number, including a voided sale's", () => {
    const sales = [
      makeSale({ id: "s1", receiptNumber: "000005" }),
      makeSale({ id: "s2", receiptNumber: "000002", status: "voided" }),
      makeSale({ id: "s3", receiptNumber: "000009" }),
    ];
    expect(receiptNumberRange(sales)).toEqual({ beginning: "000002", ending: "000009" });
  });

  it("ignores a sale with no receipt number yet (still offline-queued)", () => {
    const sales = [makeSale({ id: "s1", receiptNumber: "000005" }), makeSale({ id: "s2", receiptNumber: null })];
    expect(receiptNumberRange(sales)).toEqual({ beginning: "000005", ending: "000005" });
  });

  it("is null/null with no sales", () => {
    expect(receiptNumberRange([])).toEqual({ beginning: null, ending: null });
  });
});

describe("totalDiscounts", () => {
  it("sums discount amounts across completed sales, excluding a voided one", () => {
    const sales = [
      makeSale({ id: "s1", discountAmount: 10 }),
      makeSale({ id: "s2", discountAmount: 5 }),
      makeSale({ id: "s3", discountAmount: 50, status: "voided" }),
    ];
    expect(totalDiscounts(sales)).toBe(15);
  });

  it("is zero with no discounts", () => {
    expect(totalDiscounts([makeSale({ discountAmount: 0 })])).toBe(0);
  });
});
