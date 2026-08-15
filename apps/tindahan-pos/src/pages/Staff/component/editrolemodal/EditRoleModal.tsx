import { useState } from "react";
import {
  HEADING_EDIT_ROLE,
  ARIA_CLOSE_MODAL,
  LABEL_CASHIER_EDIT_PRICES_TITLE,
  TEXT_CASHIER_EDIT_PRICES_DESC,
  BUTTON_SAVE,
  ERROR_COULD_NOT_SAVE_ROLE,
  type Store,
} from "@/lib";

interface EditRoleModalProps {
  store: Store;
  onSave: (patch: { cashierCanEditPrices: boolean }) => Promise<{ ok: boolean; error?: string }>;
  onClose: () => void;
}

export function EditRoleModal({ store, onSave, onClose }: EditRoleModalProps) {
  const [cashierCanEditPrices, setCashierCanEditPrices] = useState(store.cashierCanEditPrices);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setSaving(true);
    setError(null);
    const result = await onSave({ cashierCanEditPrices });
    setSaving(false);
    if (!result.ok) {
      setError(result.error || ERROR_COULD_NOT_SAVE_ROLE);
      return;
    }
    onClose();
  }

  return (
    <div className="tpl-modal-overlay" onClick={onClose}>
      <div
        className="tpl-modal-panel tpl-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="editRoleHeading"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="tpl-sp" style={{ marginBottom: 14 }}>
          <p id="editRoleHeading" className="tpl-h3">
            {HEADING_EDIT_ROLE}
          </p>
          <button
            type="button"
            onClick={onClose}
            aria-label={ARIA_CLOSE_MODAL}
            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--tpl-t7)", fontSize: 18, padding: 4 }}
          >
            <i className="ti ti-x" aria-hidden />
          </button>
        </div>

        <div className="tpl-card" style={{ background: "var(--tpl-gl3)", marginBottom: 14 }}>
          <div className="tpl-sp">
            <div className="tpl-flex1">
              <p className="tpl-tp">{LABEL_CASHIER_EDIT_PRICES_TITLE}</p>
              <p className="tpl-ts">{TEXT_CASHIER_EDIT_PRICES_DESC}</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={cashierCanEditPrices}
              aria-label={LABEL_CASHIER_EDIT_PRICES_TITLE}
              onClick={() => setCashierCanEditPrices((v) => !v)}
              className={`tpl-tog${cashierCanEditPrices ? " tpl-on" : ""}`}
            >
              <span />
            </button>
          </div>
        </div>

        {error && (
          <p role="alert" className="tpl-emsg" style={{ marginBottom: 14 }}>
            <i className="ti ti-alert-circle" aria-hidden />
            {error}
          </p>
        )}

        <button type="button" onClick={handleSave} disabled={saving} className="tpl-btnp" style={{ marginBottom: 0 }}>
          {BUTTON_SAVE}
        </button>
      </div>
    </div>
  );
}
