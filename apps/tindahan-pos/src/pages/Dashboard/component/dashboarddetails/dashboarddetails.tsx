import {
  PESO,
  LABEL_TODAYS_SALES,
  TEXT_VS_YESTERDAY_SUFFIX,
  LABEL_TRANSACTIONS_TODAY,
  TEXT_AVERAGE_BASKET_SUFFIX,
  LABEL_LOW_STOCK,
  LABEL_RESTOCK_TODAY,
  LABEL_ALL_GOOD,
  LABEL_UTANG_OUTSTANDING,
  LINK_OPEN,
} from "@/lib";
import type { DailyReport } from "@/lib/reports";
import type { DashboardReportKind } from "../../hooks";

interface DashboarddetailsProps {
  report: DailyReport;
  averageBasket: number;
  customersOwing: number;
  onOpenReport: (kind: DashboardReportKind) => void;
}

function openHandlers(kind: DashboardReportKind, onOpenReport: (kind: DashboardReportKind) => void) {
  return {
    role: "button" as const,
    tabIndex: 0,
    onClick: () => onOpenReport(kind),
    onKeyDown: (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onOpenReport(kind);
      }
    },
    style: { cursor: "pointer" },
  };
}

const Dashboarddetails = ({ report, averageBasket, customersOwing, onOpenReport }: DashboarddetailsProps) => {
  return (
    <div className="tpl-g4">
      <div className="tpl-metric" {...openHandlers("todaysSales", onOpenReport)}>
        <div className="tpl-sp" style={{ marginBottom: 4 }}>
          <p className="tpl-mlbl" style={{ margin: 0 }}>
            {LABEL_TODAYS_SALES.toUpperCase()}
          </p>
          <span className="tpl-chip" style={{ fontSize: 10.5, padding: "3px 9px", gap: 4 }}>
            {LINK_OPEN} <i className="ti ti-arrow-right" aria-hidden style={{ fontSize: 11 }} />
          </span>
        </div>
        <p className="tpl-mval">{PESO.format(report.todaysSalesTotal)}</p>
        {report.salesChangePercent !== null && (
          <p className={`tpl-mfoot ${report.salesChangePercent >= 0 ? "tpl-ok" : "tpl-bad"}`}>
            {report.salesChangePercent >= 0 ? "▲" : "▼"} {Math.abs(report.salesChangePercent)}% {TEXT_VS_YESTERDAY_SUFFIX}
          </p>
        )}
      </div>
      <div className="tpl-metric" {...openHandlers("transactionsToday", onOpenReport)}>
        <div className="tpl-sp" style={{ marginBottom: 4 }}>
          <p className="tpl-mlbl" style={{ margin: 0 }}>
            {LABEL_TRANSACTIONS_TODAY.toUpperCase()}
          </p>
          <span className="tpl-chip" style={{ fontSize: 10.5, padding: "3px 9px", gap: 4 }}>
            {LINK_OPEN} <i className="ti ti-arrow-right" aria-hidden style={{ fontSize: 11 }} />
          </span>
        </div>
        <p className="tpl-mval">{report.todaysTransactionCount}</p>
        <p className="tpl-mfoot">
          {PESO.format(averageBasket)} {TEXT_AVERAGE_BASKET_SUFFIX}
        </p>
      </div>
      <div className="tpl-metric tpl-w" {...openHandlers("lowStock", onOpenReport)}>
        <div className="tpl-sp" style={{ marginBottom: 4 }}>
          <p className="tpl-mlbl" style={{ margin: 0, color: "var(--tpl-warn)" }}>
            {LABEL_LOW_STOCK.toUpperCase()}
          </p>
          <span className="tpl-chip" style={{ fontSize: 10.5, padding: "3px 9px", gap: 4 }}>
            {LINK_OPEN} <i className="ti ti-arrow-right" aria-hidden style={{ fontSize: 11 }} />
          </span>
        </div>
        <p className="tpl-mval tpl-warn">{report.lowStock.length}</p>
        <p className="tpl-mfoot" style={{ color: "#b08a2e" }}>
          {report.lowStock.length > 0 ? LABEL_RESTOCK_TODAY : LABEL_ALL_GOOD}
        </p>
      </div>
      <div className="tpl-metric" {...openHandlers("utang", onOpenReport)}>
        <div className="tpl-sp" style={{ marginBottom: 4 }}>
          <p className="tpl-mlbl" style={{ margin: 0 }}>
            {LABEL_UTANG_OUTSTANDING.toUpperCase()}
          </p>
          <span className="tpl-chip" style={{ fontSize: 10.5, padding: "3px 9px", gap: 4 }}>
            {LINK_OPEN} <i className="ti ti-arrow-right" aria-hidden style={{ fontSize: 11 }} />
          </span>
        </div>
        <p className="tpl-mval">{PESO.format(report.utangOutstanding)}</p>
        <p className="tpl-mfoot">
          {customersOwing} customer{customersOwing === 1 ? "" : "s"}
        </p>
      </div>
    </div>
  );
};
export default Dashboarddetails;
