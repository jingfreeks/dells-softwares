import {
  TEXT_SALES_SO_FAR_SUFFIX,
  BUTTON_EXPORT_EXCEL,
  ARIA_EXPORT_EXCEL,
  ARIA_DASHBOARD_DATE,
} from "@/lib";
import type { DailyReport } from "@/lib/reports";
import "../../../authTheme.css";

interface DailyreportProps {
  greetingForHour: (hour: number) => string;
  now: Date;
  firstName: string;
  dateLabel: string;
  report: DailyReport;
  selectedDate: string;
  onSelectedDateChange: (date: string) => void;
  maxDate: string;
  onExport: () => void;
  exporting: boolean;
}

const Dailyreportscreen = ({
  greetingForHour,
  now,
  firstName,
  dateLabel,
  report,
  selectedDate,
  onSelectedDateChange,
  maxDate,
  onExport,
  exporting,
}: DailyreportProps) => {
  return (
    <div className="tpl-hd">
      <div>
        <p className="tpl-h1">
          {greetingForHour(now.getHours())} {firstName}
        </p>
        <p className="tpl-sub">
          {dateLabel} · {report.todaysTransactionCount} {TEXT_SALES_SO_FAR_SUFFIX}
        </p>
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <div className="tpl-fld" style={{ width: "auto", marginBottom: 0 }}>
          <input
            type="date"
            aria-label={ARIA_DASHBOARD_DATE}
            value={selectedDate}
            max={maxDate}
            onChange={(e) => onSelectedDateChange(e.target.value)}
            style={{ height: 34, fontSize: 13, padding: "0 10px" }}
          />
        </div>
        <button
          type="button"
          className="tpl-btnp"
          onClick={onExport}
          disabled={exporting}
          aria-label={ARIA_EXPORT_EXCEL}
          style={{ width: "auto", height: 34, padding: "0 14px", fontSize: 13 }}
        >
          {exporting ? <span aria-hidden className="tpl-spinner" /> : <i className="ti ti-file-spreadsheet" aria-hidden />}
          {BUTTON_EXPORT_EXCEL}
        </button>
      </div>
    </div>
  );
};
export default Dailyreportscreen;
