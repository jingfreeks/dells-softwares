import { useMemo, useState } from "react";
import type { Product } from "../../../lib/types";

export const PREVIEW_CHIP_LIMIT = 4;

/** All local state + derived data for ProductsStep -- ProductsStep.tsx stays presentational. */
export function useProductsStep(products: Product[]) {
  const [showScanner, setShowScanner] = useState(false);

  const previewProducts = useMemo(() => products.slice(0, PREVIEW_CHIP_LIMIT), [products]);
  const remainingCount = products.length - previewProducts.length;

  return { showScanner, setShowScanner, previewProducts, remainingCount };
}
