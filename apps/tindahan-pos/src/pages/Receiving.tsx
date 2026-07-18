import { lazy, Suspense, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useStoreData, type ReceivingLine } from "../lib/storeData";
import { findProductByBarcode, searchProductsByName } from "../lib/pos";
import { CameraIcon } from "../components/icons";
import { ScannerLoadingOverlay } from "../components/ScannerLoadingOverlay";
import { V1_1Badge } from "../components/V1_1Badge";

const BarcodeScanner = lazy(() =>
  import("../components/BarcodeScanner").then((m) => ({ default: m.BarcodeScanner }))
);

const PESO = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" });
const today = () => new Date().toISOString().slice(0, 10);

export function Receiving() {
  const { products, receivingHistory, receiveStock } = useStoreData();
  const [supplier, setSupplier] = useState("");
  const [date, setDate] = useState(today());
  const [lines, setLines] = useState<ReceivingLine[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showScanner, setShowScanner] = useState(false);
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
        return prev.map((l) => (l.productId === productId ? { ...l, quantity: l.quantity + 1 } : l));
      }
      return [...prev, { productId, productName, quantity: 1, costEach: 0 }];
    });
    setSearchQuery("");
  }

  function handleScanDetected(barcode: string) {
    setShowScanner(false);
    const product = findProductByBarcode(products, barcode);
    if (!product) {
      setError(`No product found for barcode "${barcode}".`);
      return;
    }
    setError(null);
    addLine(product.id, product.name);
  }

  function updateLine(productId: string, patch: Partial<ReceivingLine>) {
    setLines((prev) => prev.map((l) => (l.productId === productId ? { ...l, ...patch } : l)));
  }

  function removeLine(productId: string) {
    setLines((prev) => prev.filter((l) => l.productId !== productId));
  }

  function stockPreview(productId: string, quantity: number) {
    const product = products.find((p) => p.id === productId);
    if (!product) return null;
    return { old: product.stock, next: product.stock + quantity };
  }

  async function handleSave() {
    if (lines.length === 0) return;
    setSaving(true);
    setError(null);
    try {
      await receiveStock(supplier.trim() || "Unspecified supplier", date, lines);
      setSavedMessage(
        `Saved — ${lines.length} product${lines.length === 1 ? "" : "s"}, ${lines.reduce((s, l) => s + l.quantity, 0)} units.`
      );
      setLines([]);
      setSupplier("");
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
            Record new supply from a delivery. Stock updates are real —{" "}
            <Link to="/inventory" className="underline">
              back to Inventory
            </Link>
            .
          </p>
        </div>
        <V1_1Badge />
      </div>

      <div className="mt-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="supplier" className="text-xs font-medium text-slate-700">
              Supplier (optional)
            </label>
            <input
              id="supplier"
              type="text"
              value={supplier}
              onChange={(e) => setSupplier(e.target.value)}
              placeholder="e.g. Mega Distribution"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[var(--color-brand)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand)]"
            />
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
              onClick={() => setShowScanner(true)}
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
                  const preview = stockPreview(line.productId, line.quantity);
                  return (
                    <tr key={line.productId}>
                      <td className="px-3 py-2 font-medium text-slate-800">{line.productName}</td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          min="1"
                          value={line.quantity}
                          onChange={(e) =>
                            updateLine(line.productId, { quantity: Number(e.target.value) || 0 })
                          }
                          className="w-20 rounded-lg border border-slate-300 px-2 py-1 text-sm"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={line.costEach}
                          onChange={(e) =>
                            updateLine(line.productId, { costEach: Number(e.target.value) || 0 })
                          }
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
                {PESO.format(lines.reduce((sum, l) => sum + l.quantity * l.costEach, 0))}
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
          <p className="text-xs text-slate-500">Preview only — this list resets on reload for now.</p>
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

      {showScanner && (
        <Suspense fallback={<ScannerLoadingOverlay />}>
          <BarcodeScanner onDetected={handleScanDetected} onClose={() => setShowScanner(false)} />
        </Suspense>
      )}
    </div>
  );
}
