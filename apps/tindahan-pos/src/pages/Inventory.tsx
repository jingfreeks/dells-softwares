import { lazy, Suspense, useMemo, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { useStoreData } from "../lib/storeData";
import {
  buildBarcodeIndex,
  findDuplicateBarcodeFast,
  lowStockProducts,
  packPriceLabel,
  packUnitPrice,
  stockStatus,
} from "../lib/inventory";
import { PESO } from "../lib/money";
import { StockBadge } from "../components/StockBadge";
import { CameraIcon, TruckIcon } from "../components/icons";
import { ScannerLoadingOverlay } from "../components/ScannerLoadingOverlay";
import { CategoryManager } from "../components/CategoryManager";
import type { Product } from "../lib/types";

const BarcodeScanner = lazy(() =>
  import("../components/BarcodeScanner").then((m) => ({ default: m.BarcodeScanner }))
);

const PAGE_SIZE = 20;

const emptyForm = {
  name: "",
  barcode: "",
  price: "",
  stock: "",
  lowStockThreshold: "5",
  categoryId: "",
  packEnabled: false,
  packQuantity: "",
  packPrice: "",
};

const NEW_CATEGORY_VALUE = "__new__";

export function Inventory() {
  const {
    products,
    categories,
    loading,
    error,
    addProduct,
    updateProduct,
    removeProduct,
    restock,
    addCategory,
  } = useStoreData();
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("All");
  const [showForm, setShowForm] = useState(false);
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [addingCategory, setAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [showScanner, setShowScanner] = useState(false);
  const [duplicateProduct, setDuplicateProduct] = useState<Product | null>(null);
  const [page, setPage] = useState(1);

  const lowStock = useMemo(() => lowStockProducts(products), [products]);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter((p) => {
      const matchesCategory = categoryFilter === "All" || p.category === categoryFilter;
      const matchesQuery =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        (p.barcode ?? "").includes(q);
      return matchesCategory && matchesQuery;
    });
  }, [products, query, categoryFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageProducts = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const packQuantityNum = Number(form.packQuantity);
  const packPriceNum = Number(form.packPrice);
  const packPreview =
    form.packEnabled && packQuantityNum >= 2 && !Number.isNaN(packPriceNum) && packPriceNum >= 0
      ? packUnitPrice(packQuantityNum, packPriceNum)
      : null;

  // Memoized so the barcode field's onChange (fires on every keystroke)
  // does an O(1) map lookup instead of an O(n) scan over all products.
  const barcodeIndex = useMemo(() => buildBarcodeIndex(products), [products]);

  function handleQueryChange(value: string) {
    setQuery(value);
    setPage(1);
  }

  function handleCategoryFilterChange(value: string) {
    setCategoryFilter(value);
    setPage(1);
  }

  function checkDuplicateBarcode(barcode: string) {
    setDuplicateProduct(findDuplicateBarcodeFast(barcodeIndex, barcode, editingId));
  }

  function openAddForm() {
    setEditingId(null);
    setForm({ ...emptyForm, categoryId: categories[0]?.id ?? "" });
    setAddingCategory(false);
    setFormError(null);
    setDuplicateProduct(null);
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
      categoryId: product.categoryId,
      packEnabled: product.packQuantity != null,
      packQuantity: product.packQuantity != null ? String(product.packQuantity) : "",
      packPrice: product.packPrice != null ? String(product.packPrice) : "",
    });
    setAddingCategory(false);
    setFormError(null);
    setDuplicateProduct(null);
    setShowForm(true);
  }

  function handleCategorySelect(value: string) {
    if (value === NEW_CATEGORY_VALUE) {
      setAddingCategory(true);
      setNewCategoryName("");
    } else {
      setForm((f) => ({ ...f, categoryId: value }));
    }
  }

  async function handleCreateCategory() {
    if (!newCategoryName.trim()) return;
    setFormError(null);
    try {
      const category = await addCategory(newCategoryName);
      setForm((f) => ({ ...f, categoryId: category.id }));
      setAddingCategory(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Could not add category.");
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const stock = Number(form.stock);
    const lowStockThreshold = Number(form.lowStockThreshold);

    if (!form.name.trim()) {
      setFormError("Product name is required.");
      return;
    }
    if (Number.isNaN(stock) || stock < 0) {
      setFormError("Stock must be a valid number.");
      return;
    }
    if (!form.categoryId) {
      setFormError("Choose a category.");
      return;
    }
    if (duplicateProduct) {
      setFormError(`That barcode is already used by "${duplicateProduct.name}".`);
      return;
    }

    let price: number;
    let packQuantity: number | null = null;
    let packPrice: number | null = null;

    if (form.packEnabled) {
      packQuantity = Number(form.packQuantity);
      packPrice = Number(form.packPrice);
      if (!Number.isInteger(packQuantity) || packQuantity < 2) {
        setFormError("Pack size must be a whole number of 2 or more.");
        return;
      }
      if (Number.isNaN(packPrice) || packPrice < 0) {
        setFormError("Pack price must be a valid number.");
        return;
      }
      price = packUnitPrice(packQuantity, packPrice);
    } else {
      price = Number(form.price);
      if (form.price.trim() === "" || Number.isNaN(price) || price < 0) {
        setFormError("Price must be a valid number.");
        return;
      }
    }

    const payload = {
      name: form.name.trim(),
      barcode: form.barcode.trim() || null,
      price,
      stock,
      lowStockThreshold: Number.isNaN(lowStockThreshold) ? 5 : lowStockThreshold,
      categoryId: form.categoryId,
      packQuantity,
      packPrice,
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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">Inventory</h1>
          <p className="text-sm text-slate-500">{products.length} products tracked.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            to="/inventory/receiving"
            className="flex items-center gap-1.5 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <TruckIcon className="h-4 w-4" />
            Receive stock
            <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">
              v1.1
            </span>
          </Link>
          <button
            type="button"
            onClick={() => setShowCategoryManager(true)}
            className="cursor-pointer rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Categories
          </button>
          <button
            type="button"
            onClick={openAddForm}
            className="cursor-pointer rounded-lg bg-[var(--color-brand)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--color-brand-dark)]"
          >
            Add product
          </button>
        </div>
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

      <div className="mt-4 flex flex-wrap gap-2">
        <input
          type="text"
          placeholder="Search by name, category, or barcode"
          value={query}
          onChange={(e) => handleQueryChange(e.target.value)}
          className="w-full max-w-sm rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[var(--color-brand)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand)]"
        />
        <select
          value={categoryFilter}
          onChange={(e) => handleCategoryFilterChange(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[var(--color-brand)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand)]"
        >
          <option value="All">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.name}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

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
              pageProducts.map((product) => (
                <tr key={product.id} className="hover:bg-slate-50/60">
                  <td className="px-4 py-3 font-medium text-slate-800">{product.name}</td>
                  <td className="px-4 py-3 text-slate-500">{product.category}</td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">
                    {product.barcode ?? "—"}
                  </td>
                  <td className="tabular-nums px-4 py-3 text-slate-700">
                    {PESO.format(product.price)}
                    {packPriceLabel(product) && (
                      <span className="block text-xs text-slate-400">{packPriceLabel(product)}</span>
                    )}
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

      {!loading && filtered.length > 0 && (
        <div className="mt-3 flex items-center justify-between text-sm text-slate-500">
          <span>
            Showing {(currentPage - 1) * PAGE_SIZE + 1}–
            {Math.min(currentPage * PAGE_SIZE, filtered.length)} of {filtered.length}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage(Math.max(1, currentPage - 1))}
              disabled={currentPage <= 1}
              className="cursor-pointer rounded-lg border border-slate-300 px-3 py-1.5 font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Previous
            </button>
            <span>
              Page {currentPage} of {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage >= totalPages}
              className="cursor-pointer rounded-lg border border-slate-300 px-3 py-1.5 font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}

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
                    onChange={(e) => {
                      const value = e.target.value;
                      setForm((f) => ({ ...f, barcode: value }));
                      checkDuplicateBarcode(value);
                    }}
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
                {duplicateProduct && (
                  <div
                    role="alert"
                    className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800"
                  >
                    This barcode is already used by <strong>{duplicateProduct.name}</strong>.{" "}
                    <button
                      type="button"
                      onClick={() => {
                        if (
                          window.confirm(
                            `Switch to editing "${duplicateProduct.name}"? Anything you've typed here will be discarded.`
                          )
                        ) {
                          openEditForm(duplicateProduct);
                        }
                      }}
                      className="cursor-pointer font-semibold underline"
                    >
                      Open existing product
                    </button>{" "}
                    instead.
                  </div>
                )}
              </div>
              <div>
                <label htmlFor="pcategory" className="text-xs font-medium text-slate-700">
                  Category
                </label>
                {addingCategory ? (
                  <div className="mt-1 flex gap-2">
                    <input
                      type="text"
                      autoFocus
                      placeholder="New category name"
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleCreateCategory())}
                      className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[var(--color-brand)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand)]"
                    />
                    <button
                      type="button"
                      onClick={handleCreateCategory}
                      className="cursor-pointer rounded-lg bg-[var(--color-brand)] px-3 py-2 text-sm font-medium text-white hover:bg-[var(--color-brand-dark)]"
                    >
                      Add
                    </button>
                    <button
                      type="button"
                      onClick={() => setAddingCategory(false)}
                      className="cursor-pointer rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <select
                    id="pcategory"
                    value={form.categoryId}
                    onChange={(e) => handleCategorySelect(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[var(--color-brand)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand)]"
                  >
                    <option value="" disabled>
                      Choose a category…
                    </option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                    <option value={NEW_CATEGORY_VALUE}>+ New category…</option>
                  </select>
                )}
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-slate-700">Pricing</label>
                  <label className="flex cursor-pointer items-center gap-1.5 text-xs text-slate-600">
                    <input
                      type="checkbox"
                      checked={form.packEnabled}
                      onChange={(e) => setForm((f) => ({ ...f, packEnabled: e.target.checked }))}
                      className="h-4 w-4 rounded border-slate-300"
                    />
                    Sell by pack (e.g. 3 pcs for ₱5)
                  </label>
                </div>
                {form.packEnabled ? (
                  <div className="mt-1 grid grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="ppackqty" className="text-xs font-medium text-slate-700">
                        Pack size (pcs)
                      </label>
                      <input
                        id="ppackqty"
                        type="number"
                        min="2"
                        step="1"
                        value={form.packQuantity}
                        onChange={(e) => setForm((f) => ({ ...f, packQuantity: e.target.value }))}
                        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[var(--color-brand)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand)]"
                      />
                    </div>
                    <div>
                      <label htmlFor="ppackprice" className="text-xs font-medium text-slate-700">
                        Pack price (₱)
                      </label>
                      <input
                        id="ppackprice"
                        type="number"
                        min="0"
                        step="0.01"
                        value={form.packPrice}
                        onChange={(e) => setForm((f) => ({ ...f, packPrice: e.target.value }))}
                        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[var(--color-brand)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand)]"
                      />
                    </div>
                    {packPreview !== null && (
                      <p className="col-span-2 text-xs text-slate-500">
                        ≈ {PESO.format(packPreview)} per pc
                      </p>
                    )}
                  </div>
                ) : (
                  <input
                    id="pprice"
                    type="number"
                    min="0"
                    value={form.price}
                    onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[var(--color-brand)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand)]"
                  />
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
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
                  disabled={submitting || !!duplicateProduct}
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
              checkDuplicateBarcode(code);
            }}
            onClose={() => setShowScanner(false)}
          />
        </Suspense>
      )}

      {showCategoryManager && <CategoryManager onClose={() => setShowCategoryManager(false)} />}
    </div>
  );
}
