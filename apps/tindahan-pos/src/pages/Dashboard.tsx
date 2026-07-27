import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useStoreData } from "../lib/storeData";
import { buildDailyReport, salesByCategory } from "../lib/reports";
import { STORE_NAME } from "../lib/mockData";
import { PESO } from "../lib/money";
import { StatCard } from "../components/StatCard";
import { DocumentReportIcon, DownloadIcon, PrintIcon, ShareIcon } from "../components/icons";

type ReportAction = "download" | "print" | "share" | null;

export function Dashboard() {
  const { products, sales, loading, error } = useStoreData();
  const [reportAction, setReportAction] = useState<ReportAction>(null);
  const [reportNotice, setReportNotice] = useState<string | null>(null);

  const report = useMemo(() => buildDailyReport(products, sales), [products, sales]);
  const categoryTotals = useMemo(() => salesByCategory(sales, products), [sales, products]);

  async function runReportAction(action: Exclude<ReportAction, null>) {
    setReportAction(action);
    setReportNotice(null);
    try {
      const { downloadDailyReportPdf, printDailyReportPdf, shareDailyReportPdf } = await import(
        "../lib/reportPdf"
      );
      if (action === "download") {
        downloadDailyReportPdf(report, STORE_NAME);
      } else if (action === "print") {
        printDailyReportPdf(report, STORE_NAME);
      } else {
        const result = await shareDailyReportPdf(report, STORE_NAME);
        if (result === "downloaded") {
          setReportNotice("Sharing isn't supported on this device — the PDF was downloaded instead.");
        }
      }
    } catch (err) {
      setReportNotice(err instanceof Error ? err.message : "Could not generate the report.");
    } finally {
      setReportAction(null);
    }
  }

  return (
    <div className="p-6">
      <h1 className="text-lg font-semibold text-slate-900">Admin dashboard</h1>
      <p className="text-sm text-slate-500">Today's snapshot for the store.</p>

      {error && (
        <div role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="mt-4 flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--color-brand)]/10 text-[var(--color-brand)]">
            <DocumentReportIcon className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900">Daily sales report</p>
            <p className="text-xs text-slate-500">
              Today's sales, low stock, best sellers, and recent transactions as a PDF.
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => runReportAction("download")}
            disabled={reportAction !== null}
            aria-label="Download report as PDF"
            title="Download PDF"
            className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <DownloadIcon className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => runReportAction("print")}
            disabled={reportAction !== null}
            aria-label="Print report"
            title="Print"
            className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <PrintIcon className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => runReportAction("share")}
            disabled={reportAction !== null}
            aria-label="Share report"
            title="Share"
            className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-lg bg-[var(--color-brand)] text-white hover:bg-[var(--color-brand-dark)] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ShareIcon className="h-5 w-5" />
          </button>
        </div>
      </div>
      {reportNotice && (
        <p role="status" className="mt-2 text-xs text-slate-500">
          {reportNotice}
        </p>
      )}

      {loading ? (
        <div className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-[84px] animate-pulse rounded-xl border border-slate-200 bg-slate-100" />
          ))}
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard label="Today's sales" value={PESO.format(report.todaysSalesTotal)} />
          <StatCard label="Transactions today" value={String(report.todaysTransactionCount)} />
          <StatCard
            label="Low stock"
            value={String(report.lowStock.length)}
            hint={report.lowStock.length > 0 ? "Needs restocking" : "All good"}
            tone={report.lowStock.length > 0 ? "warning" : "neutral"}
          />
          <StatCard label="Total products" value={String(report.totalProducts)} />
        </div>
      )}

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 p-4">
            <h2 className="text-sm font-semibold text-slate-900">Recent sales</h2>
          </div>
          <ul className="divide-y divide-slate-100">
            {sales.slice(0, 8).map((sale) => (
              <li key={sale.id} className="flex items-center justify-between px-4 py-3 text-sm">
                <div>
                  <p className="font-medium text-slate-800">
                    {new Date(sale.timestamp).toLocaleString("en-PH", {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </p>
                  <p className="text-xs text-slate-500">
                    {sale.items.length} item{sale.items.length === 1 ? "" : "s"} · {sale.cashierName}
                  </p>
                </div>
                <span className="tabular-nums font-semibold text-slate-900">{PESO.format(sale.total)}</span>
              </li>
            ))}
            {sales.length === 0 && (
              <li className="px-4 py-8 text-center text-sm text-slate-400">No sales recorded yet.</li>
            )}
          </ul>
        </div>

        <div className="flex flex-col gap-6">
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 p-4">
              <h2 className="text-sm font-semibold text-slate-900">Best sellers</h2>
            </div>
            <ul className="divide-y divide-slate-100">
              {report.bestSellers.map((item, i) => (
                <li key={item.name} className="flex items-center justify-between px-4 py-3 text-sm">
                  <span className="text-slate-700">
                    <span className="mr-2 text-slate-400">{i + 1}.</span>
                    {item.name}
                  </span>
                  <span className="text-slate-500">{item.quantity} sold</span>
                </li>
              ))}
              {report.bestSellers.length === 0 && (
                <li className="px-4 py-8 text-center text-sm text-slate-400">No data yet.</li>
              )}
            </ul>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 p-4">
              <h2 className="text-sm font-semibold text-slate-900">Sales by category</h2>
            </div>
            <ul className="divide-y divide-slate-100">
              {categoryTotals.rows.map((row) => {
                const pct =
                  categoryTotals.grandTotal > 0 ? (row.total / categoryTotals.grandTotal) * 100 : 0;
                return (
                  <li key={row.category} className="px-4 py-3 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-700">{row.category}</span>
                      <span className="tabular-nums font-medium text-slate-900">{PESO.format(row.total)}</span>
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-[var(--color-brand)]"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </li>
                );
              })}
              {categoryTotals.rows.length === 0 && (
                <li className="px-4 py-8 text-center text-sm text-slate-400">No data yet.</li>
              )}
            </ul>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900">Quick actions</h2>
            <div className="mt-3 flex flex-col gap-2">
              <Link
                to="/pos"
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Start a sale
              </Link>
              <Link
                to="/inventory"
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Manage inventory
              </Link>
              <Link
                to="/staff"
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Manage staff
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
