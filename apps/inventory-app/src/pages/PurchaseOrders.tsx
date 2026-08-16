import { describeWriteError } from "../lib/platformErrors";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { useCan } from "../lib/permissions";
import { useHasModule, MODULE_READ_ONLY_HINT } from "../lib/modules";
import { listWarehouses } from "../lib/warehouses";
import { listSuppliers } from "../lib/suppliers";
import { listProducts } from "../lib/products";
import {
  createPurchaseOrder,
  listPurchaseOrders,
  submitPurchaseOrder,
  type NewPurchaseOrderLine,
} from "../lib/purchaseOrders";
import type { Product, PurchaseOrder, Supplier, Warehouse } from "../lib/types";

interface DraftLine {
  productId: string;
  productName: string;
  quantity: string;
  unitCost: string;
}

const STATUS_LABEL: Record<PurchaseOrder["status"], string> = {
  draft: "Draft",
  submitted: "Submitted",
  partially_received: "Partially received",
  received: "Received",
  cancelled: "Cancelled",
};

const STATUS_COLOR: Record<PurchaseOrder["status"], string> = {
  draft: "bg-slate-100 text-slate-600",
  submitted: "bg-blue-50 text-blue-700",
  partially_received: "bg-amber-50 text-amber-700",
  received: "bg-emerald-50 text-emerald-700",
  cancelled: "bg-red-50 text-red-700",
};

