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
} from "@/lib";
import type { DailyReport } from "@/lib/reports";

interface DashboarddetailsProps {
  report: DailyReport;
  averageBasket: number;
  customersOwing: number;
}

const Dashboarddetails = (props: DashboarddetailsProps) => {
    const { report, averageBasket, customersOwing } = props;
    return(
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
    )
};
export default Dashboarddetails;