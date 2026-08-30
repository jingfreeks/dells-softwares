import { useState } from "react";
import {
  ARIA_CLOSE_MODAL,
  LABEL_COUNT_CLOSING_CASH,
  LABEL_CLOSING_FLOAT,
  ERROR_INVALID_CLOSING_FLOAT,
  BUTTON_END_SHIFT,
  BUTTON_SKIP_COUNT,
  useEscapeToClose,
} from "@/lib";

interface CloseShiftModalProps {
  onConfirm: (closingFloat: number) => void;
  onSkip: () => void;
  onCancel: () => void;
}

export function CloseShiftModal({ onConfirm, onSkip, onCancel }: CloseShiftModalProps) {
  const [closingFloat, setClosingFloat] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEscapeToClose(true, onCancel);

  function handleConfirm() {
    const parsed = Number(closingFloat);
    if (closingFloat.trim() === "" || Number.isNaN(parsed) || parsed < 0) {
      setError(ERROR_INVALID_CLOSING_FLOAT);
      return;
    }
    onConfirm(parsed);
  }

  return (
    <div className="tpl-modal-overlay" onClick={onCancel}>
      <div
        className="tpl-modal-panel tpl-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="closeShiftHeading"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="tpl-sp" style={{ marginBottom: 14 }}>
          <p id="closeShiftHeading" className="tpl-h3">
            {LABEL_COUNT_CLOSING_CASH}
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

        <label htmlFor="closing-float" className="sr-only">
          {LABEL_CLOSING_FLOAT}
        </label>
        <div className="tpl-fld" style={{ marginBottom: 6 }}>
          <input
            id="closing-float"
            type="number"
            min="0"
            step="0.01"
            inputMode="decimal"
            value={closingFloat}
            onChange={(e) => setClosingFloat(e.target.value)}
            autoFocus
          />
        </div>
        {error && (
          <p role="alert" className="tpl-emsg" style={{ marginBottom: 6 }}>
            <i className="ti ti-alert-circle" aria-hidden />
            {error}
          </p>
        )}

        <div className="tpl-row" style={{ marginTop: 14 }}>
          <button type="button" onClick={handleConfirm} className="tpl-btnp" style={{ flex: 1, marginBottom: 0 }}>
            {BUTTON_END_SHIFT}
          </button>
        </div>
        <button type="button" onClick={onSkip} className="tpl-lnk" style={{ marginTop: 12, display: "block" }}>
          {BUTTON_SKIP_COUNT}
        </button>
      </div>
    </div>
  );
}
