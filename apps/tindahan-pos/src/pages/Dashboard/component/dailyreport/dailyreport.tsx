import {
  TEXT_SALES_SO_FAR_SUFFIX,
  LABEL_PERIOD_TODAY,
  BUTTON_EXPORT_REPORT,
  ARIA_EXPORT_REPORT,
} from "@/lib";
import "../../../authTheme.css";

const Dailyreportscreen = (props:any) => {
  const {
    greetingForHour,
    now,
    firstName,
    dateLabel,
    report,
    exportReport,
    exporting,
  } = props;
  return (
    <div className="tpl-hd">
      <div>
        <p className="tpl-h1">
          {greetingForHour(now.getHours())} {firstName}
        </p>
        <p className="tpl-sub">
          {dateLabel} · {report.todaysTransactionCount}{" "}
          {TEXT_SALES_SO_FAR_SUFFIX}
        </p>
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <button
          type="button"
          className="tpl-btn"
          disabled
          title="More periods coming soon"
          style={{
            width: "auto",
            height: 34,
            padding: "0 12px",
            fontSize: 13,
            marginBottom: 0,
          }}
        >
          {LABEL_PERIOD_TODAY}
          <i className="ti ti-chevron-down" aria-hidden />
        </button>
        <button
          type="button"
          className="tpl-btnp"
          onClick={exportReport}
          disabled={exporting}
          aria-label={ARIA_EXPORT_REPORT}
          style={{ width: "auto", height: 34, padding: "0 14px", fontSize: 13 }}
        >
          {exporting ? (
            <span aria-hidden className="tpl-spinner" />
          ) : (
            <i className="ti ti-database-export" aria-hidden />
          )}
          {BUTTON_EXPORT_REPORT}
        </button>
      </div>
    </div>
  );
};
export default Dailyreportscreen;
