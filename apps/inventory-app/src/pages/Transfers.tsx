import { useEffect, useState, type FormEvent } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { useCan } from "../lib/permissions";
import { listWarehouses } from "../lib/warehouses";
import { listProducts } from "../lib/products";
import { listTransfers, transferStock } from "../lib/transfers";
import type { Product, Warehouse, WarehouseTransfer } from "../lib/types";

const emptyForm = { fromWarehouseId: "", toWarehouseId: "", productId: "", quantity: "", notes: "" };

export function Transfers() {
  const { user } = useAuth();
  const canManage = useCan("inventory.transfer.manage");
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [transfers, setTransfers] = useState<WarehouseTransfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function reload(storeId: string) {
    const [warehouseRows, productRows, transferRows] = await Promise.all([
      listWarehouses(storeId),
      listProducts(storeId),
      listTransfers(storeId),
    ]);
    setWarehouses(warehouseRows);
    setProducts(productRows);
    setTransfers(transferRows);
    return { warehouseRows, productRows };
  }

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    reload(user.storeId)
      .then(({ warehouseRows, productRows }) => {
        if (cancelled) return;
        setForm((f) => ({
          ...f,
          fromWarehouseId: f.fromWarehouseId || warehouseRows[0]?.id || "",
          toWarehouseId: f.toWarehouseId || warehouseRows[1]?.id || warehouseRows[0]?.id || "",
          productId: f.productId || productRows[0]?.id || "",
        }));
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Could not load transfers.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  if (user && !canManage) {
    return <Navigate to="/login" replace />;
  }

  function warehouseName(id: string) {
    return warehouses.find((w) => w.id === id)?.name ?? "Unknown warehouse";
  }

  function productName(id: string) {
    return products.find((p) => p.id === id)?.name ?? "Unknown product";
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!user) return;
    const quantity = Number(form.quantity);
    if (!form.fromWarehouseId || !form.toWarehouseId) {
      setFormError("Pick both warehouses.");
      return;
    }
    if (form.fromWarehouseId === form.toWarehouseId) {
      setFormError("Source and destination must be different.");
      return;
    }
    if (!form.productId) {
      setFormError("Pick a product.");
      return;
    }
    if (!Number.isFinite(quantity) || quantity <= 0) {
      setFormError("Enter a quantity greater than zero.");
      return;
    }
    setSubmitting(true);
    setFormError(null);
    try {
      await transferStock({
        fromWarehouseId: form.fromWarehouseId,
        toWarehouseId: form.toWarehouseId,
        productId: form.productId,
        quantity,
        notes: form.notes.trim() || null,
      });
      await reload(user.storeId);
      setForm((f) => ({ ...f, quantity: "", notes: "" }));
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Could not complete transfer.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold tracking-tight text-slate-900">Stock Transfers</h1>
      <p className="text-sm text-slate-500">
        Move stock between warehouses — e.g. restocking the sales floor (default warehouse) from
        the back warehouse. Both sides update immediately and atomically.
      </p>

      <div className="mt-4 card p-4">
        <form className="grid gap-3 sm:grid-cols-2" onSubmit={handleSubmit} noValidate>
          <div>
            <label htmlFor="fromWh" className="text-xs font-medium text-slate-700">
              From warehouse
            </label>
            <select
              id="fromWh"
              value={form.fromWarehouseId}
              onChange={(e) => setForm((f) => ({ ...f, fromWarehouseId: e.target.value }))}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-[var(--color-brand)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand)]"
            >
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                  {w.isDefault ? " (POS stock)" : ""}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="toWh" className="text-xs font-medium text-slate-700">
              To warehouse
            </label>
            <select
              id="toWh"
              value={form.toWarehouseId}
              onChange={(e) => setForm((f) => ({ ...f, toWarehouseId: e.target.value }))}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-[var(--color-brand)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand)]"
            >
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                  {w.isDefault ? " (POS stock)" : ""}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="trProduct" className="text-xs font-medium text-slate-700">
              Product
            </label>
            <select
              id="trProduct"
              value={form.productId}
              onChange={(e) => setForm((f) => ({ ...f, productId: e.target.value }))}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-[var(--color-brand)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand)]"
            >
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="trQty" className="text-xs font-medium text-slate-700">
              Quantity
            </label>
            <input
              id="trQty"
              type="number"
              min="1"
              value={form.quantity}
              onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-[var(--color-brand)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand)]"
            />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="trNotes" className="text-xs font-medium text-slate-700">
              Notes (optional)
            </label>
            <input
              id="trNotes"
              type="text"
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-[var(--color-brand)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand)]"
            />
          </div>
          <button
            type="submit"
            disabled={submitting || warehouses.length < 2}
            className="h-10 cursor-pointer rounded-xl bg-[var(--color-brand)] px-4 text-sm font-semibold text-white hover:bg-[var(--color-brand-dark)] disabled:cursor-not-allowed disabled:opacity-60 sm:col-span-2"
          >
            {submitting ? "Transferring…" : "Transfer stock"}
          </button>
        </form>
        {warehouses.length < 2 && (
          <p className="mt-2 text-sm text-slate-500">
            Add a second warehouse first — a transfer needs two different warehouses.
          </p>
        )}
        {formError && (
          <p role="alert" className="mt-2 text-sm text-red-600">
            {formError}
          </p>
        )}
      </div>

      {error && (
        <p role="alert" className="mt-4 text-sm text-red-600">
          {error}
        </p>
      )}

      <div className="mt-6 card">
        <div className="border-b border-slate-200 p-4">
          <h2 className="text-sm font-semibold text-slate-900">Transfer history</h2>
        </div>
        {loading ? (
          <p className="px-4 py-8 text-center text-sm text-slate-400">Loading…</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {transfers.map((t) => (
              <li key={t.id} className="px-4 py-3 text-sm">
                <p className="font-medium text-slate-800">
                  {t.quantity} × {productName(t.productId)}
                </p>
                <p className="text-xs text-slate-500">
                  {warehouseName(t.fromWarehouseId)} → {warehouseName(t.toWarehouseId)} ·{" "}
                  {new Date(t.createdAt).toLocaleString()}
                  {t.notes ? ` · ${t.notes}` : ""}
                </p>
              </li>
            ))}
            {transfers.length === 0 && (
              <li className="px-4 py-8 text-center text-sm text-slate-400">No transfers yet.</li>
            )}
          </ul>
        )}
      </div>
    </div>
  );
}
