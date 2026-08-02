import { describe, expect, it } from "vitest";
import { detectNetwork, isValidMobileNumber, eloadFee, suggestedCashAmounts } from "./eload";

describe("isValidMobileNumber", () => {
  it("accepts an 11-digit 09XXXXXXXXX number, with or without spaces", () => {
    expect(isValidMobileNumber("09175550142")).toBe(true);
    expect(isValidMobileNumber("0917 555 0142")).toBe(true);
  });

  it("accepts a +63 international format", () => {
    expect(isValidMobileNumber("+639175550142")).toBe(true);
  });

  it("rejects incomplete or malformed numbers", () => {
    expect(isValidMobileNumber("0917555")).toBe(false);
    expect(isValidMobileNumber("")).toBe(false);
    expect(isValidMobileNumber("1234567890")).toBe(false);
  });
});

describe("detectNetwork", () => {
  it("detects Globe from a 0917 prefix", () => {
    expect(detectNetwork("0917 555 0142")).toBe("Globe");
  });

  it("detects Smart from a 0918 prefix", () => {
    expect(detectNetwork("09185550142")).toBe("Smart");
  });

  it("detects DITO from a 0907 prefix", () => {
    expect(detectNetwork("09075550142")).toBe("DITO");
  });

  it("returns null for an incomplete or unrecognized number", () => {
    expect(detectNetwork("0917")).toBeNull();
    expect(detectNetwork("0000 555 0142")).toBeNull();
  });
});

describe("eloadFee", () => {
  it("resolves the placeholder fee brackets", () => {
    expect(eloadFee(10)).toBe(2);
    expect(eloadFee(20)).toBe(2);
    expect(eloadFee(50)).toBe(3);
    expect(eloadFee(100)).toBe(5);
    expect(eloadFee(300)).toBe(10);
  });

  it("uses the top bracket's fee for amounts above it", () => {
    expect(eloadFee(1000)).toBe(10);
  });
});

describe("suggestedCashAmounts", () => {
  it("suggests the exact total, next ₱50, next ₱100, and ₱500", () => {
    expect(suggestedCashAmounts(123)).toEqual([123, 150, 200, 500]);
  });

  it("rounds a total above ₱500 up to the next ₱500 instead of a fixed ₱500, deduping repeats", () => {
    expect(suggestedCashAmounts(650)).toEqual([650, 700, 1000]);
  });

  it("returns nothing for a zero or negative total", () => {
    expect(suggestedCashAmounts(0)).toEqual([]);
  });
});
