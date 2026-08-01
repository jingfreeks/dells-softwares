import { afterEach, describe, expect, it, vi } from "vitest";
import {
  downloadCardSectionPdf,
  downloadDailyReportPdf,
  printCardSectionPdf,
  printDailyReportPdf,
  shareCardSectionPdf,
  shareDailyReportPdf,
  type CardSection,
} from "./reportPdf";
import type { DailyReport } from "../reports";

const baseReport: DailyReport = {
  generatedAt: "2026-07-27T10:00:00Z",
  todaysSalesTotal: 150,
  todaysTransactionCount: 3,
  totalProducts: 20,
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
      paymentType: "cash",
      customerId: null,
      referenceNo: null,
    },
  ],
};

const emptyReport: DailyReport = {
  generatedAt: "2026-07-27T10:00:00Z",
  todaysSalesTotal: 0,
  todaysTransactionCount: 0,
  totalProducts: 0,
  lowStock: [],
  bestSellers: [],
  recentSales: [],
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe("daily report PDF", () => {
  it("downloads the daily report", () => {
    expect(() => downloadDailyReportPdf(baseReport, "Dell's Store")).not.toThrow();
  });

  it("downloads the daily report with all sections empty", () => {
    expect(() => downloadDailyReportPdf(emptyReport, "Dell's Store")).not.toThrow();
  });

  it("prints by writing an embed into the opened window", () => {
    const write = vi.fn();
    const close = vi.fn();
    const focus = vi.fn();
    const print = vi.fn();
    const addEventListener = vi.fn();
    const targetWindow = {
      closed: false,
      document: { write, close },
      focus,
      print,
      addEventListener,
    } as unknown as Window;

    printDailyReportPdf(baseReport, "Dell's Store", targetWindow);

    expect(write).toHaveBeenCalledWith(expect.stringContaining("<embed"));
    expect(close).toHaveBeenCalled();
    expect(addEventListener).toHaveBeenCalledWith("load", expect.any(Function));
  });

  it("falls back to a download link when the target window is null", () => {
    const clickSpy = vi.fn();
    const createElementSpy = vi.spyOn(document, "createElement").mockReturnValue({
      set href(_v: string) {},
      set download(_v: string) {},
      click: clickSpy,
    } as unknown as HTMLAnchorElement);

    printDailyReportPdf(baseReport, "Dell's Store", null);

    expect(clickSpy).toHaveBeenCalled();
    createElementSpy.mockRestore();
  });

  it("falls back to a download link when the target window is already closed", () => {
    const clickSpy = vi.fn();
    vi.spyOn(document, "createElement").mockReturnValue({
      set href(_v: string) {},
      set download(_v: string) {},
      click: clickSpy,
    } as unknown as HTMLAnchorElement);

    printDailyReportPdf(baseReport, "Dell's Store", { closed: true } as Window);
    expect(clickSpy).toHaveBeenCalled();
  });

  it("shares via the Web Share API when supported", async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    const canShare = vi.fn().mockReturnValue(true);
    vi.stubGlobal("navigator", { ...navigator, canShare, share });

    const result = await shareDailyReportPdf(baseReport, "Dell's Store");
    expect(result).toBe("shared");
    expect(share).toHaveBeenCalled();
  });

  it("reports cancelled when the user dismisses the share sheet", async () => {
    const abortError = new DOMException("cancelled", "AbortError");
    const share = vi.fn().mockRejectedValue(abortError);
    const canShare = vi.fn().mockReturnValue(true);
    vi.stubGlobal("navigator", { ...navigator, canShare, share });

    const result = await shareDailyReportPdf(baseReport, "Dell's Store");
    expect(result).toBe("cancelled");
  });

  it("rethrows a non-abort share error", async () => {
    const share = vi.fn().mockRejectedValue(new Error("share failed"));
    const canShare = vi.fn().mockReturnValue(true);
    vi.stubGlobal("navigator", { ...navigator, canShare, share });

    await expect(shareDailyReportPdf(baseReport, "Dell's Store")).rejects.toThrow("share failed");
  });

  it("falls back to a download when the Web Share API is unsupported", async () => {
    vi.stubGlobal("navigator", { ...navigator, canShare: undefined, share: undefined });

    const result = await shareDailyReportPdf(baseReport, "Dell's Store");
    expect(result).toBe("downloaded");
  });
});

describe("card section PDF", () => {
  const statSection: CardSection = {
    kind: "stat",
    title: "Today's sales",
    value: "P 150.00",
    hint: "3 transactions",
  };

  const statSectionNoHint: CardSection = { kind: "stat", title: "Total products", value: "20" };

  const tableSection: CardSection = {
    kind: "table",
    title: "Low stock alerts",
    head: ["Product", "Category", "Stock", "Threshold", "Status"],
    rows: [
      ["Sardines", "Canned", "2", "5", "Low stock"],
      ["Bread", "Baked", "0", "5", "Out of stock"],
    ],
    emptyMessage: "All products are adequately stocked.",
    dangerColumn: 4,
    dangerValue: "Out of stock",
  };

  const emptyTableSection: CardSection = {
    kind: "table",
    title: "Best sellers",
    head: ["#", "Product", "Units sold"],
    rows: [],
    emptyMessage: "No sales recorded yet.",
  };

  it("downloads a stat card section", () => {
    expect(() =>
      downloadCardSectionPdf(statSection, "Dell's Store", "2026-07-27T10:00:00Z")
    ).not.toThrow();
  });

  it("downloads a stat card section with no hint", () => {
    expect(() =>
      downloadCardSectionPdf(statSectionNoHint, "Dell's Store", "2026-07-27T10:00:00Z")
    ).not.toThrow();
  });

  it("downloads a table card section with rows, coloring the danger value", () => {
    expect(() =>
      downloadCardSectionPdf(tableSection, "Dell's Store", "2026-07-27T10:00:00Z")
    ).not.toThrow();
  });

  it("downloads a table card section with no rows", () => {
    expect(() =>
      downloadCardSectionPdf(emptyTableSection, "Dell's Store", "2026-07-27T10:00:00Z")
    ).not.toThrow();
  });

  it("prints a card section", () => {
    const write = vi.fn();
    const close = vi.fn();
    const targetWindow = {
      closed: false,
      document: { write, close },
      focus: vi.fn(),
      print: vi.fn(),
      addEventListener: vi.fn(),
    } as unknown as Window;

    printCardSectionPdf(statSection, "Dell's Store", "2026-07-27T10:00:00Z", targetWindow);
    expect(write).toHaveBeenCalled();
  });

  it("shares a card section, falling back to download when unsupported", async () => {
    vi.stubGlobal("navigator", { ...navigator, canShare: undefined, share: undefined });
    const result = await shareCardSectionPdf(statSection, "Dell's Store", "2026-07-27T10:00:00Z");
    expect(result).toBe("downloaded");
  });
});
