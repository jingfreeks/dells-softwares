import {
  PESO,
  LABEL_X_READING,
  TEXT_X_READING_DESCRIPTION,
  BUTTON_TAKE_X_READING,
  BUTTON_TAKING_READING,
  TEXT_X_READING_EMPTY,
  LABEL_BUSINESS_DATE,
  LABEL_LOADING,
  LABEL_GRAND_TOTAL,
  COLUMN_TAKEN_AT,
  COLUMN_TRANSACTIONS,
  COLUMN_NET_SALES,
  BUTTON_TRY_AGAIN,
} from "@/lib";
import { useXReadings } from "./useXReadings";

interface XReadingCardProps {
  /** Resolves taken_by to a name — an X-reading's point is partly who took it. */
  staff: { id: string; name: string }[];
}

export function XReadingCard({ staff }: XReadingCardProps) {
  const { date, setDate, readings, loading, taking, error, onTakeReading, onRetry } = useXReadings();

  const nameFor = (id: string) => staff.find((s) => s.id === id)?.name ?? "—";

  return (
    <div className="tpl-card" style={{ marginBottom: 14 }}>
      <div className="tpl-sp" style={{ marginBottom: 11, flexWrap: "wrap", gap: 10 }}>
        <div>
          <p className="tpl-h3">{LABEL_X_READING}</p>
          <p className="tpl-ts" style={{ margin: 0 }}>
            {TEXT_X_READING_DESCRIPTION}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="tpl-fld" style={{ padding: "0 10px", width: "auto" }}>
            <label htmlFor="x-reading-date" className="tpl-lbl" style={{ marginRight: 6 }}>
              {LABEL_BUSINESS_DATE}
            </label>
            <input id="x-reading-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <button type="button" className="tpl-btn" disabled={taking} onClick={onTakeReading}>
            {taking ? BUTTON_TAKING_READING : BUTTON_TAKE_X_READING}
          </button>
        </div>
      </div>

      {error && (
        <p role="alert" className="tpl-emsg" style={{ marginBottom: 14 }}>
          <i className="ti ti-alert-circle" aria-hidden />
          {error}
          <button type="button" className="tpl-lnk" onClick={onRetry} style={{ marginLeft: 8 }}>
            {BUTTON_TRY_AGAIN}
          </button>
        </p>
      )}

      {loading ? (
        <p className="tpl-ts">{LABEL_LOADING}</p>
      ) : readings.length === 0 ? (
        <p className="tpl-ts" style={{ padding: "12px 0", textAlign: "center" }}>
          {TEXT_X_READING_EMPTY}
        </p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table className="tpl-tbl">
            <thead>
              <tr>
                <th>{COLUMN_TAKEN_AT}</th>
                <th>{"By"}</th>
                <th style={{ textAlign: "right" }}>{COLUMN_TRANSACTIONS}</th>
                <th style={{ textAlign: "right" }}>{COLUMN_NET_SALES}</th>
                <th style={{ textAlign: "right" }}>{LABEL_GRAND_TOTAL}</th>
              </tr>
            </thead>
            <tbody>
              {readings.map((reading) => (
                <tr key={reading.id}>
                  <td>{new Date(reading.closed_at).toLocaleTimeString()}</td>
                  <td>{nameFor(reading.taken_by)}</td>
                  <td style={{ textAlign: "right" }}>{reading.transaction_count}</td>
                  <td style={{ textAlign: "right" }}>{PESO.format(Number(reading.net_sales))}</td>
                  <td style={{ textAlign: "right" }}>{PESO.format(Number(reading.grand_total))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
