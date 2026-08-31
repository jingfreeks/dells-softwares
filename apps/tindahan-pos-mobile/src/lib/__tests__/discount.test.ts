import { computeDiscountAmount } from "../discount";

describe("computeDiscountAmount", () => {
  it("returns 0 when no discount is given", () => {
    expect(computeDiscountAmount(500, null)).toBe(0);
    expect(computeDiscountAmount(500, undefined)).toBe(0);
  });

  it("computes a flat discount", () => {
    expect(computeDiscountAmount(500, { type: "flat", value: 50 })).toBe(50);
  });

  it("clamps a flat discount to never exceed the subtotal", () => {
    expect(computeDiscountAmount(50, { type: "flat", value: 200 })).toBe(50);
  });

  it("computes a percentage discount", () => {
    expect(computeDiscountAmount(500, { type: "percentage", value: 10 })).toBe(50);
  });

  it("rounds a percentage discount to the nearest centavo", () => {
    expect(computeDiscountAmount(99.99, { type: "percentage", value: 10 })).toBe(10);
  });
});
