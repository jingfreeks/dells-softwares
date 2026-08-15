import { describe, expect, it } from "vitest";
import ExcelJS from "exceljs";
import { buildDashboardWorkbook, downloadWorkbook, type RestockExportRow } from "../excelExport";
import type { BestSeller, SalesByCategory } from "@/lib/reports";
import type { Customer, SaleRecord } from "@/lib/types";

function makeSale(overrides: Partial<SaleRecord> = {}): SaleRecord {
  return {
    id: "11111111-1111-1111-1111-111111111111",
    timestamp: "2026-08-10T15:20:00Z",
    total: 10,
    cashierName: "Maricel",
    cashierId: "staff-1",
    items: [
      { productId: "p1", name: "Ajinomoto Sachet", quantity: 2, price: 5, itemType: "product", fee: 0, lineTotal: 10 },
    ],
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
    ...overrides,
  };
}

function makeCustomer(overrides: Partial<Customer> = {}): Customer {
  return { id: "c1", name: "Aling Rosa", phone: null, creditLimit: null, balance: 0, ...overrides };
}

function makeBestSeller(overrides: Partial<BestSeller> = {}): BestSeller {
  return {
    productId: "p1",
    name: "555 Sardines",
    barcode: "4800xxxxx",
    category: "Canned Goods",
    quantity: 10,
    revenue: 220,
    transactionCount: 3,
    ...overrides,
  };
}

const categoryTotals: SalesByCategory = {
  rows: [
    { category: "Canned Goods", total: 220 },
    { category: "Drinks", total: 55 },
  ],
  grandTotal: 275,
};

function makeRestockRow(overrides: Partial<RestockExportRow> = {}): RestockExportRow {
  return {
    product: "sardines",
    barcode: null,
    category: "Canned goods",
    currentStock: 0,
    minStock: 6,
    suggestedQuantity: 12,
    supplier: "Mega Distribution",
    status: "Out of stock",
    ...overrides,
  };
}

