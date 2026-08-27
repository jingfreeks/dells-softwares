import { parseProductsCsv } from "./csv";

describe("parseProductsCsv", () => {
  it("returns an 'empty' error when there's no data row", () => {
    expect(parseProductsCsv("name,price")).toEqual({ rows: [], error: "empty" });
    expect(parseProductsCsv("")).toEqual({ rows: [], error: "empty" });
  });

  it("returns a 'missing-columns' error when name/price headers are absent", () => {
    expect(parseProductsCsv("foo,bar\n1,2")).toEqual({ rows: [], error: "missing-columns" });
  });

  it("parses name/price, matching headers case-insensitively", () => {
    const result = parseProductsCsv("Name,Price\nRice,60\nSardines,22.50");
    expect(result.error).toBeNull();
    expect(result.rows).toEqual([
      { name: "Rice", price: 60, barcode: null, category: null },
      { name: "Sardines", price: 22.5, barcode: null, category: null },
    ]);
  });

  it("includes optional barcode/category columns when present", () => {
    const result = parseProductsCsv("name,price,barcode,category\nRice,60,1234567890,Grocery");
    expect(result.rows).toEqual([{ name: "Rice", price: 60, barcode: "1234567890", category: "Grocery" }]);
  });

  it("skips a row with a missing name or an invalid/negative price", () => {
    const result = parseProductsCsv("name,price\n,60\nRice,notanumber\nSkyflakes,-5\nCoke,20");
    expect(result.rows).toEqual([{ name: "Coke", price: 20, barcode: null, category: null }]);
  });

  it("honors quoted fields containing commas", () => {
    const result = parseProductsCsv('name,price,category\n"Rice, 1kg",60,"Grocery, Staples"');
    expect(result.rows).toEqual([{ name: "Rice, 1kg", price: 60, barcode: null, category: "Grocery, Staples" }]);
  });

  it("ignores blank lines between rows", () => {
    const result = parseProductsCsv("name,price\nRice,60\n\nCoke,20\n");
    expect(result.rows).toHaveLength(2);
  });
});
