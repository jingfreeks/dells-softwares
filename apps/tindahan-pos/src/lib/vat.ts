import type { VatStatus } from "./types";

export interface VatBreakdown {
  vatableSales: number;
  vatAmount: number;
  vatExemptSales: number;
  zeroRatedSales: number;
}

const ZERO_BREAKDOWN: VatBreakdown = {
  vatableSales: 0,
  vatAmount: 0,
  vatExemptSales: 0,
  zeroRatedSales: 0,
};

/**
 * Mirrors checkout_sale()'s VAT snapshot logic exactly (see
 * 0040_vat_computation.sql) — the single client-side source of truth,
 * needed because checkout()'s optimistic local SaleRecord (built for the
 * receipt before any refetch) must show the right breakdown immediately.
 * `total` is treated as VAT-inclusive for a VAT-registered store, per the
 * standard Philippine computation.
 */
export function computeVatBreakdown(total: number, vatStatus: VatStatus | null, vatRate: number): VatBreakdown {
  if (vatStatus === "vat_registered") {
    const vatableSales = Math.round((total / (1 + vatRate)) * 100) / 100;
    return { ...ZERO_BREAKDOWN, vatableSales, vatAmount: total - vatableSales };
  }
  if (vatStatus === "zero_rated") {
    return { ...ZERO_BREAKDOWN, zeroRatedSales: total };
  }
  if (vatStatus === "vat_exempt") {
    return { ...ZERO_BREAKDOWN, vatExemptSales: total };
  }
  return ZERO_BREAKDOWN;
}
