import {
  LABEL_WHEN_INTERNET_DROPS,
  TEXT_OFFLINE_QUEUE_DESC,
  LABEL_WAITING_TO_UPLOAD,
  TEXT_ZERO_SALES,
  TEXT_SALES_COUNT_SUFFIX,
  LABEL_QUEUED_SALE_STATUS_PENDING,
  LABEL_QUEUED_SALE_STATUS_SYNCING,
  LABEL_QUEUED_SALE_STATUS_SYNCED,
  LABEL_QUEUED_SALE_STATUS_NEEDS_REAUTH,
  LABEL_QUEUED_SALE_STATUS_FAILED,
  TEXT_QUEUE_NEEDS_REAUTH,
  BUTTON_RETRY_NOW,
  useOfflineQueue,
  type QueuedSaleStatus,
} from "@/lib";

const STATUS_LABEL: Record<QueuedSaleStatus, string> = {
  pending: LABEL_QUEUED_SALE_STATUS_PENDING,
  syncing: LABEL_QUEUED_SALE_STATUS_SYNCING,
  synced: LABEL_QUEUED_SALE_STATUS_SYNCED,
  needs_cashier_reauth: LABEL_QUEUED_SALE_STATUS_NEEDS_REAUTH,
  failed: LABEL_QUEUED_SALE_STATUS_FAILED,
};

export function OfflineQueueCard() {
  const { pendingCount, items, needsReauth, retryNow } = useOfflineQueue();
  const visible = items.filter((sale) => sale.status !== "synced");

  return (
    <div className="tpl-card">
      <p className="tpl-h3" style={{ marginBottom: 11 }}>
        {LABEL_WHEN_INTERNET_DROPS}
      </p>
      <div className="tpl-row" style={{ gap: 8, alignItems: "flex-start", marginBottom: 11 }}>
        <i className="ti ti-wifi-off" style={{ color: "var(--tpl-a4)", fontSize: 18, flexShrink: 0, marginTop: 2 }} aria-hidden />
        <p style={{ color: "var(--tpl-t6)", fontSize: 12.5, lineHeight: 1.5 }}>{TEXT_OFFLINE_QUEUE_DESC}</p>
      </div>
      <div className="tpl-sp" style={{ background: "var(--tpl-gl3)", borderRadius: 9, padding: "9px 11px" }}>
        <span style={{ color: "var(--tpl-t4)", fontSize: 13 }}>{LABEL_WAITING_TO_UPLOAD}</span>
        <span className={pendingCount > 0 ? "tpl-warn" : "tpl-ok"} style={{ fontSize: 13 }}>
          {pendingCount > 0 ? `${pendingCount} ${TEXT_SALES_COUNT_SUFFIX}` : TEXT_ZERO_SALES}
        </span>
      </div>

      {visible.length > 0 && (
        <ul style={{ marginTop: 9, display: "flex", flexDirection: "column", gap: 6 }}>
          {visible.map((sale) => (
            <li
              key={sale.id}
              className="tpl-row"
              style={{ fontSize: 12.5, color: "var(--tpl-t6)", justifyContent: "space-between" }}
            >
              <span>
                {sale.cashierName} · ₱{sale.total.toFixed(2)}
              </span>
              <span>{STATUS_LABEL[sale.status]}</span>
            </li>
          ))}
        </ul>
      )}

      {needsReauth && (
        <p role="alert" className="tpl-emsg" style={{ marginTop: 9, fontSize: 12.5 }}>
          <i className="ti ti-alert-circle" aria-hidden />
          {TEXT_QUEUE_NEEDS_REAUTH}
        </p>
      )}

      {(pendingCount > 0 || visible.length > 0) && (
        <button
          type="button"
          className="tpl-btn"
          style={{ marginTop: 9, height: 30, padding: "0 12px" }}
          onClick={retryNow}
        >
          {BUTTON_RETRY_NOW}
        </button>
      )}
    </div>
  );
}
