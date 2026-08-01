import { useMemo, useState } from "react";
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
  type ReceivingLine,
} from "@/lib";

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

export function useReceivingPage() {
  const { products, suppliers, receivingHistory, receiveStock, findSupplierByScanCode } = useStoreData();
  const [supplier, setSupplier] = useState("");
  const [supplierId, setSupplierId] = useState<string | null>(null);
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

  function addLine(productId: string, productName: string) {
    setLines((prev) => {
      const existing = prev.find((l) => l.productId === productId);
      if (existing) {
        return prev.map((l) =>
          l.productId === productId ? { ...l, quantity: String((Number(l.quantity) || 0) + 1) } : l
        );
      }
      return [...prev, { productId, productName, quantity: "1", costEach: "0" }];
    });
    setSearchQuery("");
  }

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
        setError(err instanceof Error ? err.message : ERROR_COULD_NOT_LOOKUP_SUPPLIER_CODE);
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
      await receiveStock(supplier.trim() || "Unspecified supplier", date, receivingLines, supplierId);
      setSavedMessage(
        `${TEXT_SAVED_RECEIVING_PREFIX} ${lines.length} product${lines.length === 1 ? "" : "s"}, ${receivingLines.reduce((s, l) => s + l.quantity, 0)} units.`
      );
      setLines([]);
      setSupplier("");
      setSupplierId(null);
      setTimeout(() => setSavedMessage(null), 4000);
    } catch (err) {
      setError(err instanceof Error ? err.message : ERROR_COULD_NOT_SAVE_RECEIVING_ENTRY);
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
  };
}
