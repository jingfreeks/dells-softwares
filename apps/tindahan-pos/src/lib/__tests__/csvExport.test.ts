import { describe, expect, it } from "vitest";
import { productsToCsv, salesToCsv, everythingToJson } from "../csvExport";
import { makeProduct, makeSaleRecord } from "../../test/testUtils";

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
    expect(lines[0]).toBe("Sale ID,Date,Cashier,Payment type,Reference no.,Items,Total");
    expect(lines[1]).toContain("Aling Nena");
    expect(lines[1]).toContain("Sardines x2");
    expect(lines[1]).toContain("50");
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
