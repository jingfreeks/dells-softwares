import { describe, expect, it } from "vitest";
import { downloadDailyReportPdf } from "../reportPdf";
import type { DailyReport } from "../../reports";

const baseReport: DailyReport = {
  generatedAt: "2026-07-27T10:00:00Z",
  todaysSalesTotal: 150,
  todaysTransactionCount: 3,
  salesChangePercent: 12,
  utangOutstanding: 1240,
  lowStock: [
    { id: "p1", barcode: null, name: "Sardines", price: 25, stock: 2, lowStockThreshold: 5, categoryId: "c1", category: "Canned", packQuantity: null, packPrice: null, imageUrl: null },
    { id: "p2", barcode: null, name: "Bread", price: 10, stock: 0, lowStockThreshold: 5, categoryId: "c1", category: "Baked", packQuantity: null, packPrice: null, imageUrl: null },
  ],
  bestSellers: [{ name: "Sardines", quantity: 10 }],
  recentSales: [
    {
      id: "s1",
      timestamp: "2026-07-27T09:00:00Z",
      items: [{ productId: "p1", name: "Sardines", quantity: 2, price: 25, itemType: "product", fee: 0, lineTotal: 50 }],
      total: 50,
      cashierName: "Aling Nena",
      cashierId: "staff-1",
      paymentType: "cash",
      customerId: null,
      referenceNo: null,
    },
  ],
  restockSuggestions: [
    { productId: "p1", productName: "Sardines", currentStock: 2, avgDailySales: 3.3, daysOfStockLeft: 0.6, suggestedQuantity: 15 },
  ],
  categoryTotals: { rows: [{ category: "Canned", total: 50 }], grandTotal: 50 },
};

const emptyReport: DailyReport = {
  generatedAt: "2026-07-27T10:00:00Z",
  todaysSalesTotal: 0,
  todaysTransactionCount: 0,
  salesChangePercent: null,
  utangOutstanding: 0,
  lowStock: [],
  bestSellers: [],
  recentSales: [],
  restockSuggestions: [],
  categoryTotals: { rows: [], grandTotal: 0 },
};

describe("daily report PDF", () => {
  it("downloads the daily report", () => {
    expect(() => downloadDailyReportPdf(baseReport, "Dell's Store")).not.toThrow();
  });

  it("downloads the daily report with all sections empty", () => {
    expect(() => downloadDailyReportPdf(emptyReport, "Dell's Store")).not.toThrow();
  });
});
