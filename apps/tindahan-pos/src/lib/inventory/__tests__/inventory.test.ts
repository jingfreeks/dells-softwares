import { describe, expect, it } from "vitest";
import {
  buildBarcodeIndex,
  computeRestockSuggestions,
  deductStockForSale,
  findDuplicateBarcode,
  findDuplicateBarcodeFast,
  lowStockProducts,
  packPriceLabel,
  packUnitPrice,
  receiveStock,
  receivingTotalCost,
  stockPreview,
  stockStatus,
  type ReceivingLine,
} from "../inventory";
import type { Product, SaleRecord } from "../../types";

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

describe("receivingTotalCost (story E2)", () => {
  it("sums quantity * costEach across all lines", () => {
    const lines: ReceivingLine[] = [
      { productId: "a", productName: "Chips", quantity: 10, costEach: 8 },
      { productId: "b", productName: "Soda", quantity: 24, costEach: 15 },
    ];
    expect(receivingTotalCost(lines)).toBe(440);
  });

  it("returns 0 for no lines", () => {
    expect(receivingTotalCost([])).toBe(0);
  });
});

describe("stockPreview (story E2)", () => {
  it("returns the current and post-receiving stock for a known product", () => {
    const products = [makeProduct({ id: "a", stock: 10 })];
    expect(stockPreview(products, "a", 15)).toEqual({ old: 10, next: 25 });
  });

  it("returns null for a product that isn't loaded", () => {
    const products = [makeProduct({ id: "a", stock: 10 })];
    expect(stockPreview(products, "nonexistent", 5)).toBeNull();
  });
});

describe("packUnitPrice", () => {
  it("computes the effective per-unit price, rounded to the centavo", () => {
    expect(packUnitPrice(3, 5)).toBeCloseTo(1.67, 2);
  });

  it("divides evenly when the pack price is a clean multiple", () => {
    expect(packUnitPrice(2, 10)).toBe(5);
  });
});

describe("packPriceLabel", () => {
  it("describes a pack-priced product as '<qty> pcs for ₱<price>'", () => {
    const product = makeProduct({ packQuantity: 3, packPrice: 5 });
    expect(packPriceLabel(product)).toBe("3 pcs for ₱5.00");
  });

  it("returns null for a regular (non-pack) product", () => {
    expect(packPriceLabel(makeProduct())).toBeNull();
  });
});

describe("findDuplicateBarcode (story B1a)", () => {
  const products = [
    makeProduct({ id: "a", barcode: "1111" }),
    makeProduct({ id: "b", barcode: "2222" }),
  ];

  it("finds another product already using the barcode", () => {
    expect(findDuplicateBarcode(products, "1111", null)?.id).toBe("a");
  });

  it("excludes the product currently being edited", () => {
    expect(findDuplicateBarcode(products, "1111", "a")).toBeNull();
  });

  it("returns null for a barcode nobody uses yet", () => {
    expect(findDuplicateBarcode(products, "9999", null)).toBeNull();
  });

  it("returns null for a blank barcode", () => {
    expect(findDuplicateBarcode(products, "   ", null)).toBeNull();
  });
});

describe("buildBarcodeIndex / findDuplicateBarcodeFast", () => {
  const products = [
    makeProduct({ id: "a", barcode: "1111" }),
    makeProduct({ id: "b", barcode: "2222" }),
    makeProduct({ id: "c", barcode: null }),
  ];
  const index = buildBarcodeIndex(products);

  it("matches the same results as the O(n) findDuplicateBarcode", () => {
    expect(findDuplicateBarcodeFast(index, "1111", null)?.id).toBe(
      findDuplicateBarcode(products, "1111", null)?.id
    );
    expect(findDuplicateBarcodeFast(index, "1111", "a")).toBe(
      findDuplicateBarcode(products, "1111", "a")
    );
    expect(findDuplicateBarcodeFast(index, "9999", null)).toBe(
      findDuplicateBarcode(products, "9999", null)
    );
    expect(findDuplicateBarcodeFast(index, "   ", null)).toBe(
      findDuplicateBarcode(products, "   ", null)
    );
  });

  it("skips products with no barcode when building the index", () => {
    expect(index.size).toBe(2);
  });
});

