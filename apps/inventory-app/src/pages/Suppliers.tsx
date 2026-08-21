import { describeWriteError } from "../lib/platformErrors";
import { useEffect, useState, type FormEvent } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { useAccessDenied } from "../lib/permissions";
import { createSupplier, deleteSupplier, listSuppliers } from "../lib/suppliers";
import type { Supplier } from "../lib/types";

const emptyForm = { name: "", phone: "", address: "" };

export function Suppliers() {
  const { user } = useAuth();
  const accessDenied = useAccessDenied("inventory.supplier.manage");
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    listSuppliers(user.storeId)
      .then((rows) => {
        if (!cancelled) setSuppliers(rows);
      })
      .catch((err) => {
        if (!cancelled) setError(describeWriteError(err, "Could not load suppliers."));
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
    if (!form.name.trim()) {
      setFormError("Name is required.");
      return;
    }
    setSubmitting(true);
    setFormError(null);
    try {
      await createSupplier({
        storeId: user.storeId,
        name: form.name.trim(),
        phone: form.phone.trim() || null,
        address: form.address.trim() || null,
      });
      const rows = await listSuppliers(user.storeId);
      setSuppliers(rows);
      setShowForm(false);
      setForm(emptyForm);
    } catch (err) {
      setFormError(describeWriteError(err, "Could not save supplier."));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteSupplier(id);
      setSuppliers((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      setError(describeWriteError(err, "Could not delete supplier."));
    }
  }

  return (
    <div className="p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">Suppliers</h1>
          <p className="text-sm text-slate-500">
            Used on purchase orders and receiving entries.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="shrink-0 cursor-pointer rounded-xl bg-[var(--color-brand)] px-3 py-2 text-sm font-medium text-white hover:bg-[var(--color-brand-dark)]"
        >
          {showForm ? "Cancel" : "Add supplier"}
        </button>
      </div>

      {showForm && (
        <div className="mt-4 card p-4">
          <form className="grid gap-3 sm:grid-cols-3" onSubmit={handleSubmit} noValidate>
            <div>
              <label htmlFor="sName" className="text-xs font-medium text-slate-700">
                Name
              </label>
              <input
                id="sName"
                type="text"
                autoFocus
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-[var(--color-brand)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand)]"
              />
            </div>
            <div>
              <label htmlFor="sPhone" className="text-xs font-medium text-slate-700">
                Phone (optional)
              </label>
              <input
                id="sPhone"
                type="text"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-[var(--color-brand)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand)]"
              />
            </div>
            <div>
              <label htmlFor="sAddress" className="text-xs font-medium text-slate-700">
                Address (optional)
              </label>
              <input
                id="sAddress"
                type="text"
                value={form.address}
                onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-[var(--color-brand)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand)]"
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="h-10 cursor-pointer rounded-xl bg-[var(--color-brand)] px-4 text-sm font-semibold text-white hover:bg-[var(--color-brand-dark)] disabled:cursor-not-allowed disabled:opacity-60 sm:col-span-3"
            >
              {submitting ? "Saving…" : "Add supplier"}
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
          <h2 className="text-sm font-semibold text-slate-900">All suppliers</h2>
        </div>
        {loading ? (
          <p className="px-4 py-8 text-center text-sm text-slate-400">Loading…</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {suppliers.map((supplier) => (
              <li key={supplier.id} className="flex items-center justify-between px-4 py-3 text-sm">
                <div>
                  <p className="font-medium text-slate-800">{supplier.name}</p>
                  <p className="text-xs text-slate-500">
                    {supplier.phone ?? "No phone"} · {supplier.address ?? "No address on file"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleDelete(supplier.id)}
                  className="shrink-0 cursor-pointer text-xs font-medium text-red-600 hover:underline"
                >
                  Delete
                </button>
              </li>
            ))}
            {suppliers.length === 0 && (
              <li className="px-4 py-8 text-center text-sm text-slate-400">No suppliers yet.</li>
            )}
          </ul>
        )}
      </div>
    </div>
  );
}
