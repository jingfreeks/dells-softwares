import { describe, expect, it } from "vitest";
import { cashInFee, cashOutFee } from "../cashService";

describe("cashInFee", () => {
  it("resolves the default fee brackets", () => {
    expect(cashInFee(100)).toBe(5);
    expect(cashInFee(300)).toBe(10);
    expect(cashInFee(500)).toBe(15);
  });

  it("uses the top bracket's fee for amounts above it", () => {
    expect(cashInFee(5000)).toBe(15);
  });

  it("uses a store's custom brackets when given", () => {
    const customBrackets = [
      { max: 250, fee: 5 },
      { max: 1000, fee: 20 },
    ];
    expect(cashInFee(200, customBrackets)).toBe(5);
    expect(cashInFee(1000, customBrackets)).toBe(20);
  });

  it("falls back to the default brackets when given an empty list", () => {
    expect(cashInFee(100, [])).toBe(5);
  });
});

describe("cashOutFee", () => {
  it("resolves the default fee brackets", () => {
    expect(cashOutFee(200)).toBe(10);
    expect(cashOutFee(500)).toBe(15);
    expect(cashOutFee(1000)).toBe(25);
  });

  it("uses a store's custom brackets when given", () => {
    const customBrackets = [{ max: 500, fee: 8 }];
    expect(cashOutFee(300, customBrackets)).toBe(8);
    expect(cashOutFee(5000, customBrackets)).toBe(8);
  });

  it("falls back to the default brackets when given an empty list", () => {
    expect(cashOutFee(200, [])).toBe(10);
  });
});