function makeSale(overrides: Partial<SaleRecord> = {}): SaleRecord {
  return {
    id: "sale-1",
    timestamp: "2026-07-30T10:00:00.000Z",
    total: 0,
    cashierName: "Aling Nena",
    cashierId: "staff-1",
    paymentType: "cash",
    customerId: null,
    referenceNo: null,
    items: [],
    ...overrides,
  };
}

function saleOf(productId: string, quantity: number, timestamp: string): SaleRecord {
  return makeSale({
    timestamp,
    items: [
      { productId, name: "x", quantity, price: 10, itemType: "product", fee: 0, lineTotal: quantity * 10 },
    ],
  });
}

describe("computeRestockSuggestions", () => {
  const now = new Date("2026-07-31T00:00:00.000Z");

  it("suggests a quantity for a product selling faster than its stock covers the lead time", () => {
    const products = [makeProduct({ id: "p1", stock: 4, lowStockThreshold: 2 })];
    // 10 units sold on each of 5 sales spanning the last 5 days -> 50/5 = 10/day.
    const sales = Array.from({ length: 5 }, (_, i) =>
      saleOf("p1", 10, new Date(now.getTime() - (i + 1) * 24 * 60 * 60 * 1000).toISOString())
    );

    const [suggestion] = computeRestockSuggestions(products, sales, { now, leadTimeDays: 3 });
    expect(suggestion.productId).toBe("p1");
    expect(suggestion.avgDailySales).toBe(10);
    // reorderPoint = 10*3 + 2 = 32; stock is 4 -> suggest 28.
    expect(suggestion.suggestedQuantity).toBe(28);
  });

  it("omits a product with no sales in the lookback window", () => {
    const products = [makeProduct({ id: "p1", stock: 1, lowStockThreshold: 5 })];
    const sales = [saleOf("p1", 5, "2026-01-01T00:00:00.000Z")]; // long before the window
    expect(computeRestockSuggestions(products, sales, { now, lookbackDays: 30 })).toEqual([]);
  });

  it("omits a product whose stock already covers its reorder point", () => {
    const products = [makeProduct({ id: "p1", stock: 100, lowStockThreshold: 2 })];
    const sales = [saleOf("p1", 1, now.toISOString())];
    expect(computeRestockSuggestions(products, sales, { now })).toEqual([]);
  });

  it("ignores service lines when tallying quantity sold", () => {
    const products = [makeProduct({ id: "p1", stock: 0, lowStockThreshold: 1 })];
    const sales = [
      makeSale({
        timestamp: now.toISOString(),
        items: [{ productId: "", name: "E-Load", quantity: 1, price: 50, itemType: "service", fee: 0, lineTotal: 50 }],
      }),
    ];
    expect(computeRestockSuggestions(products, sales, { now })).toEqual([]);
  });

  it("averages over the actual span of in-window sales, not the full lookback period", () => {
    const products = [makeProduct({ id: "p1", stock: 5, lowStockThreshold: 0 })];
    // Only one day of history: 6 units sold today.
    const sales = [saleOf("p1", 6, now.toISOString())];
    const [suggestion] = computeRestockSuggestions(products, sales, { now, lookbackDays: 30, leadTimeDays: 1 });
    // Averaged over a 1-day span (not 30) -> 6/day, not 0.2/day.
    expect(suggestion.avgDailySales).toBe(6);
  });

  it("sorts by days of stock left, most urgent first", () => {
    const products = [
      makeProduct({ id: "soon", stock: 2, lowStockThreshold: 0 }),
      makeProduct({ id: "later", stock: 8, lowStockThreshold: 0 }),
    ];
    const sales = [saleOf("soon", 2, now.toISOString()), saleOf("later", 2, now.toISOString())];
    const results = computeRestockSuggestions(products, sales, { now, leadTimeDays: 5 });
    expect(results.map((r) => r.productId)).toEqual(["soon", "later"]);
  });
});
