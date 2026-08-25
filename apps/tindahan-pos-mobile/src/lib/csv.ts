/** Ported from apps/tindahan-pos/src/pages/Onboarding/lib.ts (parseProductsCsv/splitCsvLine). */

export interface ParsedCsvProduct {
  name: string;
  price: number;
  barcode: string | null;
  category: string | null;
}

export interface CsvParseResult {
  rows: ParsedCsvProduct[];
  error: "empty" | "missing-columns" | null;
}

/** Splits one CSV line into fields, honoring double-quoted fields that may contain commas. */
function splitCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (inQuotes) {
      if (char === '"' && line[i + 1] === '"') {
        current += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        current += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      fields.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  fields.push(current);
  return fields.map((f) => f.trim());
}

/**
 * Parses a simple CSV export of products: name, price, and optional
 * barcode/category columns, matched by header name (case-insensitive).
 */
export function parseProductsCsv(text: string): CsvParseResult {
  const lines = text.split(/\r?\n/).filter((line) => line.trim() !== "");
  if (lines.length < 2) {
    return { rows: [], error: "empty" };
  }

  const headers = splitCsvLine(lines[0]).map((h) => h.toLowerCase());
  const nameIndex = headers.indexOf("name");
  const priceIndex = headers.indexOf("price");
  if (nameIndex === -1 || priceIndex === -1) {
    return { rows: [], error: "missing-columns" };
  }
  const barcodeIndex = headers.indexOf("barcode");
  const categoryIndex = headers.indexOf("category");

  const rows: ParsedCsvProduct[] = [];
  for (const line of lines.slice(1)) {
    const fields = splitCsvLine(line);
    const name = fields[nameIndex]?.trim();
    const price = Number(fields[priceIndex]);
    if (!name || Number.isNaN(price) || price < 0) continue;
    rows.push({
      name,
      price,
      barcode: barcodeIndex >= 0 ? fields[barcodeIndex]?.trim() || null : null,
      category: categoryIndex >= 0 ? fields[categoryIndex]?.trim() || null : null,
    });
  }

  return { rows, error: null };
}
