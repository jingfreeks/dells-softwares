import { lazy, Suspense, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useStoreData } from "../lib/storeData";
import { receivingTotalCost, stockPreview, type ReceivingLine } from "../lib/inventory";
import { findProductByBarcode, searchProductsByName } from "../lib/pos";
import { PESO } from "../lib/money";
import { selectOnFocus } from "../lib/dom";
import { CameraIcon, ScanIcon } from "../components/icons";
import { ScannerLoadingOverlay } from "../components/ScannerLoadingOverlay";

const BarcodeScanner = lazy(() =>
  import("../components/BarcodeScanner").then((m) => ({ default: m.BarcodeScanner }))
);

const today = () => new Date().toISOString().slice(0, 10);

// Quantity/cost are edited as free-form text while the entry is being
// built (so backspacing a default "0"/"1" actually clears the field
// instead of a controlled number input snapping straight back to a
// coerced value on every keystroke); they're only parsed to numbers for
// the live preview and on save.
interface DraftLine {
  productId: string;
  productName: string;
  quantity: string;
  costEach: string;
}

function toReceivingLine(line: DraftLine): ReceivingLine {
  return {
    productId: line.productId,
    productName: line.productName,
    quantity: Number(line.quantity) || 0,
    costEach: Number(line.costEach) || 0,
  };
}

