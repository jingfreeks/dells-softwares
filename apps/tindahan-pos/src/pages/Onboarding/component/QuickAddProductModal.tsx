import type { FormEvent } from "react";
import {
  LABEL_QUICK_ADD_PRODUCT,
  LABEL_NAME,
  LABEL_PRICE,
  LABEL_BARCODE_OPTIONAL,
  ARIA_CLOSE_MODAL,
  BUTTON_ADD_PRODUCT,
  BUTTON_DONE,
} from "@/lib";
import type { QuickAddForm } from "../useProductsStep";

interface QuickAddProductModalProps {
  form: QuickAddForm;
  onFormChange: (form: QuickAddForm) => void;
  error: string | null;
  saving: boolean;
  onSubmit: () => void;
  onClose: () => void;
}

export function QuickAddProductModal({
  form,
  onFormChange,
  error,
  saving,
  onSubmit,
  onClose,
}: QuickAddProductModalProps) {
  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    onSubmit();
  }

  return (
    <div className="tpl-modal-overlay" onClick={onClose}>
      <div
        className="tpl-modal-panel tpl-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="quickAddProductHeading"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="tpl-sp" style={{ marginBottom: 18, alignItems: "flex-start" }}>
          <p id="quickAddProductHeading" className="tpl-h3">
            {LABEL_QUICK_ADD_PRODUCT}
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

        <form onSubmit={handleSubmit} noValidate>
          <label htmlFor="quickAddName" className="tpl-lbl">
            {LABEL_NAME}
          </label>
          <div className="tpl-fld" style={{ marginBottom: 14 }}>
            <input
              id="quickAddName"
              type="text"
              value={form.name}
              onChange={(e) => onFormChange({ ...form, name: e.target.value })}
            />
          </div>

          <label htmlFor="quickAddPrice" className="tpl-lbl">
            {LABEL_PRICE}
          </label>
          <div className="tpl-fld" style={{ marginBottom: 14 }}>
            <input
              id="quickAddPrice"
              type="number"
              min="0"
              step="0.01"
              value={form.price}
              onChange={(e) => onFormChange({ ...form, price: e.target.value })}
            />
          </div>

          <label htmlFor="quickAddBarcode" className="tpl-lbl">
            {LABEL_BARCODE_OPTIONAL}
          </label>
          <div className="tpl-fld" style={{ marginBottom: 14 }}>
            <input
              id="quickAddBarcode"
              type="text"
              value={form.barcode}
              onChange={(e) => onFormChange({ ...form, barcode: e.target.value })}
            />
          </div>

          {error && (
            <p role="alert" className="tpl-emsg">
              <i className="ti ti-alert-circle" aria-hidden />
              {error}
            </p>
          )}

          <div className="tpl-row" style={{ marginTop: 12 }}>
            <button type="button" onClick={onClose} className="tpl-btn" style={{ flex: 1, marginBottom: 0 }}>
              {BUTTON_DONE}
            </button>
            <button type="submit" disabled={saving} className="tpl-btnp" style={{ flex: 2, marginBottom: 0 }}>
              {saving ? `${BUTTON_ADD_PRODUCT}…` : BUTTON_ADD_PRODUCT}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
