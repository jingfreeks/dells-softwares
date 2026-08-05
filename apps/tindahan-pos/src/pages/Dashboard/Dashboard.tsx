import {
  useAuth,
  useStoreData,
  PESO,
  TEXT_GREETING_MORNING,
  TEXT_GREETING_AFTERNOON,
  TEXT_GREETING_EVENING,
  LABEL_TODAYS_SALES,
  TEXT_VS_YESTERDAY_SUFFIX,
  LABEL_TRANSACTIONS_TODAY,
  TEXT_AVERAGE_BASKET_SUFFIX,
  LABEL_LOW_STOCK,
  LABEL_RESTOCK_TODAY,
  LABEL_ALL_GOOD,
  LABEL_UTANG_OUTSTANDING,
} from "@/lib";
import {
  DashboardError,
  ReportNotice,
  DashboardLoadingSkeleton,
  RecentSalesCard,
  NeedsRestockingCard,
  BestSellersCard,
  SalesByCategoryCard,
  Dailyreport,
  DailyTransactionDetailsCard,
} from "./component";
import { useDashboardReport } from "./hooks";
import "../authTheme.css";

function greetingForHour(hour: number): string {
  if (hour < 12) return TEXT_GREETING_MORNING;
  if (hour < 18) return TEXT_GREETING_AFTERNOON;
  return TEXT_GREETING_EVENING;
}

export function Dashboard() {
  const { user } = useAuth();
  const { products, sales, customers, loading, error } = useStoreData();
  const { report, restockRows, exporting, reportNotice, exportReport } =
    useDashboardReport(products, sales, customers);

  const now = new Date();
  const dateLabel = now.toLocaleDateString("en-PH", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const firstName = user?.name?.split(" ")[0] ?? "";
  const customersOwing = customers.filter((c) => c.balance > 0).length;
  const averageBasket =
    report.todaysTransactionCount > 0
      ? report.todaysSalesTotal / report.todaysTransactionCount
      : 0;

  return (
    <div className="tpl-root">
      <Dailyreport
        greetingForHour={greetingForHour}
        now={now}
        firstName={firstName}
        dateLabel={dateLabel}
        report={report}
        exportReport={exportReport}
        exporting={exporting}
      />

      <DashboardError error={error} />
      <ReportNotice notice={reportNotice} />

      {loading ? (
        <DashboardLoadingSkeleton />
      ) : (
        <div className="tpl-g4">
          <div className="tpl-metric">
            <p className="tpl-mlbl">{LABEL_TODAYS_SALES.toUpperCase()}</p>
            <p className="tpl-mval">{PESO.format(report.todaysSalesTotal)}</p>
            {report.salesChangePercent !== null && (
              <p
                className={`tpl-mfoot ${report.salesChangePercent >= 0 ? "tpl-ok" : "tpl-bad"}`}
              >
                {report.salesChangePercent >= 0 ? "▲" : "▼"}{" "}
                {Math.abs(report.salesChangePercent)}%{" "}
                {TEXT_VS_YESTERDAY_SUFFIX}
              </p>
            )}
          </div>
          <div className="tpl-metric">
            <p className="tpl-mlbl">{LABEL_TRANSACTIONS_TODAY.toUpperCase()}</p>
            <p className="tpl-mval">{report.todaysTransactionCount}</p>
            <p className="tpl-mfoot">
              {PESO.format(averageBasket)} {TEXT_AVERAGE_BASKET_SUFFIX}
            </p>
          </div>
          <div className="tpl-metric tpl-w">
            <p className="tpl-mlbl" style={{ color: "var(--tpl-warn)" }}>
              {LABEL_LOW_STOCK.toUpperCase()}
            </p>
            <p className="tpl-mval tpl-warn">{report.lowStock.length}</p>
            <p className="tpl-mfoot" style={{ color: "#b08a2e" }}>
              {report.lowStock.length > 0
                ? LABEL_RESTOCK_TODAY
                : LABEL_ALL_GOOD}
            </p>
          </div>
          <div className="tpl-metric">
            <p className="tpl-mlbl">{LABEL_UTANG_OUTSTANDING.toUpperCase()}</p>
            <p className="tpl-mval">{PESO.format(report.utangOutstanding)}</p>
            <p className="tpl-mfoot">
              {customersOwing} customer{customersOwing === 1 ? "" : "s"}
            </p>
          </div>
        </div>
      )}

      <div className="tpl-dash-grid">
        <div className="tpl-dash-col">
          <RecentSalesCard recentSales={report.recentSales.slice(0, 6)} />
          <NeedsRestockingCard rows={restockRows} />
        </div>
        <div className="tpl-dash-col">
          <BestSellersCard bestSellers={report.bestSellers} />
          <SalesByCategoryCard categoryTotals={report.categoryTotals} />
        </div>
      </div>

      {!loading && <DailyTransactionDetailsCard sales={sales.filter((sale) => new Date(sale.timestamp).toDateString() === now.toDateString())} customers={customers} />}
    </div>
  );
}
