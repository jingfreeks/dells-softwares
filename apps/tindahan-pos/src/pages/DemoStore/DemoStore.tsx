import { PESO } from "@/lib/money";
import { useDemoStoreData } from "@/lib/demoData/demoData";
import { DemoBanner } from "@/components/DemoBanner/DemoBanner";
import "@/pages/authTheme.css";

/**
 * Explore Demo Store (approved design screen 43) -- an isolated, read-only
 * sample sari-sari store. Every figure here comes from public.demo_* rows
 * (see migration 20260815139000), never hardcoded, and nothing on this
 * screen writes anywhere: there is no checkout, no stock edit, no save.
 */
export function DemoStore() {
  const { loading, error, products, sales, customers, totalSales, lowStockCount, totalUtang } =
    useDemoStoreData();

  return (
    <div className="tpl-root min-h-screen" style={{ background: "#0B142A" }}>
      <DemoBanner />

      <div className="mx-auto max-w-5xl px-4 py-8 lg:px-8">
        <p style={{ color: "var(--tpl-t1)", fontSize: 26, fontWeight: 500, marginBottom: 6 }}>
          Aling Nena's Sari-Sari Store
        </p>
        <p className="tpl-ts" style={{ marginBottom: 24 }}>
          A sample store, so you can see what Tindahan POS looks like in daily use.
        </p>

        {loading && <p className="tpl-ts">Loading sample data…</p>}
        {error && (
          <p role="alert" className="tpl-emsg">
            {error}
          </p>
        )}

        {!loading && !error && (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3" style={{ marginBottom: 28 }}>
              <div className="tpl-card" style={{ padding: 18 }}>
                <p className="tpl-ts">Sales this period</p>
                <p style={{ color: "var(--tpl-t1)", fontSize: 24, fontWeight: 600 }}>
                  {PESO.format(totalSales)}
                </p>
              </div>
              <div className="tpl-card" style={{ padding: 18 }}>
                <p className="tpl-ts">Low stock items</p>
                <p style={{ color: "var(--tpl-t1)", fontSize: 24, fontWeight: 600 }}>{lowStockCount}</p>
              </div>
              <div className="tpl-card" style={{ padding: 18 }}>
                <p className="tpl-ts">Outstanding utang</p>
                <p style={{ color: "var(--tpl-t1)", fontSize: 24, fontWeight: 600 }}>
                  {PESO.format(totalUtang)}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div className="tpl-card" style={{ padding: 18 }}>
                <p className="tpl-h3" style={{ marginBottom: 12 }}>
                  Products
                </p>
                {products.map((p) => (
                  <div key={p.id} className="tpl-lr" style={{ padding: "8px 0" }}>
                    <div className="tpl-flex1">
                      <p className="tpl-tp">{p.name}</p>
                      <p className="tpl-ts">
                        {p.category} · {p.stock <= p.lowStockThreshold ? "Low stock" : `${p.stock} in stock`}
                      </p>
                    </div>
                    <span className="tpl-ts">{PESO.format(p.price)}</span>
                  </div>
                ))}
              </div>

              <div>
                <div className="tpl-card" style={{ padding: 18, marginBottom: 16 }}>
                  <p className="tpl-h3" style={{ marginBottom: 12 }}>
                    Recent sales
                  </p>
                  {sales.map((s) => (
                    <div key={s.id} className="tpl-lr" style={{ padding: "8px 0" }}>
                      <div className="tpl-flex1">
                        <p className="tpl-tp">{new Date(s.occurredAt).toLocaleString()}</p>
                        <p className="tpl-ts">
                          {s.itemCount} {s.itemCount === 1 ? "item" : "items"}
                        </p>
                      </div>
                      <span className="tpl-ts">{PESO.format(s.total)}</span>
                    </div>
                  ))}
                </div>

                <div className="tpl-card" style={{ padding: 18 }}>
                  <p className="tpl-h3" style={{ marginBottom: 12 }}>
                    Customers with utang
                  </p>
                  {customers
                    .filter((c) => c.balance > 0)
                    .map((c) => (
                      <div key={c.id} className="tpl-lr" style={{ padding: "8px 0" }}>
                        <p className="tpl-tp">{c.name}</p>
                        <span className="tpl-ts">{PESO.format(c.balance)}</span>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
