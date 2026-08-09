import { LABEL_WHEN_INTERNET_DROPS, TEXT_OFFLINE_QUEUE_DESC, LABEL_WAITING_TO_UPLOAD, TEXT_ZERO_SALES } from "@/lib";

export function OfflineQueueCard() {
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
        <span className="tpl-ok" style={{ fontSize: 13 }}>
          {TEXT_ZERO_SALES}
        </span>
      </div>
    </div>
  );
}
