import { type ReactNode } from "react";
import { ARIA_CLOSE_MODAL, BUTTON_CLOSE, BUTTON_PRINT } from "@/lib";
import { Modal } from "../Modal";

export interface ReportSummaryTile {
  label: string;
  value: string;
  /** Matches the existing tpl-metric.tpl-w / tpl-mval.tpl-warn warning styling — no other tile variants exist in the design system. */
  variant?: "warn";
}

interface ReportDetailModalProps {
  title: string;
  subtitle: string;
  summaryTiles?: ReportSummaryTile[];
  onClose: () => void;
  onPrint: () => void;
  children: ReactNode;
}

/**
 * Shared shell for every dashboard "click a card, see the full report"
 * modal — header (title/date + Print/Close), optional summary metric
 * tiles, a scrollable body the caller supplies, and a matching
 * Print/Close footer. Built on the same tpl-modal-overlay/tpl-modal-panel
 * pattern as ConfirmDialog/AddSupplierModal.
 */
export function ReportDetailModal({ title, subtitle, summaryTiles, onClose, onPrint, children }: ReportDetailModalProps) {
  return (
    <Modal
      open
      onClose={onClose}
      labelledBy="reportDetailHeading"
      style={{ width: "min(960px, 100%)", maxHeight: "88vh", display: "flex", flexDirection: "column", padding: 0, overflow: "hidden" }}
    >
        <div
          className="tpl-sp"
          style={{ padding: "18px 22px", borderBottom: "0.5px solid var(--tpl-bd)", alignItems: "flex-start", flexShrink: 0 }}
        >
          <div>
            <p id="reportDetailHeading" className="tpl-h3" style={{ fontSize: 18 }}>
              {title}
            </p>
            <p className="tpl-ts">{subtitle}</p>
          </div>
          <div className="tpl-row" style={{ width: "auto", marginBottom: 0, gap: 6 }}>
            <button
              type="button"
              onClick={onPrint}
              className="tpl-btn"
              style={{ width: "auto", height: 32, padding: "0 12px", fontSize: 13, marginBottom: 0 }}
            >
              <i className="ti ti-printer" aria-hidden style={{ marginRight: 6 }} />
              {BUTTON_PRINT}
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label={ARIA_CLOSE_MODAL}
              style={{ background: "none", border: "none", cursor: "pointer", color: "var(--tpl-t7)", fontSize: 18, padding: 4 }}
            >
              <i className="ti ti-x" aria-hidden />
            </button>
          </div>
        </div>

        {summaryTiles && summaryTiles.length > 0 && (
          <div
            style={{
              padding: "16px 22px",
              borderBottom: "0.5px solid var(--tpl-bd)",
              background: "rgba(255,255,255,.02)",
              flexShrink: 0,
            }}
          >
            <div className="tpl-g4">
              {summaryTiles.map((tile) => (
                <div key={tile.label} className={`tpl-metric${tile.variant === "warn" ? " tpl-w" : ""}`}>
                  <p className="tpl-mlbl">{tile.label}</p>
                  <p className={`tpl-mval${tile.variant === "warn" ? " tpl-warn" : ""}`}>{tile.value}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ overflowY: "auto", overflowX: "auto", flex: 1, padding: "0 22px" }}>{children}</div>

        <div
          className="tpl-row"
          style={{
            padding: "14px 22px",
            borderTop: "0.5px solid var(--tpl-bd)",
            justifyContent: "flex-end",
            marginBottom: 0,
            flexShrink: 0,
          }}
        >
          <button type="button" onClick={onClose} className="tpl-btn" style={{ width: "auto", marginBottom: 0 }}>
            {BUTTON_CLOSE}
          </button>
          <button type="button" onClick={onPrint} className="tpl-btnp" style={{ width: "auto", marginBottom: 0 }}>
            <i className="ti ti-printer" aria-hidden style={{ marginRight: 6 }} />
            {BUTTON_PRINT}
          </button>
        </div>
    </Modal>
  );
}
