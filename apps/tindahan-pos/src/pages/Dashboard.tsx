import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useStoreData } from "../lib/storeData";
import { lowStockProducts } from "../lib/inventory";
import { StatCard } from "../components/StatCard";

const PESO = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" });

function isToday(isoString: string) {
  const d = new Date(isoString);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

export function Dashboard() {
  const { products, sales } = useStoreData();

  const todaysSales = useMemo(() => sales.filter((s) => isToday(s.timestamp)), [sales]);
  const todaysTotal = useMemo(
    () => todaysSales.reduce((sum, s) => sum + s.total, 0),
    [todaysSales]
  );
  const lowStock = useMemo(() => lowStockProducts(products), [products]);

  const bestSellers = useMemo(() => {
    const counts = new Map<string, { name: string; quantity: number }>();
    for (const sale of sales) {
      for (const item of sale.items) {
        const entry = counts.get(item.productId) ?? { name: item.name, quantity: 0 };
        entry.quantity += item.quantity;
        counts.set(item.productId, entry);
      }
    }
    return Array.from(counts.values())
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);
  }, [sales]);

  return (
    <div className="p-6">
      <h1 className="text-lg font-semibold text-stone-900">Admin dashboard</h1>
      <p className="text-sm text-stone-500">Today's snapshot for the store.</p>

      <div className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Today's sales" value={PESO.format(todaysTotal)} />
        <StatCard label="Transactions today" value={String(todaysSales.length)} />
        <StatCard
          label="Low stock"
          value={String(lowStock.length)}
          hint={lowStock.length > 0 ? "Needs restocking" : "All good"}
        />
        <StatCard label="Total products" value={String(products.length)} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        <div className="rounded-xl border border-stone-200 bg-white">
          <div className="border-b border-stone-200 p-4">
            <h2 className="text-sm font-semibold text-stone-900">Recent sales</h2>
          </div>
          <ul className="divide-y divide-stone-100">
            {sales.slice(0, 8).map((sale) => (
              <li key={sale.id} className="flex items-center justify-between px-4 py-3 text-sm">
                <div>
                  <p className="font-medium text-stone-800">
                    {new Date(sale.timestamp).toLocaleString("en-PH", {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </p>
                  <p className="text-xs text-stone-500">
                    {sale.items.length} item{sale.items.length === 1 ? "" : "s"} · {sale.cashierName}
                  </p>
                </div>
                <span className="font-semibold text-stone-900">{PESO.format(sale.total)}</span>
              </li>
            ))}
            {sales.length === 0 && (
              <li className="px-4 py-8 text-center text-sm text-stone-400">No sales recorded yet.</li>
            )}
          </ul>
        </div>

        <div className="flex flex-col gap-6">
          <div className="rounded-xl border border-stone-200 bg-white">
            <div className="border-b border-stone-200 p-4">
              <h2 className="text-sm font-semibold text-stone-900">Best sellers</h2>
            </div>
            <ul className="divide-y divide-stone-100">
              {bestSellers.map((item, i) => (
                <li key={item.name} className="flex items-center justify-between px-4 py-3 text-sm">
                  <span className="text-stone-700">
                    <span className="mr-2 text-stone-400">{i + 1}.</span>
                    {item.name}
                  </span>
                  <span className="text-stone-500">{item.quantity} sold</span>
                </li>
              ))}
              {bestSellers.length === 0 && (
                <li className="px-4 py-8 text-center text-sm text-stone-400">No data yet.</li>
              )}
            </ul>
          </div>

          <div className="rounded-xl border border-stone-200 bg-white p-4">
            <h2 className="text-sm font-semibold text-stone-900">Quick actions</h2>
            <div className="mt-3 flex flex-col gap-2">
              <Link
                to="/pos"
                className="rounded-lg border border-stone-200 px-3 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50"
              >
                Start a sale
              </Link>
              <Link
                to="/inventory"
                className="rounded-lg border border-stone-200 px-3 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50"
              >
                Manage inventory
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