describe("buildDashboardWorkbook", () => {
  it("creates exactly the 4 named sheets in the spec, in order", () => {
    const workbook = buildDashboardWorkbook({
      sales: [makeSale()],
      customers: [makeCustomer()],
      bestSellers: [makeBestSeller()],
      categoryTotals,
      restockRows: [makeRestockRow()],
    });
    expect(workbook.worksheets.map((w) => w.name)).toEqual([
      "Recent Sales",
      "Best Sellers",
      "Sales by Category",
      "Needs Restocking",
    ]);
  });

  it("bolds the header row and freezes it on every sheet", () => {
    const workbook = buildDashboardWorkbook({
      sales: [],
      customers: [],
      bestSellers: [],
      categoryTotals: { rows: [], grandTotal: 0 },
      restockRows: [],
    });
    for (const sheet of workbook.worksheets) {
      expect(sheet.getRow(1).font?.bold).toBe(true);
      expect(sheet.views).toEqual([{ state: "frozen", ySplit: 1 }]);
    }
  });

  it("Recent Sales: one row per line item, with sale-level fields repeated, and resolves the customer name", () => {
    const sale = makeSale({
      customerId: "c1",
      items: [
        { productId: "p1", name: "Ajinomoto Sachet", quantity: 2, price: 5, itemType: "product", fee: 0, lineTotal: 10 },
        { productId: "p2", name: "555 Sardines", quantity: 1, price: 22, itemType: "product", fee: 0, lineTotal: 22 },
      ],
      total: 32,
    });
    const workbook = buildDashboardWorkbook({
      sales: [sale],
      customers: [makeCustomer({ id: "c1", name: "Aling Rosa" })],
      bestSellers: [],
      categoryTotals: { rows: [], grandTotal: 0 },
      restockRows: [],
    });
    const sheet = workbook.getWorksheet("Recent Sales")!;
    expect(sheet.rowCount).toBe(3); // header + 2 items
    const row2 = sheet.getRow(2).values as unknown[];
    const row3 = sheet.getRow(3).values as unknown[];
    expect(row2).toContain("Ajinomoto Sachet");
    expect(row2).toContain("Aling Rosa");
    expect(row3).toContain("555 Sardines");
  });

  it("Best Sellers: assigns 1-based rank in the given order", () => {
    const workbook = buildDashboardWorkbook({
      sales: [],
      customers: [],
      bestSellers: [makeBestSeller({ name: "First" }), makeBestSeller({ name: "Second" })],
      categoryTotals: { rows: [], grandTotal: 0 },
      restockRows: [],
    });
    const sheet = workbook.getWorksheet("Best Sellers")!;
    expect(sheet.getRow(2).getCell(1).value).toBe(1);
    expect(sheet.getRow(2).getCell(2).value).toBe("First");
    expect(sheet.getRow(3).getCell(1).value).toBe(2);
  });

  it("Sales by Category: includes each row's percentage of the grand total", () => {
    const workbook = buildDashboardWorkbook({
      sales: [],
      customers: [],
      bestSellers: [],
      categoryTotals,
      restockRows: [],
    });
    const sheet = workbook.getWorksheet("Sales by Category")!;
    expect(sheet.getRow(2).getCell(1).value).toBe("Canned Goods");
    expect(sheet.getRow(2).getCell(3).value).toBeCloseTo(220 / 275);
  });

  it("Needs Restocking: only includes the rows it was given (caller filters to what needs restocking)", () => {
    const workbook = buildDashboardWorkbook({
      sales: [],
      customers: [],
      bestSellers: [],
      categoryTotals: { rows: [], grandTotal: 0 },
      restockRows: [makeRestockRow({ product: "sardines" }), makeRestockRow({ product: "Skyflakes" })],
    });
    const sheet = workbook.getWorksheet("Needs Restocking")!;
    expect(sheet.rowCount).toBe(3);
    expect(sheet.getRow(2).getCell(1).value).toBe("sardines");
  });
});

describe("downloadWorkbook", () => {
  it("produces a valid non-empty xlsx buffer that ExcelJS can read back", async () => {
    const workbook = buildDashboardWorkbook({
      sales: [makeSale()],
      customers: [],
      bestSellers: [makeBestSeller()],
      categoryTotals,
      restockRows: [makeRestockRow()],
    });
    const buffer = await workbook.xlsx.writeBuffer();
    expect(buffer.byteLength).toBeGreaterThan(0);

    const roundTrip = new ExcelJS.Workbook();
    await roundTrip.xlsx.load(buffer as ArrayBuffer);
    expect(roundTrip.worksheets.map((w) => w.name)).toEqual([
      "Recent Sales",
      "Best Sellers",
      "Sales by Category",
      "Needs Restocking",
    ]);
  });

  it("triggers a download via an anchor click with the given filename", async () => {
    const workbook = buildDashboardWorkbook({
      sales: [],
      customers: [],
      bestSellers: [],
      categoryTotals: { rows: [], grandTotal: 0 },
      restockRows: [],
    });
    const clickSpy = vitestMockAnchorClick();
    await downloadWorkbook(workbook, "dells-sari-sari-store-dashboard-2026-08-14.xlsx");
    expect(clickSpy.filename).toBe("dells-sari-sari-store-dashboard-2026-08-14.xlsx");
    clickSpy.restore();
  });
});

function vitestMockAnchorClick() {
  let filename: string | null = null;
  const originalCreateElement = document.createElement.bind(document);
  const spy = (tag: string) => {
    const el = originalCreateElement(tag);
    if (tag === "a") {
      const anchor = el as HTMLAnchorElement;
      anchor.click = () => {
        filename = anchor.download;
      };
    }
    return el;
  };
  document.createElement = spy as typeof document.createElement;
  return {
    get filename() {
      return filename;
    },
    restore() {
      document.createElement = originalCreateElement;
    },
  };
}
