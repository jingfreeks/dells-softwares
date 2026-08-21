import { describeWriteError } from "../lib/platformErrors";
import { useEffect, useState, type FormEvent } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { useAccessDenied } from "../lib/permissions";
import { createProduct, deleteProduct, listProducts } from "../lib/products";
import { listCategories, type Category } from "../lib/categories";
import type { Product } from "../lib/types";

const emptyForm = { name: "", barcode: "", price: "", stock: "", lowStockThreshold: "5", categoryId: "" };

export function Products() {
  const { user } = useAuth();
  const accessDenied = useAccessDenied("inventory.product.manage");
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    Promise.all([listProducts(user.storeId), listCategories(user.storeId)])
      .then(([productRows, categoryRows]) => {
        if (cancelled) return;
        setProducts(productRows);
        setCategories(categoryRows);
        setForm((f) => ({ ...f, categoryId: f.categoryId || categoryRows[0]?.id || "" }));
      })
      .catch((err) => {
        if (!cancelled) setError(describeWriteError(err, "Could not load products."));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  if (user && accessDenied) {
    return <Navigate to="/login" replace />;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!user) return;
    const price = Number(form.price);
    const stock = Number(form.stock) || 0;
    const lowStockThreshold = Number(form.lowStockThreshold) || 0;
    if (!form.name.trim()) {
      setFormError("Name is required.");
      return;
    }
    if (!form.categoryId) {
      setFormError("Category is required.");
      return;
    }
    if (!Number.isFinite(price) || price < 0) {
      setFormError("Enter a valid price.");
      return;
    }
    setSubmitting(true);
    setFormError(null);
    try {
      await createProduct({
        storeId: user.storeId,
        name: form.name.trim(),
        price,
        stock,
        lowStockThreshold,
        categoryId: form.categoryId,
        barcode: form.barcode.trim() || null,
      });
      const rows = await listProducts(user.storeId);
      setProducts(rows);
      setShowForm(false);
      setForm((f) => ({ ...emptyForm, categoryId: f.categoryId }));
    } catch (err) {
      setFormError(describeWriteError(err, "Could not save product."));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteProduct(id);
      setProducts((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      setError(describeWriteError(err, "Could not delete product."));
    }
  }

  return (
    <div className="p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">Products</h1>
          <p className="text-sm text-slate-500">
            The catalog used across purchase orders, receiving, conversion, and counts.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="shrink-0 cursor-pointer rounded-xl bg-[var(--color-brand)] px-3 py-2 text-sm font-medium text-white hover:bg-[var(--color-brand-dark)]"
        >
          {showForm ? "Cancel" : "Add product"}
        </button>
      </div>

      {showForm && (
        <div className="mt-4 card p-4">
          <form className="grid gap-3 sm:grid-cols-2" onSubmit={handleSubmit} noValidate>
            <div>
              <label htmlFor="pName" className="text-xs font-medium text-slate-700">
                Name
              </label>
              <input
                id="pName"
                type="text"
                autoFocus
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-[var(--color-brand)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand)]"
              />
            </div>
            <div>
              <label htmlFor="pBarcode" className="text-xs font-medium text-slate-700">
                Barcode (optional)
              </label>
              <input
                id="pBarcode"
                type="text"
                value={form.barcode}
                onChange={(e) => setForm((f) => ({ ...f, barcode: e.target.value }))}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-[var(--color-brand)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand)]"
              />
            </div>
            <div>
              <label htmlFor="pCategory" className="text-xs font-medium text-slate-700">
                Category
              </label>
              <select
                id="pCategory"
                value={form.categoryId}
                onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-[var(--color-brand)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand)]"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="pPrice" className="text-xs font-medium text-slate-700">
                Price
              </label>
              <input
                id="pPrice"
                type="number"
                step="0.01"
                min="0"
                value={form.price}
                onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-[var(--color-brand)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand)]"
              />
            </div>
            <div>
              <label htmlFor="pStock" className="text-xs font-medium text-slate-700">
                Starting stock
              </label>
              <input
                id="pStock"
                type="number"
                min="0"
                value={form.stock}
                onChange={(e) => setForm((f) => ({ ...f, stock: e.target.value }))}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-[var(--color-brand)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand)]"
              />
            </div>
            <div>
              <label htmlFor="pThreshold" className="text-xs font-medium text-slate-700">
                Low stock threshold
              </label>
              <input
                id="pThreshold"
                type="number"
                min="0"
                value={form.lowStockThreshold}
                onChange={(e) => setForm((f) => ({ ...f, lowStockThreshold: e.target.value }))}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-[var(--color-brand)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand)]"
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="h-10 cursor-pointer rounded-xl bg-[var(--color-brand)] px-4 text-sm font-semibold text-white hover:bg-[var(--color-brand-dark)] disabled:cursor-not-allowed disabled:opacity-60 sm:col-span-2"
            >
              {submitting ? "Saving…" : "Add product"}
            </button>
          </form>
          {formError && (
            <p role="alert" className="mt-2 text-sm text-red-600">
              {formError}
            </p>
          )}
        </div>
      )}

      {error && (
        <p role="alert" className="mt-4 text-sm text-red-600">
          {error}
        </p>
      )}

      <div className="mt-6 card">
        <div className="border-b border-slate-200 p-4">
          <h2 className="text-sm font-semibold text-slate-900">All products</h2>
        </div>
        {loading ? (
          <p className="px-4 py-8 text-center text-sm text-slate-400">Loading…</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {products.map((product) => (
              <li key={product.id} className="flex items-center justify-between px-4 py-3 text-sm">
                <div>
                  <p className="font-medium text-slate-800">{product.name}</p>
                  <p className="text-xs text-slate-500">
                    {product.category} · ₱{product.price.toFixed(2)} · stock {product.stock}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleDelete(product.id)}
                  className="shrink-0 cursor-pointer text-xs font-medium text-red-600 hover:underline"
                >
                  Delete
                </button>
              </li>
            ))}
            {products.length === 0 && (
              <li className="px-4 py-8 text-center text-sm text-slate-400">No products yet.</li>
            )}
          </ul>
        )}
      </div>
    </div>
  );
}
