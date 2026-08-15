import { describe, expect, it } from "vitest";
import { computeVatBreakdown } from "../vat";

describe("computeVatBreakdown", () => {
  it("splits a VAT-inclusive total into VATable Sales and VAT Amount at 12%", () => {
    const result = computeVatBreakdown(112, "vat_registered", 0.12);
    expect(result.vatableSales).toBe(100);
    expect(result.vatAmount).toBe(12);
    expect(result.vatExemptSales).toBe(0);
    expect(result.zeroRatedSales).toBe(0);
  });

  it("supports a non-default rate", () => {
    const result = computeVatBreakdown(110, "vat_registered", 0.1);
    expect(result.vatableSales).toBe(100);
    expect(result.vatAmount).toBe(10);
  });

  it("puts the full total under zero-rated sales, no VAT amount", () => {
    const result = computeVatBreakdown(250, "zero_rated", 0.12);
    expect(result).toEqual({ vatableSales: 0, vatAmount: 0, vatExemptSales: 0, zeroRatedSales: 250 });
  });

  it("puts the full total under VAT-exempt sales, no VAT amount", () => {
    const result = computeVatBreakdown(75, "vat_exempt", 0.12);
    expect(result).toEqual({ vatableSales: 0, vatAmount: 0, vatExemptSales: 75, zeroRatedSales: 0 });
  });

  it("computes nothing for a non-VAT store", () => {
    const result = computeVatBreakdown(500, "non_vat", 0.12);
    expect(result).toEqual({ vatableSales: 0, vatAmount: 0, vatExemptSales: 0, zeroRatedSales: 0 });
  });

  it("computes nothing when vatStatus is unknown (e.g. offline-queued sale, store not yet loaded)", () => {
    const result = computeVatBreakdown(500, null, 0.12);
    expect(result).toEqual({ vatableSales: 0, vatAmount: 0, vatExemptSales: 0, zeroRatedSales: 0 });
  });
});
