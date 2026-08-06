import {
  useAuth,
  useStoreData,
  TEXT_GREETING_MORNING,
  TEXT_GREETING_AFTERNOON,
  TEXT_GREETING_EVENING,
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
  Dashboarddetails
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
        <Dashboarddetails report={report} averageBasket={averageBasket} customersOwing={customersOwing} />
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
