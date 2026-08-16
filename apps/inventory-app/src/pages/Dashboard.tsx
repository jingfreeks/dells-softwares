import { describeWriteError } from "../lib/platformErrors";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { listWarehouses } from "../lib/warehouses";
import { listProducts } from "../lib/products";
import { listPurchaseOrders } from "../lib/purchaseOrders";
import { listInventoryCounts } from "../lib/inventoryCounts";
import { listReceivingHistory } from "../lib/receiving";
import type {
  InventoryCount,
  Product,
  PurchaseOrder,
  ReceivingEntry,
  Warehouse,
} from "../lib/types";

const OPEN_PO_STATUSES = new Set(["draft", "submitted", "partially_received"]);

interface DashboardData {
  warehouses: Warehouse[];
  lowStockProducts: Product[];
  openPurchaseOrders: PurchaseOrder[];
  openCounts: InventoryCount[];
  recentReceiving: ReceivingEntry[];
}

export function Dashboard() {
  const { user, store } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    Promise.all([
      listWarehouses(user.storeId),
      listProducts(user.storeId),
      listPurchaseOrders(user.storeId),
      listInventoryCounts(user.storeId),
      listReceivingHistory(user.storeId),
    ])
      .then(([warehouses, products, purchaseOrders, counts, receiving]) => {
        if (cancelled) return;
        setData({
          warehouses,
          lowStockProducts: products.filter((p) => p.stock <= p.lowStockThreshold),
          openPurchaseOrders: purchaseOrders.filter((po) => OPEN_PO_STATUSES.has(po.status)),
          openCounts: counts.filter((c) => c.status === "open"),
          recentReceiving: receiving.slice(0, 5),
        });
      })
      .catch((err) => {
        if (!cancelled) setError(describeWriteError(err, "Could not load dashboard."));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [user]);

  if (loading) {
    return (
      <div className="flex h-40 items-center justify-center p-6">
        <div
          role="status"
          aria-label="Loading"
          className="h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-[var(--color-brand)]"
        />
      </div>
    );
  }

  if (error || !data) {
    return <p className="p-6 text-sm text-red-600">{error ?? "Something went wrong."}</p>;
  }

  const stats = [
    { label: "Warehouses", value: data.warehouses.length, to: "/warehouses" },
    { label: "Open purchase orders", value: data.openPurchaseOrders.length, to: "/purchase-orders" },
    { label: "Low stock products", value: data.lowStockProducts.length, to: "/warehouses" },
    { label: "Open counts", value: data.openCounts.length, to: "/actual-inventory" },
  ];

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold text-slate-900">Dashboard</h1>
      <p className="mt-1 text-sm text-slate-500">
        Overview for {store?.name ?? "your store"}.
      </p>

      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((stat) => (
          <Link
            key={stat.label}
            to={stat.to}
            className="card flex flex-col gap-1 p-4 transition-colors hover:bg-slate-50"
          >
            <span className="text-2xl font-bold text-slate-900">{stat.value}</span>
            <span className="text-xs font-medium text-slate-500">{stat.label}</span>
          </Link>
        ))}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="card">
          <div className="border-b border-slate-200 p-4">
            <h2 className="text-sm font-semibold text-slate-900">Low stock products</h2>
          </div>
          {data.lowStockProducts.length === 0 ? (
            <p className="p-4 text-sm text-slate-400">Nothing below its threshold.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {data.lowStockProducts.slice(0, 8).map((product) => (
                <li key={product.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
                  <span className="font-medium text-slate-700">{product.name}</span>
                  <span className="text-red-600">
                    {product.stock} / {product.lowStockThreshold}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card">
          <div className="border-b border-slate-200 p-4">
            <h2 className="text-sm font-semibold text-slate-900">Recent receiving</h2>
          </div>
          {data.recentReceiving.length === 0 ? (
            <p className="p-4 text-sm text-slate-400">No receiving entries yet.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {data.recentReceiving.map((entry) => (
                <li key={entry.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
                  <span className="font-medium text-slate-700">{entry.supplier || "No supplier"}</span>
                  <span className="text-slate-400">{entry.receivedOn}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
