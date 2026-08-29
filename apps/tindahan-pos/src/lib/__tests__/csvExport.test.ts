import { describe, expect, it } from "vitest";
import {
  productsToCsv,
  salesToCsv,
  vatSalesToCsv,
  voidsToCsv,
  refundsToCsv,
  paymentBreakdownToCsv,
  everythingToJson,
} from "../csvExport";
import { makeProduct, makeSaleRecord } from "../../test/testUtils";
import type { RefundRecord } from "../types";

describe("productsToCsv", () => {
  it("includes a header row and one row per product", () => {
    const csv = productsToCsv([makeProduct({ name: "Sardines", price: 25, stock: 20 })]);
    const lines = csv.split("\r\n");
    expect(lines[0]).toBe("Name,Barcode,Category,Price,Stock,Low stock threshold,Pack quantity,Pack price");
    expect(lines[1]).toContain("Sardines");
    expect(lines[1]).toContain("25");
    expect(lines[1]).toContain("20");
  });

  it("quotes fields containing a comma", () => {
    const csv = productsToCsv([makeProduct({ name: "Rice, tingi" })]);
    expect(csv).toContain('"Rice, tingi"');
  });
});

describe("salesToCsv", () => {
  it("includes a header row and joins item names with quantities", () => {
    const csv = salesToCsv([makeSaleRecord({ cashierName: "Aling Nena", total: 50 })]);
    const lines = csv.split("\r\n");
    expect(lines[0]).toBe(
      "Sale ID,Date,Receipt No.,Cashier,Payment type,Reference no.,Items,Total,Status,Void reason,VAT status,Vatable sales,VAT amount,VAT-exempt sales,Zero-rated sales,Discount type,Discount value,Discount amount"
    );
    expect(lines[1]).toContain("Aling Nena");
    expect(lines[1]).toContain("Sardines x2");
    expect(lines[1]).toContain("50");
  });

  it("includes the status and void reason for a voided sale", () => {
    const csv = salesToCsv([makeSaleRecord({ status: "voided", voidReason: "Wrong quantity" })]);
    const lines = csv.split("\r\n");
    expect(lines[1]).toContain("voided");
    expect(lines[1]).toContain("Wrong quantity");
  });

  it("includes VAT and discount fields, confirming the export gap is closed", () => {
    const csv = salesToCsv([
      makeSaleRecord({
        receiptNumber: "000042",
        vatStatus: "vat_registered",
        vatableSales: 100,
        vatAmount: 12,
        discountType: "flat",
        discountValue: 10,
        discountAmount: 10,
      }),
    ]);
    const lines = csv.split("\r\n");
    expect(lines[1]).toContain("000042");
    expect(lines[1]).toContain("vat_registered");
    expect(lines[1]).toContain("flat");
  });
});

describe("vatSalesToCsv", () => {
  it("includes a header row and one row per completed sale's VAT breakdown", () => {
    const csv = vatSalesToCsv([
      makeSaleRecord({ receiptNumber: "000001", vatStatus: "vat_registered", vatableSales: 100, vatAmount: 12 }),
    ]);
    const lines = csv.split("\r\n");
    expect(lines[0]).toBe("Sale ID,Date,Receipt No.,VAT status,Vatable sales,VAT amount,VAT-exempt sales,Zero-rated sales,Total");
    expect(lines[1]).toContain("000001");
    expect(lines[1]).toContain("vat_registered");
  });

  it("excludes a voided sale", () => {
    const csv = vatSalesToCsv([makeSaleRecord({ status: "voided" })]);
    expect(csv.split("\r\n")).toHaveLength(1);
  });
});

describe("voidsToCsv", () => {
  it("includes only voided sales, with voided-at/by fields", () => {
    const csv = voidsToCsv([
      makeSaleRecord({ status: "completed" }),
      makeSaleRecord({
        id: "s2",
        status: "voided",
        voidedAt: "2026-08-01T00:00:00Z",
        voidedByName: "Owner",
        voidReason: "Wrong item",
      }),
    ]);
    const lines = csv.split("\r\n");
    expect(lines).toHaveLength(2);
    expect(lines[1]).toContain("Owner");
    expect(lines[1]).toContain("Wrong item");
  });

  it("is empty (header only) with no voided sales", () => {
    const csv = voidsToCsv([makeSaleRecord({ status: "completed" })]);
    expect(csv.split("\r\n")).toHaveLength(1);
  });
});

function makeRefundRecord(overrides: Partial<RefundRecord> = {}): RefundRecord {
  return {
    id: "r1",
    saleId: "s1",
    receiptNumber: "000001",
    cashierName: "Aling Nena",
    reason: "Wrong item",
    totalAmount: 25,
    createdAt: "2026-08-01T00:00:00Z",
    ...overrides,
  };
}

describe("refundsToCsv", () => {
  it("includes a header row and one row per refund", () => {
    const csv = refundsToCsv([makeRefundRecord()]);
    const lines = csv.split("\r\n");
    expect(lines[0]).toBe("Refund ID,Date,Sale receipt no.,Cashier,Amount,Reason");
    expect(lines[1]).toContain("Aling Nena");
    expect(lines[1]).toContain("000001");
    expect(lines[1]).toContain("Wrong item");
  });

  it("is empty (header only) with no refunds", () => {
    expect(refundsToCsv([]).split("\r\n")).toHaveLength(1);
  });
});

describe("paymentBreakdownToCsv", () => {
  it("includes a header row and a percent-of-total column", () => {
    const csv = paymentBreakdownToCsv([
      { paymentType: "cash", total: 75, transactionCount: 3 },
      { paymentType: "qr", total: 25, transactionCount: 1 },
    ]);
    const lines = csv.split("\r\n");
    expect(lines[0]).toBe("Payment type,Transactions,Total,% of total");
    expect(lines[1]).toBe("cash,3,75,75%");
    expect(lines[2]).toBe("qr,1,25,25%");
  });

  it("shows 0% for every row when the grand total is zero", () => {
    const csv = paymentBreakdownToCsv([{ paymentType: "cash", total: 0, transactionCount: 0 }]);
    expect(csv.split("\r\n")[1]).toBe("cash,0,0,0%");
  });
});

describe("everythingToJson", () => {
  it("serializes products, sales, and customers with an export timestamp", () => {
    const json = everythingToJson({ products: [makeProduct()], sales: [makeSaleRecord()], customers: [] });
    const parsed = JSON.parse(json);
    expect(parsed.products).toHaveLength(1);
    expect(parsed.sales).toHaveLength(1);
    expect(parsed.customers).toHaveLength(0);
    expect(typeof parsed.exportedAt).toBe("string");
  });
});
