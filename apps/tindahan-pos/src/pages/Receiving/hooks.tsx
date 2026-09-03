import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import {
  useStoreData,
  findProductByBarcode,
  searchProductsByName,
  ERROR_NO_SUPPLIER_MATCH,
  ERROR_COULD_NOT_LOOKUP_SUPPLIER_CODE,
  ERROR_NO_PRODUCT_FOR_BARCODE_PREFIX,
  ERROR_QUANTITY_AT_LEAST_ONE_SUFFIX,
  TEXT_SAVED_RECEIVING_PREFIX,
  ERROR_COULD_NOT_SAVE_RECEIVING_ENTRY,
  ERROR_COULD_NOT_UPDATE_PRICE,
  type ReceivingLine, describePlatformError } from "@/lib";
import { productAverageCost } from "@/pages/Inventory/lib";

const today = () => new Date().toISOString().slice(0, 10);

// Quantity/cost are edited as free-form text while the entry is being
// built (so backspacing a default "0"/"1" actually clears the field
// instead of a controlled number input snapping straight back to a
// coerced value on every keystroke); they're only parsed to numbers for
// the live preview and on save.
export interface DraftLine {
  productId: string;
  productName: string;
  quantity: string;
  costEach: string;
}

export function toReceivingLine(line: DraftLine): ReceivingLine {
  return {
    productId: line.productId,
    productName: line.productName,
    quantity: Number(line.quantity) || 0,
    costEach: Number(line.costEach) || 0,
  };
}

interface PrefillProductState {
  productId: string;
  productName: string;
  quantity: number;
}

interface PrefillSupplierState {
  supplierId: string;
  supplierName: string;
}

