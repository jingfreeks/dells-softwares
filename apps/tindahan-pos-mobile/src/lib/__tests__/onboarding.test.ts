import {
  computeAverageSaleValue,
  computeCashHealth,
  computeDailySalesRates,
  computeStartingFloat,
  computeStockAlertPreview,
  onboardingMinutesLeft,
  onboardingProgressPercent,
} from "./onboarding";
import type { Product, SaleRecord } from "./types";

function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: "p1",
    barcode: null,
    name: "Rice",
    price: 60,
    stock: 10,
    lowStockThreshold: 5,
    categoryId: "c1",
    category: "Grocery",
    packQuantity: null,
    packPrice: null,
    imageUrl: null,
    ...overrides,
  };
}

function makeSale(overrides: Partial<SaleRecord> = {}): SaleRecord {
  return {
    id: "s1",
    timestamp: new Date().toISOString(),
    total: 60,
    cashierName: "Cashier",
    paymentType: "cash",
    customerId: null,
    referenceNo: null,
    status: "completed",
    items: [{ productId: "p1", name: "Rice", quantity: 3, price: 60, itemType: "product", fee: 0, lineTotal: 180 }],
    ...overrides,
  };
}

describe("onboardingProgressPercent / onboardingMinutesLeft", () => {
  it("returns 0% at welcome and 100% at done", () => {
    expect(onboardingProgressPercent("welcome")).toBe(0);
    expect(onboardingProgressPercent("done")).toBe(100);
  });

  it("counts down minutes left as steps progress", () => {
    expect(onboardingMinutesLeft("welcome")).toBeGreaterThan(onboardingMinutesLeft("openRegister"));
  });
});

describe("computeStartingFloat / computeCashHealth", () => {
  it("sums denomination counts into a total float", () => {
    expect(computeStartingFloat({ d100: 4, d50: 4, d20: 6, coins: 80 })).toBe(400 + 200 + 120 + 80);
  });

  it("flags a drawer with plenty of small notes as good", () => {
    expect(computeCashHealth({ d100: 10, d50: 10 }).level).toBe("good");
  });

  it("flags a drawer dominated by large bills as low", () => {
    expect(computeCashHealth({ d1000: 5 }).level).toBe("low");
  });
});

describe("computeAverageSaleValue", () => {
  it("returns 0 for no sales", () => {
    expect(computeAverageSaleValue([])).toBe(0);
  });

  it("averages sale totals", () => {
    expect(computeAverageSaleValue([makeSale({ total: 100 }), makeSale({ total: 200 })])).toBe(150);
  });
});

describe("computeDailySalesRates / computeStockAlertPreview", () => {
  it("flags an out-of-stock product regardless of sales history", () => {
    const products = [makeProduct({ id: "p1", stock: 0 })];
    const preview = computeStockAlertPreview(products, [], 3, true);
    expect(preview.items).toEqual([{ productId: "p1", productName: "Rice", daysOfStockLeft: 0 }]);
  });

  it("flags a product selling fast enough to run out within the threshold", () => {
    const products = [makeProduct({ id: "p1", stock: 6 })];
    const sales = [makeSale({ timestamp: new Date().toISOString() })];
    const rates = computeDailySalesRates(products, sales);
    expect(rates.get("p1")).toBeCloseTo(3, 5);

    const preview = computeStockAlertPreview(products, sales, 3, true);
    expect(preview.affectedCount).toBe(1);
    expect(preview.items[0].productId).toBe("p1");
  });

  it("applies the shorter fast-mover threshold once a product sells 10+/day", () => {
    const products = [makeProduct({ id: "p1", stock: 120 })];
    const sales = [makeSale({ items: [{ productId: "p1", name: "Rice", quantity: 30, price: 60, itemType: "product", fee: 0, lineTotal: 1800 }] })];
    const withBoost = computeStockAlertPreview(products, sales, 3, true);
    const withoutBoost = computeStockAlertPreview(products, sales, 3, false);
    expect(withBoost.affectedCount).toBe(1);
    expect(withoutBoost.affectedCount).toBe(0);
  });
});
