import {
  useStoreData,
  PESO,
  PAGE_HEADING_ADMIN_DASHBOARD,
  TEXT_DASHBOARD_DESCRIPTION,
  LABEL_TODAYS_SALES,
  LABEL_TRANSACTIONS_TODAY,
  LABEL_LOW_STOCK,
  LABEL_NEEDS_RESTOCKING,
  LABEL_ALL_GOOD,
  LABEL_TOTAL_PRODUCTS,
} from "@/lib";
import { StatCard, Topbar } from "@/components";
import {
  DashboardError,
  ReportNotice,
  DashboardLoadingSkeleton,
  DailyReportCard,
  RecentSalesCard,
  LowStockAlertsCard,
  SuggestedRestockCard,
  BestSellersCard,
  SalesByCategoryCard,
  QuickActionsCard,
} from "./component";
import { useDashboardReport } from "./hooks";

export function Dashboard() {
  const { products, sales, loading, error } = useStoreData();
  const {
    report,
    categoryTotals,
    restockSuggestions,
    recentSales,
    reportAction,
    reportNotice,
    runReportAction,
    buildCardActions,
  } = useDashboardReport(products, sales);

  return (
    <div className="p-6">
      <Topbar />

      <h1 className="mt-6 text-xl font-bold tracking-tight text-slate-900">{PAGE_HEADING_ADMIN_DASHBOARD}</h1>
      <p className="text-sm text-slate-500">{TEXT_DASHBOARD_DESCRIPTION}</p>

      <DashboardError error={error} />

      <DailyReportCard
        reportAction={reportAction}
        onDownload={() => runReportAction("download")}
        onPrint={() => runReportAction("print")}
        onShare={() => runReportAction("share")}
      />

      <ReportNotice notice={reportNotice} />

      {loading ? (
        <DashboardLoadingSkeleton />
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard
            label={LABEL_TODAYS_SALES}
            value={PESO.format(report.todaysSalesTotal)}
            {...buildCardActions({
              kind: "stat",
              title: LABEL_TODAYS_SALES,
              value: PESO.format(report.todaysSalesTotal),
              hint: `${report.todaysTransactionCount} transaction${report.todaysTransactionCount === 1 ? "" : "s"}`,
            })}
          />
          <StatCard
            label={LABEL_TRANSACTIONS_TODAY}
            value={String(report.todaysTransactionCount)}
            {...buildCardActions({
              kind: "stat",
              title: LABEL_TRANSACTIONS_TODAY,
              value: String(report.todaysTransactionCount),
            })}
          />
          <StatCard
            label={LABEL_LOW_STOCK}
            value={String(report.lowStock.length)}
            hint={report.lowStock.length > 0 ? LABEL_NEEDS_RESTOCKING : LABEL_ALL_GOOD}
            tone={report.lowStock.length > 0 ? "warning" : "neutral"}
            {...buildCardActions({
              kind: "stat",
              title: LABEL_LOW_STOCK,
              value: String(report.lowStock.length),
              hint: report.lowStock.length > 0 ? LABEL_NEEDS_RESTOCKING : LABEL_ALL_GOOD,
            })}
          />
          <StatCard
            label={LABEL_TOTAL_PRODUCTS}
            value={String(report.totalProducts)}
            {...buildCardActions({ kind: "stat", title: LABEL_TOTAL_PRODUCTS, value: String(report.totalProducts) })}
          />
        </div>
      )}

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-6">
          <RecentSalesCard recentSales={recentSales} buildCardActions={buildCardActions} />
          <LowStockAlertsCard lowStock={report.lowStock} buildCardActions={buildCardActions} />
          <SuggestedRestockCard suggestions={restockSuggestions} buildCardActions={buildCardActions} />
        </div>

        <div className="flex flex-col gap-6">
          <BestSellersCard bestSellers={report.bestSellers} buildCardActions={buildCardActions} />
          <SalesByCategoryCard categoryTotals={categoryTotals} buildCardActions={buildCardActions} />
          <QuickActionsCard />
        </div>
      </div>
    </div>
  );
}
