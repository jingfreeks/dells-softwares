import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { listWarehouses } from "../lib/warehouses";
import { listSuppliers } from "../lib/suppliers";
import { listProducts } from "../lib/products";
import { listPurchaseOrderLines, listPurchaseOrders } from "../lib/purchaseOrders";
import { listReceivingHistory, receiveStock, type ReceiveStockLine } from "../lib/receiving";
import type { Product, PurchaseOrder, ReceivingEntry, Supplier, Warehouse } from "../lib/types";

interface DraftLine {
  productId: string;
  productName: string;
  quantity: string;
  costEach: string;
}

const today = () => new Date().toISOString().slice(0, 10);

export function Receiving() {
  const { user } = useAuth();
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [openOrders, setOpenOrders] = useState<PurchaseOrder[]>([]);
  const [history, setHistory] = useState<ReceivingEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [warehouseId, setWarehouseId] = useState("");
  const [purchaseOrderId, setPurchaseOrderId] = useState("");
  const [supplierName, setSupplierName] = useState("");
  const [supplierId, setSupplierId] = useState<string | null>(null);
  const [date, setDate] = useState(today());
  const [lines, setLines] = useState<DraftLine[]>([]);
  const [productQuery, setProductQuery] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  const selectedWarehouse = useMemo(
    () => warehouses.find((w) => w.id === warehouseId) ?? null,
    [warehouses, warehouseId]
  );

  const searchResults = useMemo(() => {
    const q = productQuery.trim().toLowerCase();
    if (!q) return [];
    return products.filter((p) => p.name.toLowerCase().includes(q)).slice(0, 6);
  }, [products, productQuery]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    Promise.all([
      listWarehouses(user.storeId),
      listSuppliers(user.storeId),
      listProducts(user.storeId),
      listPurchaseOrders(user.storeId),
      listReceivingHistory(user.storeId),
    ])
      .then(([w, s, p, orders, h]) => {
        if (cancelled) return;
        setWarehouses(w);
        setSuppliers(s);
        setProducts(p);
        setOpenOrders(orders.filter((o) => o.status === "submitted" || o.status === "partially_received"));
        setHistory(h);
        setWarehouseId((prev) => prev || w.find((wh) => wh.isDefault)?.id || w[0]?.id || "");
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Could not load receiving data.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  async function handlePickPurchaseOrder(id: string) {
    setPurchaseOrderId(id);
    if (!id) {
      setLines([]);
      return;
    }
    const order = openOrders.find((o) => o.id === id);
    if (order) {
      setWarehouseId(order.warehouseId);
      if (order.supplierId) {
        const supplier = suppliers.find((s) => s.id === order.supplierId);
        setSupplierId(order.supplierId);
        setSupplierName(supplier?.name ?? "");
      }
    }
    try {
      const poLines = await listPurchaseOrderLines(id);
      setLines(
        poLines
          .filter((l) => l.quantityReceived < l.quantityOrdered)
          .map((l) => ({
            productId: l.productId ?? "",
            productName: l.productName,
            quantity: String(l.quantityOrdered - l.quantityReceived),
            costEach: String(l.unitCost),
          }))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load purchase order lines.");
    }
  }

  function addLine(productId: string, productName: string) {
    setLines((prev) => {
      const existing = prev.find((l) => l.productId === productId);
      if (existing) {
        return prev.map((l) =>
          l.productId === productId ? { ...l, quantity: String((Number(l.quantity) || 0) + 1) } : l
        );
      }
      return [...prev, { productId, productName, quantity: "1", costEach: "0" }];
    });
    setProductQuery("");
  }

  function updateLine(productId: string, patch: Partial<DraftLine>) {
    setLines((prev) => prev.map((l) => (l.productId === productId ? { ...l, ...patch } : l)));
  }

  function removeLine(productId: string) {
    setLines((prev) => prev.filter((l) => l.productId !== productId));
  }

  async function handleSave() {
    if (!user || !selectedWarehouse) return;
    if (lines.length === 0) return;

    const receivingLines: ReceiveStockLine[] = lines.map((l) => ({
      productId: l.productId || null,
      productName: l.productName,
      quantity: Number(l.quantity) || 0,
      costEach: Number(l.costEach) || 0,
    }));
    const invalid = receivingLines.find((l) => !Number.isInteger(l.quantity) || l.quantity <= 0);
    if (invalid) {
      setError(`"${invalid.productName}" needs a quantity of at least 1.`);
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await receiveStock({
        storeId: user.storeId,
        supplier: supplierName.trim() || "Unspecified supplier",
        supplierId,
        receivedOn: date,
        warehouseId: selectedWarehouse.id,
        isDefaultWarehouse: selectedWarehouse.isDefault,
        purchaseOrderId: purchaseOrderId || null,
        createdBy: user.id,
        lines: receivingLines,
      });
      setSavedMessage(
        `Saved — ${lines.length} product${lines.length === 1 ? "" : "s"}, ${receivingLines.reduce((s, l) => s + l.quantity, 0)} units.`
      );
      setLines([]);
      setSupplierName("");
      setSupplierId(null);
      setPurchaseOrderId("");
      const h = await listReceivingHistory(user.storeId);
      setHistory(h);
      setTimeout(() => setSavedMessage(null), 4000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save receiving entry.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p className="p-6 text-sm text-slate-400">Loading…</p>;
  }

  return (
    <div className="p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">Receive stock</h1>
          <p className="text-sm text-slate-500">
            Record a delivery, optionally fulfilling an open purchase order.
          </p>
        </div>
        <Link
          to="/purchase-orders"
          className="shrink-0 rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Purchase orders
        </Link>
      </div>

      <div className="mt-6 card p-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="recvPo" className="text-xs font-medium text-slate-700">
              Fulfill a purchase order (optional)
            </label>
            <select
              id="recvPo"
              value={purchaseOrderId}
              onChange={(e) => handlePickPurchaseOrder(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-[var(--color-brand)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand)]"
            >
              <option value="">None — free-form receiving</option>
              {openOrders.map((o) => (
                <option key={o.id} value={o.id}>
                  PO {o.id.slice(0, 8)} · {new Date(o.orderDate).toLocaleDateString("en-PH")}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="recvWarehouse" className="text-xs font-medium text-slate-700">
              Warehouse
            </label>
            <select
              id="recvWarehouse"
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
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="supplier" className="text-xs font-medium text-slate-700">
              Supplier (optional)
            </label>
            <input
              id="supplier"
              type="text"
              value={supplierName}
              onChange={(e) => {
                setSupplierName(e.target.value);
                setSupplierId(null);
              }}
              placeholder="e.g. Mega Distribution"
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-[var(--color-brand)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand)]"
            />
            {suppliers.length > 0 && (
              <select
                aria-label="Pick a saved supplier"
                value={supplierId ?? ""}
                onChange={(e) => {
                  const found = suppliers.find((s) => s.id === e.target.value);
                  if (found) {
                    setSupplierName(found.name);
                    setSupplierId(found.id);
                  } else {
                    setSupplierId(null);
                  }
                }}
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-600 focus:border-[var(--color-brand)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand)]"
              >
                <option value="">…or pick a saved supplier</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            )}
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
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-[var(--color-brand)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand)]"
            />
          </div>
        </div>

        <div className="mt-4">
          <label htmlFor="recvSearch" className="text-xs font-medium text-slate-700">
            Add a product
          </label>
          <input
            id="recvSearch"
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

        {error && (
          <p role="alert" className="mt-3 text-sm text-red-600">
            {error}
          </p>
        )}

        {lines.length > 0 && (
          <>
            {/* Stacked cards below sm — a 4-column table doesn't fit a phone screen. */}
            <div className="mt-4 divide-y divide-slate-100 rounded-xl border border-slate-200 sm:hidden">
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
                      <label className="text-xs text-slate-500">Qty received</label>
                      <input
                        type="number"
                        min="1"
                        value={line.quantity}
                        onChange={(e) => updateLine(line.productId, { quantity: e.target.value })}
                        className="mt-1 w-full rounded-xl border border-slate-300 px-2 py-1.5 text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-500">Cost each</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={line.costEach}
                        onChange={(e) => updateLine(line.productId, { costEach: e.target.value })}
                        className="mt-1 w-full rounded-xl border border-slate-300 px-2 py-1.5 text-sm"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 hidden overflow-x-auto rounded-xl border border-slate-200 sm:block">
              <table className="w-full text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-3 py-2">Product</th>
                    <th className="px-3 py-2">Qty received</th>
                    <th className="px-3 py-2">Cost each</th>
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
                          value={line.costEach}
                          onChange={(e) => updateLine(line.productId, { costEach: e.target.value })}
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

        {savedMessage && (
          <p role="status" className="mt-4 rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            {savedMessage}
          </p>
        )}

        <button
          type="button"
          onClick={handleSave}
          disabled={lines.length === 0 || saving || !warehouseId}
          className="mt-4 cursor-pointer rounded-xl bg-[var(--color-brand)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--color-brand-dark)] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {saving ? "Saving…" : "Save receiving entry"}
        </button>
      </div>

      <div className="mt-6 card">
        <div className="border-b border-slate-200 p-4">
          <h2 className="text-sm font-semibold text-slate-900">Recent receiving history</h2>
        </div>
        <ul className="divide-y divide-slate-100">
          {history.map((entry) => (
            <li key={entry.id} className="px-4 py-3 text-sm text-slate-700">
              {new Date(entry.receivedOn).toLocaleDateString("en-PH", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}{" "}
              — {entry.supplier} — {entry.lines.length} product
              {entry.lines.length === 1 ? "" : "s"}, {entry.lines.reduce((s, l) => s + l.quantity, 0)} units
            </li>
          ))}
          {history.length === 0 && (
            <li className="px-4 py-8 text-center text-sm text-slate-400">No receiving entries yet.</li>
          )}
        </ul>
      </div>
    </div>
  );
}
