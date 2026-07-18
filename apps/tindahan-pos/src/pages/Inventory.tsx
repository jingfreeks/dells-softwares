import { lazy, Suspense, useMemo, useState, type FormEvent } from "react";
import { useStoreData } from "../lib/storeData";
import { lowStockProducts, stockStatus } from "../lib/inventory";
import { StockBadge } from "../components/StockBadge";
import { CameraIcon } from "../components/icons";
import { ScannerLoadingOverlay } from "../components/ScannerLoadingOverlay";
import type { Product } from "../lib/types";

const BarcodeScanner = lazy(() =>
  import("../components/BarcodeScanner").then((m) => ({ default: m.BarcodeScanner }))
);

const PESO = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" });

const emptyForm = {
  name: "",
  barcode: "",
  price: "",
  stock: "",
  lowStockThreshold: "5",
  category: "",
};

export function Inventory() {
  const { products, loading, error, addProduct, updateProduct, removeProduct, restock } =
    useStoreData();
  const [query, setQuery] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [showScanner, setShowScanner] = useState(false);

  const lowStock = useMemo(() => lowStockProducts(products), [products]);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return products;
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        (p.barcode ?? "").includes(q)
    );
  }, [products, query]);

  function openAddForm() {
    setEditingId(null);
    setForm(emptyForm);
    setFormError(null);
    setShowForm(true);
  }

  function openEditForm(product: Product) {
    setEditingId(product.id);
    setForm({
      name: product.name,
      barcode: product.barcode ?? "",
      price: String(product.price),
      stock: String(product.stock),
      lowStockThreshold: String(product.lowStockThreshold),
      category: product.category,
    });
    setFormError(null);
    setShowForm(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const price = Number(form.price);
    const stock = Number(form.stock);
    const lowStockThreshold = Number(form.lowStockThreshold);

    if (!form.name.trim()) {
      setFormError("Product name is required.");
      return;
    }
    if (Number.isNaN(price) || price < 0) {
      setFormError("Price must be a valid number.");
      return;
    }
    if (Number.isNaN(stock) || stock < 0) {
      setFormError("Stock must be a valid number.");
      return;
    }

    const payload = {
      name: form.name.trim(),
      barcode: form.barcode.trim() || null,
      price,
      stock,
      lowStockThreshold: Number.isNaN(lowStockThreshold) ? 5 : lowStockThreshold,
      category: form.category.trim() || "Uncategorized",
    };

    setSubmitting(true);
    setFormError(null);
    try {
      if (editingId) {
        await updateProduct(editingId, payload);
      } else {
        await addProduct(payload);
      }
      setShowForm(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Could not save product.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRestock(id: string) {
    setActionError(null);
    try {
      await restock(id, 10);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Could not restock product.");
    }
  }

  async function handleRemove(id: string) {
    setActionError(null);
    try {
      await removeProduct(id);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Could not remove product.");
    }
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">Inventory</h1>
          <p className="text-sm text-slate-500">{products.length} products tracked.</p>
        </div>
        <button
          type="button"
          onClick={openAddForm}
          className="cursor-pointer rounded-lg bg-[var(--color-brand)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--color-brand-dark)]"
        >
          Add product
        </button>
      </div>

      {(error || actionError) && (
        <div role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error ?? actionError}
        </div>
      )}

      {!loading && lowStock.length > 0 && (
        <div role="alert" className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {lowStock.length} product{lowStock.length === 1 ? "" : "s"} running low or out of stock —{" "}
          {lowStock.map((p) => p.name).join(", ")}.
        </div>
      )}

      <input
        type="text"
        placeholder="Search by name, category, or barcode"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="mt-4 w-full max-w-sm rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[var(--color-brand)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand)]"
      />

      <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Product</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Barcode</th>
              <th className="px-4 py-3">Price</th>
              <th className="px-4 py-3">Stock</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading &&
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  <td colSpan={7} className="px-4 py-3">
                    <div className="h-4 w-full animate-pulse rounded bg-slate-100" />
                  </td>
                </tr>
              ))}
            {!loading &&
              filtered.map((product) => (
                <tr key={product.id} className="hover:bg-slate-50/60">
                  <td className="px-4 py-3 font-medium text-slate-800">{product.name}</td>
                  <td className="px-4 py-3 text-slate-500">{product.category}</td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">
                    {product.barcode ?? "—"}
                  </td>
                  <td className="tabular-nums px-4 py-3 text-slate-700">
                    {PESO.format(product.price)}
                  </td>
                  <td className="tabular-nums px-4 py-3 text-slate-700">{product.stock}</td>
                  <td className="px-4 py-3">
                    <StockBadge status={stockStatus(product)} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1 text-xs">
                      <button
                        type="button"
                        onClick={() => handleRestock(product.id)}
                        className="flex min-h-11 cursor-pointer items-center px-2 text-slate-600 hover:underline"
                      >
                        +10 stock
                      </button>
                      <button
                        type="button"
                        onClick={() => openEditForm(product)}
                        className="flex min-h-11 cursor-pointer items-center px-2 text-slate-600 hover:underline"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemove(product.id)}
                        className="flex min-h-11 cursor-pointer items-center px-2 text-red-600 hover:underline"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            {!loading && filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                  No products match "{query}".
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-10 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h2 className="text-base font-semibold text-slate-900">
              {editingId ? "Edit product" : "Add product"}
            </h2>
            <form className="mt-4 flex flex-col gap-3" onSubmit={handleSubmit} noValidate>
              <div>
                <label htmlFor="pname" className="text-xs font-medium text-slate-700">
                  Name
                </label>
                <input
                  id="pname"
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[var(--color-brand)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand)]"
                />
              </div>
              <div>
                <label htmlFor="pbarcode" className="text-xs font-medium text-slate-700">
                  Barcode (optional — leave blank for tingi/repack items)
                </label>
                <div className="mt-1 flex gap-2">
                  <input
                    id="pbarcode"
                    type="text"
                    value={form.barcode}
                    onChange={(e) => setForm((f) => ({ ...f, barcode: e.target.value }))}
                    className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono focus:border-[var(--color-brand)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand)]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowScanner(true)}
                    aria-label="Scan with camera"
                    className="flex h-[38px] w-10 cursor-pointer items-center justify-center rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-100"
                  >
                    <CameraIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div>
                <label htmlFor="pcategory" className="text-xs font-medium text-slate-700">
                  Category
                </label>
                <input
                  id="pcategory"
                  type="text"
                  value={form.category}
                  onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[var(--color-brand)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand)]"
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label htmlFor="pprice" className="text-xs font-medium text-slate-700">
                    Price
                  </label>
                  <input
                    id="pprice"
                    type="number"
                    min="0"
                    value={form.price}
                    onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[var(--color-brand)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand)]"
                  />
                </div>
                <div>
                  <label htmlFor="pstock" className="text-xs font-medium text-slate-700">
                    Stock
                  </label>
                  <input
                    id="pstock"
                    type="number"
                    min="0"
                    value={form.stock}
                    onChange={(e) => setForm((f) => ({ ...f, stock: e.target.value }))}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[var(--color-brand)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand)]"
                  />
                </div>
                <div>
                  <label htmlFor="pthreshold" className="text-xs font-medium text-slate-700">
                    Low-stock at
                  </label>
                  <input
                    id="pthreshold"
                    type="number"
                    min="0"
                    value={form.lowStockThreshold}
                    onChange={(e) => setForm((f) => ({ ...f, lowStockThreshold: e.target.value }))}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[var(--color-brand)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand)]"
                  />
                </div>
              </div>

              {formError && (
                <p role="alert" className="text-sm text-red-600">
                  {formError}
                </p>
              )}

              <div className="mt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="cursor-pointer rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="cursor-pointer rounded-lg bg-[var(--color-brand)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--color-brand-dark)] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting ? "Saving…" : editingId ? "Save changes" : "Add product"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showScanner && (
        <Suspense fallback={<ScannerLoadingOverlay />}>
          <BarcodeScanner
            onDetected={(code) => {
              setShowScanner(false);
              setForm((f) => ({ ...f, barcode: code }));
            }}
            onClose={() => setShowScanner(false)}
          />
        </Suspense>
      )}
    </div>
  );
}
