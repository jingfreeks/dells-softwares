import type { FormEvent } from "react";
import {
  LABEL_CHANGE_PASSWORD_HEADING,
  LABEL_NEW_PASSWORD,
  LABEL_CONFIRM_NEW_PASSWORD,
  BUTTON_CANCEL,
  BUTTON_UPDATE_PASSWORD,
  BUTTON_UPDATING,
  TEXT_PASSWORD_UPDATED,
  useEscapeToClose,
} from "@/lib";
import "@/pages/authTheme.css";

interface ChangePasswordModalProps {
  open: boolean;
  newPassword: string;
  onNewPasswordChange: (value: string) => void;
  confirmNewPassword: string;
  onConfirmNewPasswordChange: (value: string) => void;
  passwordError: string | null;
  passwordSaved: boolean;
  updatingPassword: boolean;
  onCancel: () => void;
  onSubmit: (e: FormEvent) => void;
}

export function ChangePasswordModal({
  open,
  newPassword,
  onNewPasswordChange,
  confirmNewPassword,
  onConfirmNewPasswordChange,
  passwordError,
  passwordSaved,
  updatingPassword,
  onCancel,
  onSubmit,
}: ChangePasswordModalProps) {
  useEscapeToClose(open, onCancel);

  if (!open) return null;

  return (
    <div className="tpl-modal-overlay" onClick={onCancel}>
      <div
        className="tpl-modal-panel tpl-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="changePasswordHeading"
        style={{ maxWidth: 380 }}
        onClick={(e) => e.stopPropagation()}
      >
        <p id="changePasswordHeading" className="tpl-h3">
          {LABEL_CHANGE_PASSWORD_HEADING}
        </p>

        <form style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 14 }} onSubmit={onSubmit} noValidate>
          <div>
            <label htmlFor="newPassword" className="tpl-lbl">
              {LABEL_NEW_PASSWORD}
            </label>
            <div className="tpl-fld">
              <input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => onNewPasswordChange(e.target.value)}
              />
            </div>
          </div>
          <div>
            <label htmlFor="confirmNewPassword" className="tpl-lbl">
              {LABEL_CONFIRM_NEW_PASSWORD}
            </label>
            <div className="tpl-fld">
              <input
                id="confirmNewPassword"
                type="password"
                value={confirmNewPassword}
                onChange={(e) => onConfirmNewPasswordChange(e.target.value)}
              />
            </div>
          </div>

          {passwordError && (
            <p role="alert" className="tpl-emsg">
              <i className="ti ti-alert-circle" aria-hidden />
              {passwordError}
            </p>
          )}
          {passwordSaved && (
            <p role="status" className="tpl-ts" style={{ color: "var(--tpl-ok)" }}>
              {TEXT_PASSWORD_UPDATED}
            </p>
          )}

          <div className="tpl-row" style={{ justifyContent: "flex-end", gap: 8, marginBottom: 0 }}>
            <button
              type="button"
              onClick={onCancel}
              disabled={updatingPassword}
              className="tpl-btn"
              style={{ width: "auto", marginBottom: 0, padding: "0 16px" }}
            >
              {BUTTON_CANCEL}
            </button>
            <button
              type="submit"
              disabled={updatingPassword}
              className="tpl-btnp"
              style={{ width: "auto", marginBottom: 0, padding: "0 16px" }}
            >
              {updatingPassword ? BUTTON_UPDATING : BUTTON_UPDATE_PASSWORD}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
