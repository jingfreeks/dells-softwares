import { describeWriteError } from "../lib/platformErrors";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { useCan } from "../lib/permissions";
import { useHasModule, MODULE_READ_ONLY_HINT } from "../lib/modules";
import { listWarehouses } from "../lib/warehouses";
import { listProducts } from "../lib/products";
import { listBeginningBalances, setBeginningBalance } from "../lib/beginningBalance";
import type { BeginningBalance as BeginningBalanceRow, Product, Warehouse } from "../lib/types";

const today = () => new Date().toISOString().slice(0, 10);

export function BeginningBalance() {
  const { user } = useAuth();
  const canManage = useCan("inventory.stock.adjust");
  const hasInventory = useHasModule("INVENTORY");
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [balances, setBalances] = useState<BeginningBalanceRow[]>([]);
  const [warehouseId, setWarehouseId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unitCost, setUnitCost] = useState("");
  const [asOfDate, setAsOfDate] = useState(today());
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const productName = useMemo(() => {
    const map = new Map(products.map((p) => [p.id, p.name]));
    return (id: string) => map.get(id) ?? "Unknown product";
  }, [products]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    Promise.all([listWarehouses(user.storeId), listProducts(user.storeId)])
      .then(([w, p]) => {
        if (cancelled) return;
        setWarehouses(w);
        setProducts(p);
        setProductId((prev) => prev || p[0]?.id || "");
        setWarehouseId((prev) => prev || w.find((wh) => wh.isDefault)?.id || w[0]?.id || "");
      })
      .catch((err) => {
        if (!cancelled) setError(describeWriteError(err, "Could not load data."));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    if (!warehouseId) return;
    let cancelled = false;
    listBeginningBalances(warehouseId)
      .then((rows) => {
        if (!cancelled) setBalances(rows);
      })
      .catch((err) => {
        if (!cancelled) setError(describeWriteError(err, "Could not load beginning balances."));
      });
    return () => {
      cancelled = true;
    };
  }, [warehouseId]);

  if (user && !canManage) {
    return <Navigate to="/login" replace />;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!user || !warehouseId) return;
    if (!productId) {
      setFormError("Pick a product.");
      return;
    }
    const qty = Number(quantity);
    if (!Number.isInteger(qty) || qty < 0) {
      setFormError("Quantity must be a whole number, 0 or more.");
      return;
    }
    if (!asOfDate) {
      setFormError("As-of date is required.");
      return;
    }

    setSubmitting(true);
    setFormError(null);
    try {
      const balance = await setBeginningBalance({
        storeId: user.storeId,
        warehouseId,
        productId,
        quantity: qty,
        unitCost: Number(unitCost) || 0,
        asOfDate,
        createdBy: user.id,
      });
      setBalances((prev) => [balance, ...prev.filter((b) => b.productId !== productId)]);
      setQuantity("");
      setUnitCost("");
    } catch (err) {
      setFormError(describeWriteError(err, "Could not save beginning balance."));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold tracking-tight text-slate-900">Beginning Balance</h1>
      <p className="text-sm text-slate-500">
        A one-time opening on-hand snapshot per product/warehouse. Historical record only — it does not
        change stock by itself.
      </p>

      <div className="mt-6">
        <label htmlFor="bbWarehouse" className="text-xs font-medium text-slate-700">
          Warehouse
        </label>
        <select
          id="bbWarehouse"
          value={warehouseId}
          onChange={(e) => setWarehouseId(e.target.value)}
          className="mt-1 w-full max-w-xs rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-[var(--color-brand)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand)]"
        >
          {warehouses.map((w) => (
            <option key={w.id} value={w.id}>
              {w.name}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[360px_1fr]">
        <div className="card p-4">
          <h2 className="text-sm font-semibold text-slate-900">Record a balance</h2>
          <form className="mt-4 flex flex-col gap-3" onSubmit={handleSubmit} noValidate>
            <div>
              <label htmlFor="bbProduct" className="text-xs font-medium text-slate-700">
                Product
              </label>
              <select
                id="bbProduct"
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
              <label htmlFor="bbQuantity" className="text-xs font-medium text-slate-700">
                Opening quantity
              </label>
              <input
                id="bbQuantity"
                type="number"
                min="0"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-[var(--color-brand)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand)]"
              />
            </div>
            <div>
              <label htmlFor="bbCost" className="text-xs font-medium text-slate-700">
                Unit cost
              </label>
              <input
                id="bbCost"
                type="number"
                min="0"
                step="0.01"
                value={unitCost}
                onChange={(e) => setUnitCost(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-[var(--color-brand)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand)]"
              />
            </div>
            <div>
              <label htmlFor="bbAsOf" className="text-xs font-medium text-slate-700">
                As-of date
              </label>
              <input
                id="bbAsOf"
                type="date"
                value={asOfDate}
                onChange={(e) => setAsOfDate(e.target.value)}
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
              {submitting ? "Saving…" : "Save balance"}
            </button>
          </form>
        </div>

        <div className="card">
          <div className="border-b border-slate-200 p-4">
            <h2 className="text-sm font-semibold text-slate-900">
              Balances — {warehouses.find((w) => w.id === warehouseId)?.name ?? "…"}
            </h2>
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
              {balances.map((b) => (
                <li key={b.id} className="flex items-center justify-between px-4 py-3 text-sm">
                  <div>
                    <p className="font-medium text-slate-800">{productName(b.productId)}</p>
                    <p className="text-xs text-slate-500">
                      As of {new Date(b.asOfDate).toLocaleDateString("en-PH")}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="tabular-nums font-medium text-slate-800">{b.quantity} units</p>
                    <p className="tabular-nums text-xs text-slate-500">₱{b.unitCost.toFixed(2)} each</p>
                  </div>
                </li>
              ))}
              {balances.length === 0 && (
                <li className="px-4 py-8 text-center text-sm text-slate-400">
                  No beginning balances recorded for this warehouse yet.
                </li>
              )}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
