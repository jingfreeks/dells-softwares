import { describeWriteError } from "../lib/platformErrors";
import { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { useAccessDenied } from "../lib/permissions";
import {
  useHasModule,
  useHasFeature,
  MODULE_READ_ONLY_HINT,
  FEATURE_NOT_IN_PLAN_HINT,
} from "../lib/modules";
import { listWarehouses, getWarehouseStock } from "../lib/warehouses";
import { listProducts } from "../lib/products";
import {
  closeInventoryCount,
  listCountLines,
  listInventoryCounts,
  recordCountLine,
  startInventoryCount,
} from "../lib/inventoryCounts";
import type { InventoryCount, InventoryCountLine, Product, Warehouse } from "../lib/types";

export function ActualInventory() {
  const { user } = useAuth();
  const accessDenied = useAccessDenied("inventory.stock.count");
  const hasInventory = useHasModule("INVENTORY");
  const hasFeature = useHasFeature("inventory.stock_count");
  // The module hint wins when both are off: core.feature_enabled()
  // requires the owning module, so a missing module is the true cause
  // and saying "not in your plan" would send the owner after the wrong
  // thing.
  const writeHint = !hasInventory
    ? MODULE_READ_ONLY_HINT
    : !hasFeature
      ? FEATURE_NOT_IN_PLAN_HINT
      : undefined;
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [counts, setCounts] = useState<InventoryCount[]>([]);
  const [selectedCountId, setSelectedCountId] = useState<string | null>(null);
  const [lines, setLines] = useState<InventoryCountLine[]>([]);
  const [systemQuantities, setSystemQuantities] = useState<Record<string, number>>({});
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  const [newWarehouseId, setNewWarehouseId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [closing, setClosing] = useState(false);
  const [savingProductId, setSavingProductId] = useState<string | null>(null);

  const selectedCount = useMemo(
    () => counts.find((c) => c.id === selectedCountId) ?? null,
    [counts, selectedCountId]
  );
  const selectedWarehouse = useMemo(
    () => warehouses.find((w) => w.id === selectedCount?.warehouseId) ?? null,
    [warehouses, selectedCount]
  );
  const warehouseName = useMemo(() => {
    const map = new Map(warehouses.map((w) => [w.id, w.name]));
    return (id: string) => map.get(id) ?? "Unknown warehouse";
  }, [warehouses]);
  const lineByProduct = useMemo(() => new Map(lines.map((l) => [l.productId, l])), [lines]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    Promise.all([listWarehouses(user.storeId), listProducts(user.storeId), listInventoryCounts(user.storeId)])
      .then(([w, p, c]) => {
        if (cancelled) return;
        setWarehouses(w);
        setProducts(p);
        setCounts(c);
        setNewWarehouseId((prev) => prev || w.find((wh) => wh.isDefault)?.id || w[0]?.id || "");
      })
      .catch((err) => {
        if (!cancelled) setError(describeWriteError(err, "Could not load inventory counts."));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    if (!selectedCount || !selectedWarehouse) {
      setLines([]);
      setSystemQuantities({});
      setDrafts({});
      return;
    }
    let cancelled = false;
    Promise.all([
      listCountLines(selectedCount.id),
      getWarehouseStock(selectedWarehouse.id, selectedWarehouse.isDefault),
    ]).then(([countLines, stock]) => {
      if (cancelled) return;
      setLines(countLines);
      const sysQty: Record<string, number> = {};
      if (selectedWarehouse.isDefault) {
        for (const p of products) sysQty[p.id] = p.stock;
      } else {
        for (const s of stock) sysQty[s.productId] = s.quantity;
      }
      setSystemQuantities(sysQty);
      const nextDrafts: Record<string, string> = {};
      for (const line of countLines) nextDrafts[line.productId] = String(line.countedQuantity);
      setDrafts(nextDrafts);
    });
    return () => {
      cancelled = true;
    };
  }, [selectedCount, selectedWarehouse, products]);

  if (user && accessDenied) {
    return <Navigate to="/login" replace />;
  }

  async function handleStartCount() {
    if (!user || !newWarehouseId) return;
    setStarting(true);
    setError(null);
    try {
      const count = await startInventoryCount({
        storeId: user.storeId,
        warehouseId: newWarehouseId,
        createdBy: user.id,
      });
      setCounts((prev) => [count, ...prev]);
      setSelectedCountId(count.id);
    } catch (err) {
      setError(describeWriteError(err, "Could not start inventory count."));
    } finally {
      setStarting(false);
    }
  }

  async function handleSaveLine(productId: string) {
    if (!selectedCount) return;
    const countedQuantity = Number(drafts[productId]);
    if (!Number.isInteger(countedQuantity) || countedQuantity < 0) {
      setError("Counted quantity must be a whole number, 0 or more.");
      return;
    }
    setSavingProductId(productId);
    setError(null);
    try {
      const line = await recordCountLine({
        inventoryCountId: selectedCount.id,
        productId,
        systemQuantity: systemQuantities[productId] ?? 0,
        countedQuantity,
      });
      setLines((prev) => [...prev.filter((l) => l.productId !== productId), line]);
    } catch (err) {
      setError(describeWriteError(err, "Could not save counted quantity."));
    } finally {
      setSavingProductId(null);
    }
  }

  async function handleCloseCount() {
    if (!selectedCount) return;
    setClosing(true);
    setError(null);
    try {
      await closeInventoryCount(selectedCount.id);
      setCounts((prev) => prev.map((c) => (c.id === selectedCount.id ? { ...c, status: "closed" } : c)));
    } catch (err) {
      setError(describeWriteError(err, "Could not close inventory count."));
    } finally {
      setClosing(false);
    }
  }

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold tracking-tight text-slate-900">Actual Inventory</h1>
      <p className="text-sm text-slate-500">
        Physical stock counts reconciled against the system quantity. Variance is recorded, not
        auto-applied — adjusting stock afterward is a deliberate follow-up step.
      </p>

      <div className="mt-6 card p-4">
        <h2 className="text-sm font-semibold text-slate-900">Start a new count</h2>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label htmlFor="newCountWarehouse" className="text-xs font-medium text-slate-700">
              Warehouse
            </label>
            <select
              id="newCountWarehouse"
              value={newWarehouseId}
              onChange={(e) => setNewWarehouseId(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-[var(--color-brand)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand)]"
            >
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={handleStartCount}
            disabled={starting || !newWarehouseId || !hasInventory || !hasFeature}
            title={writeHint}
            className="h-10 cursor-pointer rounded-xl bg-[var(--color-brand)] px-4 text-sm font-semibold text-white hover:bg-[var(--color-brand-dark)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {starting ? "Starting…" : "Start count"}
          </button>
        </div>
      </div>

      {error && (
        <p role="alert" className="mt-4 text-sm text-red-600">
          {error}
        </p>
      )}

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[320px_1fr]">
        <div className="card">
          <div className="border-b border-slate-200 p-4">
            <h2 className="text-sm font-semibold text-slate-900">Counts</h2>
          </div>
          {loading ? (
            <p className="px-4 py-8 text-center text-sm text-slate-400">Loading…</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {counts.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedCountId(c.id)}
                    className={`flex w-full cursor-pointer items-center justify-between px-4 py-3 text-left text-sm hover:bg-slate-50 ${
                      selectedCountId === c.id ? "bg-[var(--color-brand)]/5" : ""
                    }`}
                  >
                    <div>
                      <p className="font-medium text-slate-800">{warehouseName(c.warehouseId)}</p>
                      <p className="text-xs text-slate-500">
                        {new Date(c.countedOn).toLocaleDateString("en-PH")}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${
                        c.status === "open" ? "bg-blue-50 text-blue-700" : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {c.status}
                    </span>
                  </button>
                </li>
              ))}
              {counts.length === 0 && (
                <li className="px-4 py-8 text-center text-sm text-slate-400">No counts yet.</li>
              )}
            </ul>
          )}
        </div>

        <div className="card">
          {!selectedCount ? (
            <div className="flex h-full items-center justify-center p-8 text-center text-sm text-slate-400">
              Select a count to enter counted quantities.
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between border-b border-slate-200 p-4">
                <h2 className="text-sm font-semibold text-slate-900">
                  {warehouseName(selectedCount.warehouseId)} —{" "}
                  {new Date(selectedCount.countedOn).toLocaleDateString("en-PH")}
                </h2>
                {selectedCount.status === "open" && (
                  <button
                    type="button"
                    onClick={handleCloseCount}
                    disabled={closing}
                    className="cursor-pointer rounded-xl border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {closing ? "Closing…" : "Close count"}
                  </button>
                )}
              </div>
              {/* Stacked cards below sm — a 5-column table doesn't fit a phone screen. */}
              <div className="divide-y divide-slate-100 sm:hidden">
                {products.map((p) => {
                  const line = lineByProduct.get(p.id);
                  const systemQty = systemQuantities[p.id] ?? 0;
                  const draft = drafts[p.id] ?? "";
                  const varianceColor = line
                    ? line.variance === 0
                      ? "text-slate-500"
                      : line.variance > 0
                        ? "text-emerald-600"
                        : "text-red-600"
                    : "text-slate-300";
                  return (
                    <div key={p.id} className="p-4">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-medium text-slate-800">{p.name}</p>
                        <span className={`tabular-nums text-sm font-medium ${varianceColor}`}>
                          {line ? `Variance: ${line.variance}` : "Variance: —"}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-slate-500">System qty: {systemQty}</p>
                      <div className="mt-2 flex items-center gap-2">
                        <input
                          type="number"
                          min="0"
                          disabled={selectedCount.status === "closed"}
                          value={draft}
                          onChange={(e) => setDrafts((prev) => ({ ...prev, [p.id]: e.target.value }))}
                          placeholder="Counted qty"
                          className="w-28 rounded-xl border border-slate-300 px-2 py-1.5 text-sm disabled:bg-slate-50 disabled:text-slate-400"
                        />
                        {selectedCount.status === "open" && (
                          <button
                            type="button"
                            onClick={() => handleSaveLine(p.id)}
                            disabled={savingProductId === p.id || draft === ""}
                            className="cursor-pointer rounded-xl border border-slate-300 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {savingProductId === p.id ? "Saving…" : "Save"}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="hidden overflow-x-auto sm:block">
                <table className="w-full text-sm">
                  <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-4 py-2">Product</th>
                      <th className="px-4 py-2">System qty</th>
                      <th className="px-4 py-2">Counted qty</th>
                      <th className="px-4 py-2">Variance</th>
                      <th className="px-4 py-2" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {products.map((p) => {
                      const line = lineByProduct.get(p.id);
                      const systemQty = systemQuantities[p.id] ?? 0;
                      const draft = drafts[p.id] ?? "";
                      return (
                        <tr key={p.id}>
                          <td className="px-4 py-2 font-medium text-slate-800">{p.name}</td>
                          <td className="tabular-nums px-4 py-2 text-slate-600">{systemQty}</td>
                          <td className="px-4 py-2">
                            <input
                              type="number"
                              min="0"
                              disabled={selectedCount.status === "closed"}
                              value={draft}
                              onChange={(e) => setDrafts((prev) => ({ ...prev, [p.id]: e.target.value }))}
                              className="w-24 rounded-xl border border-slate-300 px-2 py-1 text-sm disabled:bg-slate-50 disabled:text-slate-400"
                            />
                          </td>
                          <td
                            className={`tabular-nums px-4 py-2 font-medium ${
                              line
                                ? line.variance === 0
                                  ? "text-slate-500"
                                  : line.variance > 0
                                    ? "text-emerald-600"
                                    : "text-red-600"
                                : "text-slate-300"
                            }`}
                          >
                            {line ? line.variance : "—"}
                          </td>
                          <td className="px-4 py-2">
                            {selectedCount.status === "open" && (
                              <button
                                type="button"
                                onClick={() => handleSaveLine(p.id)}
                                disabled={savingProductId === p.id || draft === ""}
                                className="cursor-pointer rounded-xl border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {savingProductId === p.id ? "Saving…" : "Save"}
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