export function PurchaseOrders() {
  const { user } = useAuth();
  const canManage = useCan("inventory.purchase_order.manage");
  const hasInventory = useHasModule("INVENTORY");
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [supplierId, setSupplierId] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [expectedDate, setExpectedDate] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<DraftLine[]>([]);
  const [productQuery, setProductQuery] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const supplierName = useMemo(() => {
    const map = new Map(suppliers.map((s) => [s.id, s.name]));
    return (id: string | null) => (id ? (map.get(id) ?? "Unknown supplier") : "No supplier");
  }, [suppliers]);

  const warehouseName = useMemo(() => {
    const map = new Map(warehouses.map((w) => [w.id, w.name]));
    return (id: string) => map.get(id) ?? "Unknown warehouse";
  }, [warehouses]);

  const searchResults = useMemo(() => {
    const q = productQuery.trim().toLowerCase();
    if (!q) return [];
    return products.filter((p) => p.name.toLowerCase().includes(q)).slice(0, 6);
  }, [products, productQuery]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    Promise.all([
      listPurchaseOrders(user.storeId),
      listSuppliers(user.storeId),
      listWarehouses(user.storeId),
      listProducts(user.storeId),
    ])
      .then(([o, s, w, p]) => {
        if (cancelled) return;
        setOrders(o);
        setSuppliers(s);
        setWarehouses(w);
        setProducts(p);
        setWarehouseId((prev) => prev || w.find((wh) => wh.isDefault)?.id || w[0]?.id || "");
      })
      .catch((err) => {
        if (!cancelled) setError(describeWriteError(err, "Could not load purchase orders."));
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

  function addLine(productId: string, productName: string) {
    setLines((prev) => {
      if (prev.some((l) => l.productId === productId)) return prev;
      return [...prev, { productId, productName, quantity: "1", unitCost: "0" }];
    });
    setProductQuery("");
  }

  function updateLine(productId: string, patch: Partial<DraftLine>) {
    setLines((prev) => prev.map((l) => (l.productId === productId ? { ...l, ...patch } : l)));
  }

  function removeLine(productId: string) {
    setLines((prev) => prev.filter((l) => l.productId !== productId));
  }

  function resetForm() {
    setSupplierId("");
    setExpectedDate("");
    setNotes("");
    setLines([]);
    setFormError(null);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!user) return;
    if (!warehouseId) {
      setFormError("Pick a warehouse.");
      return;
    }
    if (lines.length === 0) {
      setFormError("Add at least one product line.");
      return;
    }

    const parsedLines: NewPurchaseOrderLine[] = lines.map((l) => ({
      productId: l.productId,
      productName: l.productName,
      quantityOrdered: Number(l.quantity) || 0,
      unitCost: Number(l.unitCost) || 0,
    }));
    const invalid = parsedLines.find((l) => !Number.isInteger(l.quantityOrdered) || l.quantityOrdered <= 0);
    if (invalid) {
      setFormError(`"${invalid.productName}" needs a quantity of at least 1.`);
      return;
    }

    setSubmitting(true);
    setFormError(null);
    try {
      const created = await createPurchaseOrder({
        storeId: user.storeId,
        supplierId: supplierId || null,
        warehouseId,
        expectedDate: expectedDate || null,
        notes: notes.trim() || null,
        createdBy: user.id,
        lines: parsedLines,
      });
      setOrders((prev) => [created, ...prev]);
      setShowForm(false);
      resetForm();
    } catch (err) {
      setFormError(describeWriteError(err, "Could not save purchase order."));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSubmitOrder(id: string) {
    setBusyId(id);
    setError(null);
    try {
      await submitPurchaseOrder(id);
      setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status: "submitted" } : o)));
    } catch (err) {
      setError(describeWriteError(err, "Could not submit purchase order."));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">Purchase Orders</h1>
          <p className="text-sm text-slate-500">
            Draft an order, then submit it so it can be received against later.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          disabled={!hasInventory}
          title={hasInventory ? undefined : MODULE_READ_ONLY_HINT}
          className="shrink-0 cursor-pointer rounded-xl bg-[var(--color-brand)] px-3 py-2 text-sm font-medium text-white hover:bg-[var(--color-brand-dark)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {showForm ? "Cancel" : "New purchase order"}
        </button>
      </div>

      {showForm && (
        <div className="mt-4 card p-4">
          <form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label htmlFor="poSupplier" className="text-xs font-medium text-slate-700">
                  Supplier (optional)
                </label>
                <select
                  id="poSupplier"
                  value={supplierId}
                  onChange={(e) => setSupplierId(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-[var(--color-brand)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand)]"
                >
                  <option value="">No supplier</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="poWarehouse" className="text-xs font-medium text-slate-700">
                  Warehouse
                </label>
                <select
                  id="poWarehouse"
                  value={warehouseId}
                  onChange={(e) => setWarehouseId(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-[var(--color-brand)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand)]"
                >
                  {warehouses.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="poExpected" className="text-xs font-medium text-slate-700">
                  Expected date (optional)
                </label>
                <input
                  id="poExpected"
                  type="date"
                  value={expectedDate}
                  onChange={(e) => setExpectedDate(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-[var(--color-brand)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand)]"
                />
              </div>
            </div>

            <div>
              <label htmlFor="poNotes" className="text-xs font-medium text-slate-700">
                Notes (optional)
              </label>
              <input
                id="poNotes"
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-[var(--color-brand)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand)]"
              />
            </div>

            <div>
              <label htmlFor="poProductSearch" className="text-xs font-medium text-slate-700">
                Add a product
              </label>
              <input
                id="poProductSearch"
                type="text"
                placeholder="Search by name…"
                value={productQuery}
                onChange={(e) => setProductQuery(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-[var(--color-brand)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand)]"
              />
              {searchResults.length > 0 && (
                <ul className="mt-2 divide-y divide-slate-100 rounded-xl border border-slate-100">
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

            {lines.length > 0 && (
              <>
                {/* Stacked cards below sm — a 4-column table doesn't fit a phone screen. */}
                <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 sm:hidden">
                  {lines.map((line) => (
                    <div key={line.productId} className="p-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-medium text-slate-800">{line.productName}</p>
                        <button
                          type="button"
                          onClick={() => removeLine(line.productId)}
                          className="shrink-0 cursor-pointer text-xs text-red-600 hover:underline"
                        >
                          Remove
                        </button>
                      </div>
                      <div className="mt-2 grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-xs text-slate-500">Qty ordered</label>
                          <input
                            type="number"
                            min="1"
                            value={line.quantity}
                            onChange={(e) => updateLine(line.productId, { quantity: e.target.value })}
                            className="mt-1 w-full rounded-xl border border-slate-300 px-2 py-1.5 text-sm"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-slate-500">Unit cost</label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={line.unitCost}
                            onChange={(e) => updateLine(line.productId, { unitCost: e.target.value })}
                            className="mt-1 w-full rounded-xl border border-slate-300 px-2 py-1.5 text-sm"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="hidden overflow-x-auto rounded-xl border border-slate-200 sm:block">
                  <table className="w-full text-sm">
                    <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="px-3 py-2">Product</th>
                        <th className="px-3 py-2">Qty ordered</th>
                        <th className="px-3 py-2">Unit cost</th>
                        <th className="px-3 py-2" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {lines.map((line) => (
                        <tr key={line.productId}>
                          <td className="px-3 py-2 font-medium text-slate-800">{line.productName}</td>
                          <td className="px-3 py-2">
                            <input
                              type="number"
                              min="1"
                              value={line.quantity}
                              onChange={(e) => updateLine(line.productId, { quantity: e.target.value })}
                              className="w-20 rounded-xl border border-slate-300 px-2 py-1 text-sm"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={line.unitCost}
                              onChange={(e) => updateLine(line.productId, { unitCost: e.target.value })}
                              className="w-24 rounded-xl border border-slate-300 px-2 py-1 text-sm"
                            />
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
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {formError && (
              <p role="alert" className="text-sm text-red-600">
                {formError}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="h-10 cursor-pointer self-start rounded-xl bg-[var(--color-brand)] px-4 text-sm font-semibold text-white hover:bg-[var(--color-brand-dark)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? "Saving…" : "Save draft"}
            </button>
          </form>
        </div>
      )}

      {error && (
        <p role="alert" className="mt-4 text-sm text-red-600">
          {error}
        </p>
      )}

      <div className="mt-6 card">
        <div className="border-b border-slate-200 p-4">
          <h2 className="text-sm font-semibold text-slate-900">All purchase orders</h2>
        </div>
        {loading ? (
          <p className="px-4 py-8 text-center text-sm text-slate-400">Loading…</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {orders.map((order) => (
              <li key={order.id} className="flex items-center justify-between gap-4 px-4 py-3 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-medium text-slate-800">
                    {supplierName(order.supplierId)} — {warehouseName(order.warehouseId)}
                  </p>
                  <p className="text-xs text-slate-500">
                    Ordered {new Date(order.orderDate).toLocaleDateString("en-PH")}
                    {order.expectedDate &&
                      ` · Expected ${new Date(order.expectedDate).toLocaleDateString("en-PH")}`}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_COLOR[order.status]}`}>
                    {STATUS_LABEL[order.status]}
                  </span>
                  {order.status === "draft" && (
                    <button
                      type="button"
                      onClick={() => handleSubmitOrder(order.id)}
                      disabled={busyId === order.id}
                      className="cursor-pointer rounded-xl border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {busyId === order.id ? "Submitting…" : "Submit"}
                    </button>
                  )}
                </div>
              </li>
            ))}
            {orders.length === 0 && (
              <li className="px-4 py-8 text-center text-sm text-slate-400">No purchase orders yet.</li>
            )}
          </ul>
        )}
      </div>
    </div>
  );
}