export function useReceivingPage() {
  const { products, suppliers, receivingHistory, receiveStock, findSupplierByScanCode, updateProduct } = useStoreData();
  const location = useLocation();
  const [supplier, setSupplier] = useState("");
  const [supplierId, setSupplierId] = useState<string | null>(null);
  const [drNumber, setDrNumber] = useState("");
  const [date, setDate] = useState(today());
  const [lines, setLines] = useState<DraftLine[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [scanMode, setScanMode] = useState<"product" | "supplier" | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  const searchResults = useMemo(
    () => searchProductsByName(products, searchQuery).slice(0, 6),
    [products, searchQuery]
  );

  function addLine(productId: string, productName: string, quantity = 1) {
    setLines((prev) => {
      const existing = prev.find((l) => l.productId === productId);
      if (existing) {
        return prev.map((l) =>
          l.productId === productId
            ? { ...l, quantity: String((Number(l.quantity) || 0) + quantity) }
            : l
        );
      }
      return [...prev, { productId, productName, quantity: String(quantity), costEach: "0" }];
    });
    setSearchQuery("");
  }

  // Arriving here from the Dashboard's "Suggested restock" card carries a
  // product + quantity in navigation state rather than a URL param (same
  // pattern as the topbar's quick search into Inventory/Customers) — this
  // pre-fills a draft line for it so admins can review/adjust cost and
  // save, rather than re-searching for the product themselves.
  //
  // addLine() is additive (repeat calls bump the quantity, not replace it),
  // so this effect must run at most once per navigation — a ref (not
  // state, which would itself trigger a re-render/re-run) tracks the last
  // location.key already handled. Without this guard, StrictMode's
  // deliberate double-invoke of effects in development would silently
  // double the pre-filled quantity.
  const prefillHandledKeyRef = useRef<string | null>(null);
  useEffect(() => {
    if (prefillHandledKeyRef.current === location.key) return;
    const state = location.state as { prefillProduct?: PrefillProductState } | null;
    const prefill = state?.prefillProduct;
    if (prefill) {
      prefillHandledKeyRef.current = location.key;
      addLine(prefill.productId, prefill.productName, prefill.quantity);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.key]);

  function handleSupplierNameChange(value: string) {
    // Typing directly is a free-text entry — no longer tied
    // to whichever supplier record was previously picked or
    // scanned.
    setSupplier(value);
    setSupplierId(null);
  }

  function handleSupplierPick(id: string) {
    const found = suppliers.find((s) => s.id === id);
    if (found) {
      setSupplier(found.name);
      setSupplierId(found.id);
    } else {
      setSupplierId(null);
    }
  }

  // Same navigation-state prefill pattern as prefillProduct above (Suppliers
  // page's "Receive" action), guarded by its own ref so the two prefill
  // kinds can arrive together or separately without either one re-firing on
  // a StrictMode double-invoke.
  const prefillSupplierHandledKeyRef = useRef<string | null>(null);
  useEffect(() => {
    if (prefillSupplierHandledKeyRef.current === location.key) return;
    const state = location.state as { prefillSupplier?: PrefillSupplierState } | null;
    const prefill = state?.prefillSupplier;
    if (prefill) {
      prefillSupplierHandledKeyRef.current = location.key;
      setSupplier(prefill.supplierName);
      setSupplierId(prefill.supplierId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.key]);

  async function handleScanDetected(code: string) {
    const mode = scanMode;
    setScanMode(null);
    if (mode === "supplier") {
      try {
        const found = await findSupplierByScanCode(code);
        if (!found) {
          setError(ERROR_NO_SUPPLIER_MATCH);
          return;
        }
        setError(null);
        setSupplier(found.name);
        setSupplierId(found.id);
      } catch (err) {
        setError(describePlatformError(err, ERROR_COULD_NOT_LOOKUP_SUPPLIER_CODE));
      }
      return;
    }

    const product = findProductByBarcode(products, code);
    if (!product) {
      setError(`${ERROR_NO_PRODUCT_FOR_BARCODE_PREFIX} "${code}".`);
      return;
    }
    setError(null);
    addLine(product.id, product.name);
  }

  function updateLine(productId: string, patch: Partial<DraftLine>) {
    setLines((prev) => prev.map((l) => (l.productId === productId ? { ...l, ...patch } : l)));
  }

  function removeLine(productId: string) {
    setLines((prev) => prev.filter((l) => l.productId !== productId));
  }

  // Previous average cost paid for a product, per its saved receiving
  // history — never includes the current unsaved draft line, so this is
  // always "what changed since last time", not a comparison against itself.
  function previousCostFor(productId: string): number | null {
    return productAverageCost(receivingHistory, productId);
  }

  const lowStockSuggestions = useMemo(
    () => products.filter((p) => p.stock <= p.lowStockThreshold && !lines.some((l) => l.productId === p.id)),
    [products, lines]
  );

  function addAllLowStock() {
    for (const p of lowStockSuggestions) {
      addLine(p.id, p.name, Math.max(1, p.lowStockThreshold - p.stock));
    }
  }

  async function raisePriceToProduct(productId: string, newPrice: number) {
    try {
      await updateProduct(productId, { price: newPrice });
    } catch (err) {
      setError(describePlatformError(err, ERROR_COULD_NOT_UPDATE_PRICE));
    }
  }

  async function handleSave() {
    if (lines.length === 0) return;
    const receivingLines = lines.map(toReceivingLine);
    const invalid = receivingLines.find((l) => !Number.isInteger(l.quantity) || l.quantity <= 0);
    if (invalid) {
      setError(`"${invalid.productName}" ${ERROR_QUANTITY_AT_LEAST_ONE_SUFFIX}`);
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await receiveStock(supplier.trim() || "Unspecified supplier", date, receivingLines, supplierId, drNumber);
      setSavedMessage(
        `${TEXT_SAVED_RECEIVING_PREFIX} ${lines.length} product${lines.length === 1 ? "" : "s"}, ${receivingLines.reduce((s, l) => s + l.quantity, 0)} units.`
      );
      setLines([]);
      setSupplier("");
      setSupplierId(null);
      setDrNumber("");
      setTimeout(() => setSavedMessage(null), 4000);
    } catch (err) {
      setError(describePlatformError(err, ERROR_COULD_NOT_SAVE_RECEIVING_ENTRY));
    } finally {
      setSaving(false);
    }
  }

  return {
    products,
    suppliers,
    receivingHistory,
    supplier,
    supplierId,
    drNumber,
    setDrNumber,
    date,
    setDate,
    lines,
    searchQuery,
    setSearchQuery,
    searchResults,
    scanMode,
    setScanMode,
    saving,
    error,
    savedMessage,
    addLine,
    handleSupplierNameChange,
    handleSupplierPick,
    handleScanDetected,
    updateLine,
    removeLine,
    handleSave,
    previousCostFor,
    lowStockSuggestions,
    addAllLowStock,
    raisePriceToProduct,
  };
}
