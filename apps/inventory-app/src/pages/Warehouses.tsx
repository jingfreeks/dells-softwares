import { useEffect, useState, type FormEvent } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { useCan } from "../lib/permissions";
import { addWarehouse, listWarehouses } from "../lib/warehouses";
import type { Warehouse } from "../lib/types";

const emptyForm = { name: "", address: "" };

export function Warehouses() {
  const { user } = useAuth();
  const canManage = useCan("inventory.warehouse.manage");
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    listWarehouses(user.storeId)
      .then((rows) => {
        if (!cancelled) setWarehouses(rows);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Could not load warehouses.");
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

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!user) return;
    if (!form.name.trim()) {
      setFormError("Name is required.");
      return;
    }
    setSubmitting(true);
    setFormError(null);
    try {
      const warehouse = await addWarehouse(user.storeId, form.name, form.address.trim() || null);
      setWarehouses((prev) => [...prev, warehouse]);
      setShowForm(false);
      setForm(emptyForm);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Could not save warehouse.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">Warehouses</h1>
          <p className="text-sm text-slate-500">
            The default warehouse mirrors the stock used at POS checkout. Additional warehouses track
            their own stock separately.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="shrink-0 cursor-pointer rounded-xl bg-[var(--color-brand)] px-3 py-2 text-sm font-medium text-white hover:bg-[var(--color-brand-dark)]"
        >
          {showForm ? "Cancel" : "Add warehouse"}
        </button>
      </div>

      {showForm && (
        <div className="mt-4 card p-4">
          <form className="flex flex-col gap-3 sm:flex-row sm:items-end" onSubmit={handleSubmit} noValidate>
            <div className="flex-1">
              <label htmlFor="whName" className="text-xs font-medium text-slate-700">
                Name
              </label>
              <input
                id="whName"
                type="text"
                autoFocus
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-[var(--color-brand)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand)]"
              />
            </div>
            <div className="flex-1">
              <label htmlFor="whAddress" className="text-xs font-medium text-slate-700">
                Address (optional)
              </label>
              <input
                id="whAddress"
                type="text"
                value={form.address}
                onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-[var(--color-brand)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand)]"
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="h-10 cursor-pointer rounded-xl bg-[var(--color-brand)] px-4 text-sm font-semibold text-white hover:bg-[var(--color-brand-dark)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? "Saving…" : "Add warehouse"}
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
          <h2 className="text-sm font-semibold text-slate-900">All warehouses</h2>
        </div>
        {loading ? (
          <p className="px-4 py-8 text-center text-sm text-slate-400">Loading…</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {warehouses.map((warehouse) => (
              <li key={warehouse.id} className="flex items-center justify-between px-4 py-3 text-sm">
                <div>
                  <p className="font-medium text-slate-800">{warehouse.name}</p>
                  <p className="text-xs text-slate-500">{warehouse.address ?? "No address on file"}</p>
                </div>
                {warehouse.isDefault && (
                  <span className="shrink-0 rounded-full bg-[var(--color-brand)]/10 px-2.5 py-1 text-xs font-medium text-[var(--color-brand)]">
                    Default (POS stock)
                  </span>
                )}
              </li>
            ))}
            {warehouses.length === 0 && (
              <li className="px-4 py-8 text-center text-sm text-slate-400">No warehouses yet.</li>
            )}
          </ul>
        )}
      </div>
    </div>
  );
}
