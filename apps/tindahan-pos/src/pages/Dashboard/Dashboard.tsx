import {
  useAuth,
  useStoreData,
  TEXT_GREETING_MORNING,
  TEXT_GREETING_AFTERNOON,
  TEXT_GREETING_EVENING,
} from "@/lib";
import { toDateInputValue } from "@/pages/Reports/lib";
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
  Dashboarddetails,
  SubscriptionCard,
  OnboardingChecklistCard,
  SalesReportModal,
  LowStockReportModal,
  UtangReportModal,
  BestSellersReportModal,
  RestockingReportModal,
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
  const { customers, loading, error } = useStoreData();
  const {
    selectedDate,
    setSelectedDate,
    report,
    daySales,
    allSales,
    restockRows,
    rankedBestSellers,
    rangeLoading,
    rangeError,
    exporting,
    exportError,
    exportToExcel,
    openReport,
    setOpenReport,
    storeName,
    storeAddress,
  } = useDashboardReport();

  const now = new Date();
  const selectedDateObj = new Date(`${selectedDate}T12:00:00`);
  const dateLabel = selectedDateObj.toLocaleDateString("en-PH", {
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
        selectedDate={selectedDate}
        onSelectedDateChange={setSelectedDate}
        maxDate={toDateInputValue(now)}
        onExport={exportToExcel}
        exporting={exporting}
      />

      <DashboardError error={error ?? rangeError} />
      <ReportNotice notice={exportError} />
      <SubscriptionCard />
      <OnboardingChecklistCard />

      {loading || rangeLoading ? (
        <DashboardLoadingSkeleton />
      ) : (
        <Dashboarddetails
          report={report}
          averageBasket={averageBasket}
          customersOwing={customersOwing}
          onOpenReport={setOpenReport}
        />
      )}

      <div className="tpl-dash-grid">
        <div className="tpl-dash-col">
          <RecentSalesCard recentSales={report.recentSales.slice(0, 6)} onOpenReport={() => setOpenReport("recentSales")} />
          <NeedsRestockingCard rows={restockRows} onOpenReport={() => setOpenReport("restocking")} />
        </div>
        <div className="tpl-dash-col">
          <BestSellersCard bestSellers={report.bestSellers} onOpenReport={() => setOpenReport("bestSellers")} />
          <SalesByCategoryCard categoryTotals={report.categoryTotals} />
        </div>
      </div>

      {!loading && !rangeLoading && <DailyTransactionDetailsCard sales={daySales} />}

      {(openReport === "todaysSales" || openReport === "transactionsToday" || openReport === "recentSales") && (
        <SalesReportModal
          titleKind={openReport}
          dateLabel={dateLabel}
          storeName={storeName}
          storeAddress={storeAddress}
          printedByName={user?.name ?? ""}
          sales={daySales}
          customers={customers}
          onClose={() => setOpenReport(null)}
        />
      )}
      {openReport === "lowStock" && (
        <LowStockReportModal
          dateLabel={dateLabel}
          storeName={storeName}
          storeAddress={storeAddress}
          printedByName={user?.name ?? ""}
          restockRows={restockRows}
          onClose={() => setOpenReport(null)}
        />
      )}
      {openReport === "utang" && (
        <UtangReportModal
          dateLabel={dateLabel}
          storeName={storeName}
          storeAddress={storeAddress}
          printedByName={user?.name ?? ""}
          customers={customers}
          allSales={allSales}
          onClose={() => setOpenReport(null)}
        />
      )}
      {openReport === "bestSellers" && (
        <BestSellersReportModal
          dateLabel={dateLabel}
          storeName={storeName}
          storeAddress={storeAddress}
          printedByName={user?.name ?? ""}
          bestSellers={rankedBestSellers}
          onClose={() => setOpenReport(null)}
        />
      )}
      {openReport === "restocking" && (
        <RestockingReportModal
          dateLabel={dateLabel}
          storeName={storeName}
          storeAddress={storeAddress}
          printedByName={user?.name ?? ""}
          restockRows={restockRows}
          onClose={() => setOpenReport(null)}
        />
      )}
    </div>
  );
}