export function Receiving() {
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

  async function handleScanDetected(code: string) {
    const mode = scanMode;
    setScanMode(null);
    if (mode === "supplier") {
      try {
        const found = await findSupplierByScanCode(code);
        if (!found) {
          setError("No supplier matches that code. Add them under Suppliers first.");
          return;
        }
        setError(null);
        setSupplier(found.name);
        setSupplierId(found.id);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not look up that supplier code.");
      }
      return;
    }

    const product = findProductByBarcode(products, code);
    if (!product) {
      setError(`No product found for barcode "${code}".`);
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
      setError(`"${invalid.productName}" needs a quantity of at least 1.`);
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await receiveStock(supplier.trim() || "Unspecified supplier", date, receivingLines, supplierId);
      setSavedMessage(
        `Saved — ${lines.length} product${lines.length === 1 ? "" : "s"}, ${receivingLines.reduce((s, l) => s + l.quantity, 0)} units.`
      );
      setLines([]);
      setSupplier("");
      setSupplierId(null);
      setTimeout(() => setSavedMessage(null), 4000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save receiving entry.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">Receive stock</h1>
          <p className="text-sm text-slate-500">
            Record new supply from a delivery.{" "}
            <Link to="/inventory" className="underline">
              Back to Inventory
            </Link>
            .
          </p>
        </div>
        <Link
          to="/suppliers"
          className="shrink-0 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Manage suppliers
        </Link>
      </div>

      <div className="mt-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="supplier" className="text-xs font-medium text-slate-700">
              Supplier (optional)
            </label>
            <div className="mt-1 flex gap-2">
              <input
                id="supplier"
                type="text"
                value={supplier}
                onChange={(e) => {
                  // Typing directly is a free-text entry — no longer tied
                  // to whichever supplier record was previously picked or
                  // scanned.
                  setSupplier(e.target.value);
                  setSupplierId(null);
                }}
                placeholder="e.g. Mega Distribution"
                className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[var(--color-brand)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand)]"
              />
              <button
                type="button"
                onClick={() => setScanMode("supplier")}
                aria-label="Scan supplier code"
                title="Scan supplier code"
                className="flex h-[38px] w-10 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-100"
              >
                <ScanIcon className="h-4 w-4" />
              </button>
            </div>
            {suppliers.length > 0 && (
              <select
                aria-label="Pick a saved supplier"
                value={supplierId ?? ""}
                onChange={(e) => {
                  const found = suppliers.find((s) => s.id === e.target.value);
                  if (found) {
                    setSupplier(found.name);
                    setSupplierId(found.id);
                  } else {
                    setSupplierId(null);
                  }
                }}
                className="mt-1.5 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-600 focus:border-[var(--color-brand)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand)]"
              >
                <option value="">…or pick a saved supplier</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            )}
          </div>
          <div>
            <label htmlFor="recvDate" className="text-xs font-medium text-slate-700">
              Date
            </label>
            <input
              id="recvDate"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[var(--color-brand)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand)]"
            />
          </div>
        </div>

        <div className="mt-4">
          <label htmlFor="recvSearch" className="text-xs font-medium text-slate-700">
            Add a product
          </label>
          <div className="mt-1 flex gap-2">
            <input
              id="recvSearch"
              type="text"
              placeholder="Search by name…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[var(--color-brand)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand)]"
            />
            <button
              type="button"
              onClick={() => setScanMode("product")}
              aria-label="Scan item"
              className="flex items-center gap-1.5 rounded-lg bg-[var(--color-brand)] px-3 py-2 text-sm font-medium text-white hover:bg-[var(--color-brand-dark)]"
            >
              <CameraIcon className="h-4 w-4" />
              Scan item
            </button>
          </div>
          {searchResults.length > 0 && (
            <ul className="mt-2 divide-y divide-slate-100 rounded-lg border border-slate-100">
              {searchResults.map((product) => (
                <li key={product.id}>
                  <button
                    type="button"
                    onClick={() => addLine(product.id, product.name)}
                    className="flex w-full cursor-pointer items-center justify-between px-3 py-2 text-left text-sm hover:bg-slate-50"
                  >
                    <span>{product.name}</span>
                    <span className="text-slate-500">Stock: {product.stock}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {error && (
          <p role="alert" className="mt-3 text-sm text-red-600">
            {error}
          </p>
        )}

        {lines.length > 0 && (
          <div className="mt-4 overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-3 py-2">Product</th>
                  <th className="px-3 py-2">Qty received</th>
                  <th className="px-3 py-2">Cost each</th>
                  <th className="px-3 py-2">New stock</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {lines.map((line) => {
                  const preview = stockPreview(products, line.productId, Number(line.quantity) || 0);
                  return (
                    <tr key={line.productId}>
                      <td className="px-3 py-2 font-medium text-slate-800">{line.productName}</td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          min="1"
                          value={line.quantity}
                          onFocus={selectOnFocus}
                          onChange={(e) => updateLine(line.productId, { quantity: e.target.value })}
                          className="w-20 rounded-lg border border-slate-300 px-2 py-1 text-sm"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={line.costEach}
                          onFocus={selectOnFocus}
                          onChange={(e) => updateLine(line.productId, { costEach: e.target.value })}
                          className="w-24 rounded-lg border border-slate-300 px-2 py-1 text-sm"
                        />
                      </td>
                      <td className="tabular-nums px-3 py-2 font-medium text-[var(--color-brand)]">
                        {preview ? `${preview.old} → ${preview.next}` : "—"}
                      </td>
                      <td className="px-3 py-2">
                        <button
                          type="button"
                          onClick={() => removeLine(line.productId)}
                          className="cursor-pointer text-xs text-red-600 hover:underline"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="flex items-center justify-between border-t border-slate-200 px-3 py-2 text-sm">
              <span className="text-slate-500">Total cost</span>
              <span className="tabular-nums font-semibold text-slate-900">
                {PESO.format(receivingTotalCost(lines.map(toReceivingLine)))}
              </span>
            </div>
          </div>
        )}

        {savedMessage && (
          <p role="status" className="mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            {savedMessage}
          </p>
        )}

        <button
          type="button"
          onClick={handleSave}
          disabled={lines.length === 0 || saving}
          className="mt-4 cursor-pointer rounded-lg bg-[var(--color-brand)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--color-brand-dark)] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {saving ? "Saving…" : "Save receiving entry"}
        </button>
      </div>

      <div className="mt-6 rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-4">
          <h2 className="text-sm font-semibold text-slate-900">Recent receiving history</h2>
        </div>
        <ul className="divide-y divide-slate-100">
          {receivingHistory.map((entry) => (
            <li key={entry.id} className="px-4 py-3 text-sm text-slate-700">
              {new Date(entry.date).toLocaleDateString("en-PH", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}{" "}
              — {entry.supplier} — {entry.lines.length} product
              {entry.lines.length === 1 ? "" : "s"},{" "}
              {entry.lines.reduce((s, l) => s + l.quantity, 0)} units
            </li>
          ))}
          {receivingHistory.length === 0 && (
            <li className="px-4 py-8 text-center text-sm text-slate-400">
              No receiving entries yet this session.
            </li>
          )}
        </ul>
      </div>

      {scanMode && (
        <Suspense fallback={<ScannerLoadingOverlay />}>
          <BarcodeScanner onDetected={handleScanDetected} onClose={() => setScanMode(null)} />
        </Suspense>
      )}
    </div>
  );
}
