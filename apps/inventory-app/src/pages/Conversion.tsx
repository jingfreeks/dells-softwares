import { describeWriteError } from "../lib/platformErrors";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { useCan } from "../lib/permissions";
import { useHasModule, MODULE_READ_ONLY_HINT } from "../lib/modules";
import { listProducts } from "../lib/products";
import { addConversion, listConversions, removeConversion } from "../lib/conversions";
import type { Product, UnitConversion } from "../lib/types";

export function Conversion() {
  const { user } = useAuth();
  const canManage = useCan("inventory.product.manage");
  const hasInventory = useHasModule("INVENTORY");
  const [products, setProducts] = useState<Product[]>([]);
  const [conversions, setConversions] = useState<UnitConversion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [productId, setProductId] = useState("");
  const [unitName, setUnitName] = useState("");
  const [baseUnitFactor, setBaseUnitFactor] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const productName = useMemo(() => {
    const map = new Map(products.map((p) => [p.id, p.name]));
    return (id: string) => map.get(id) ?? "Unknown product";
  }, [products]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    Promise.all([listProducts(user.storeId), listConversions(user.storeId)])
      .then(([p, c]) => {
        if (cancelled) return;
        setProducts(p);
        setConversions(c);
        setProductId((prev) => prev || p[0]?.id || "");
      })
      .catch((err) => {
        if (!cancelled) setError(describeWriteError(err, "Could not load conversions."));
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
    if (!productId) {
      setFormError("Pick a product.");
      return;
    }
    if (!unitName.trim()) {
      setFormError("Unit name is required.");
      return;
    }
    const factor = Number(baseUnitFactor);
    if (!(factor > 0)) {
      setFormError("Base unit factor must be greater than 0.");
      return;
    }

    setSubmitting(true);
    setFormError(null);
    try {
      const conversion = await addConversion(user.storeId, productId, unitName, factor);
      setConversions((prev) => [conversion, ...prev]);
      setUnitName("");
      setBaseUnitFactor("");
    } catch (err) {
      setFormError(describeWriteError(err, "Could not save conversion."));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRemove(id: string) {
    setBusyId(id);
    setError(null);
    try {
      await removeConversion(id);
      setConversions((prev) => prev.filter((c) => c.id !== id));
    } catch (err) {
      setError(describeWriteError(err, "Could not remove conversion."));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold tracking-tight text-slate-900">Unit Conversion</h1>
      <p className="text-sm text-slate-500">
        Define alternate units for a product (e.g. 1 "case" = 24 base units). Stock and prices always
        stay in the base unit — conversions only affect how quantities are entered and displayed.
      </p>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[360px_1fr]">
        <div className="card p-4">
          <h2 className="text-sm font-semibold text-slate-900">Add a conversion</h2>
          <form className="mt-4 flex flex-col gap-3" onSubmit={handleSubmit} noValidate>
            <div>
              <label htmlFor="convProduct" className="text-xs font-medium text-slate-700">
                Product
              </label>
              <select
                id="convProduct"
                value={productId}
                onChange={(e) => setProductId(e.target.value)}
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
              <label htmlFor="convUnit" className="text-xs font-medium text-slate-700">
                Unit name
              </label>
              <input
                id="convUnit"
                type="text"
                placeholder="e.g. case"
                value={unitName}
                onChange={(e) => setUnitName(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-[var(--color-brand)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand)]"
              />
            </div>
            <div>
              <label htmlFor="convFactor" className="text-xs font-medium text-slate-700">
                Base units per {unitName.trim() || "unit"}
              </label>
              <input
                id="convFactor"
                type="number"
                min="0"
                step="0.01"
                placeholder="e.g. 24"
                value={baseUnitFactor}
                onChange={(e) => setBaseUnitFactor(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-[var(--color-brand)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand)]"
              />
            </div>

            {formError && (
              <p role="alert" className="text-sm text-red-600">
                {formError}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting || !hasInventory}
              title={hasInventory ? undefined : MODULE_READ_ONLY_HINT}
              className="mt-1 flex h-10 cursor-pointer items-center justify-center rounded-xl bg-[var(--color-brand)] text-sm font-semibold text-white hover:bg-[var(--color-brand-dark)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? "Saving…" : "Add conversion"}
            </button>
          </form>
        </div>

        <div className="card">
          <div className="border-b border-slate-200 p-4">
            <h2 className="text-sm font-semibold text-slate-900">All conversions</h2>
          </div>
          {error && (
            <p role="alert" className="px-4 pt-3 text-sm text-red-600">
              {error}
            </p>
          )}
          {loading ? (
            <p className="px-4 py-8 text-center text-sm text-slate-400">Loading…</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {conversions.map((c) => (
                <li key={c.id} className="flex items-center justify-between px-4 py-3 text-sm">
                  <div>
                    <p className="font-medium text-slate-800">{productName(c.productId)}</p>
                    <p className="text-xs text-slate-500">
                      1 {c.unitName} = {c.baseUnitFactor} base units
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemove(c.id)}
                    disabled={busyId === c.id}
                    className="cursor-pointer text-xs text-red-600 hover:underline disabled:opacity-50"
                  >
                    Remove
                  </button>
                </li>
              ))}
              {conversions.length === 0 && (
                <li className="px-4 py-8 text-center text-sm text-slate-400">No conversions yet.</li>
              )}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
