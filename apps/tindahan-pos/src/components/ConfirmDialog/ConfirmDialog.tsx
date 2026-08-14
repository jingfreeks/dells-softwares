import type { ReactNode } from "react";
import { ARIA_CLOSE_MODAL, BUTTON_CANCEL } from "@/lib";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  /** The consequence of confirming — always spell it out, never a bare "Are you sure?". */
  body: ReactNode;
  confirmLabel: string;
  /** Styles the confirm button as destructive (delete) rather than neutral (merge, etc). */
  destructive?: boolean;
  confirmDisabled?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel,
  destructive = false,
  confirmDisabled = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) return null;

  return (
    <div className="tpl-modal-overlay" onClick={onCancel}>
      <div
        className="tpl-modal-panel tpl-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirmDialogHeading"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="tpl-sp" style={{ marginBottom: 12, alignItems: "flex-start" }}>
          <p id="confirmDialogHeading" className="tpl-h3">
            {title}
          </p>
          <button
            type="button"
            onClick={onCancel}
            aria-label={ARIA_CLOSE_MODAL}
            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--tpl-t7)", fontSize: 18, padding: 4 }}
          >
            <i className="ti ti-x" aria-hidden />
          </button>
        </div>

        <div className="tpl-sub" style={{ marginBottom: 18 }}>
          {body}
        </div>

        <div className="tpl-row">
          <button type="button" onClick={onCancel} className="tpl-btn" style={{ flex: 1, marginBottom: 0 }}>
            {BUTTON_CANCEL}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={confirmDisabled}
            className="tpl-btnp"
            style={{
              flex: 1,
              marginBottom: 0,
              ...(destructive ? { background: "var(--tpl-bad)", borderColor: "var(--tpl-bad)" } : {}),
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
