import type { FormEvent } from "react";
import {
  BUTTON_ADD_STAFF,
  TEXT_ADD_CASHIER_DESCRIPTION,
  ARIA_CLOSE_MODAL,
  LABEL_NAME,
  LABEL_EMAIL_ADDRESS,
  LABEL_TEMPORARY_PASSWORD,
  HINT_PASSWORD_MIN_LENGTH,
  BUTTON_CANCEL,
  BUTTON_CREATING,
  BUTTON_CREATE_CASHIER_ACCOUNT,
} from "@/lib";

interface StaffFormValues {
  name: string;
  email: string;
  password: string;
}

interface AddStaffModalProps {
  form: StaffFormValues;
  formError: string | null;
  submitting: boolean;
  onFieldChange: (field: keyof StaffFormValues, value: string) => void;
  onCancel: () => void;
  onSubmit: (e: FormEvent) => void;
}

export function AddStaffModal({ form, formError, submitting, onFieldChange, onCancel, onSubmit }: AddStaffModalProps) {
  return (
    <div className="tpl-modal-overlay" onClick={onCancel}>
      <div
        className="tpl-modal-panel tpl-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="addStaffHeading"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="tpl-sp" style={{ marginBottom: 18, alignItems: "flex-start" }}>
          <div>
            <p id="addStaffHeading" className="tpl-h3">{BUTTON_ADD_STAFF}</p>
            <p className="tpl-ts" style={{ marginTop: 4 }}>{TEXT_ADD_CASHIER_DESCRIPTION}</p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            aria-label={ARIA_CLOSE_MODAL}
            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--tpl-t7)", fontSize: 18, padding: 4 }}
          >
            <i className="ti ti-x" aria-hidden />
          </button>
        </div>

        <form onSubmit={onSubmit} noValidate>
          <label htmlFor="staffName" className="tpl-lbl">{LABEL_NAME}</label>
          <div className="tpl-fld" style={{ marginBottom: 14 }}>
            <input id="staffName" type="text" value={form.name} onChange={(e) => onFieldChange("name", e.target.value)} />
          </div>

          <label htmlFor="staffEmail" className="tpl-lbl">{LABEL_EMAIL_ADDRESS}</label>
          <div className="tpl-fld" style={{ marginBottom: 14 }}>
            <input
              id="staffEmail"
              type="email"
              autoComplete="off"
              value={form.email}
              onChange={(e) => onFieldChange("email", e.target.value)}
            />
          </div>

          <label htmlFor="staffPassword" className="tpl-lbl">{LABEL_TEMPORARY_PASSWORD}</label>
          <div className="tpl-fld">
            <input
              id="staffPassword"
              type="password"
              autoComplete="new-password"
              minLength={8}
              value={form.password}
              onChange={(e) => onFieldChange("password", e.target.value)}
            />
          </div>
          <p className="tpl-hint" style={{ marginBottom: 14 }}>{HINT_PASSWORD_MIN_LENGTH}</p>

          {formError && (
            <p role="alert" className="tpl-emsg">
              <i className="ti ti-alert-circle" aria-hidden />
              {formError}
            </p>
          )}

          <div className="tpl-row" style={{ marginTop: 12 }}>
            <button type="button" onClick={onCancel} className="tpl-btn" style={{ flex: 1, marginBottom: 0 }}>
              {BUTTON_CANCEL}
            </button>
            <button type="submit" disabled={submitting} className="tpl-btnp" style={{ flex: 2, marginBottom: 0 }}>
              {submitting ? BUTTON_CREATING : BUTTON_CREATE_CASHIER_ACCOUNT}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
