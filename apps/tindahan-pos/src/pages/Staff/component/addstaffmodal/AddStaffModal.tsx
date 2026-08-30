import { useRef, type FormEvent } from "react";
import {
  BUTTON_ADD_STAFF,
  TEXT_ADD_CASHIER_DESCRIPTION,
  ARIA_CLOSE_MODAL,
  LABEL_NAME,
  LABEL_EMAIL_ADDRESS,
  BUTTON_CANCEL,
  BUTTON_CREATING,
  BUTTON_CREATE_CASHIER_ACCOUNT,
  useEscapeToClose,
  useFocusTrap,
} from "@/lib";
import type { StaffFormValues } from "../../hooks";
import { RoleSelector } from "./roleselector";
import { PermissionPreview } from "./permissionpreview";
import { SignInMethodSelector } from "./signinmethodselector";
import { ShiftSelector } from "./shiftselector";
import { DrawerCountingToggle } from "./drawercountingtoggle";

interface AddStaffModalProps {
  form: StaffFormValues;
  formError: string | null;
  submitting: boolean;
  onFormChange: (form: StaffFormValues) => void;
  onCancel: () => void;
  onSubmit: (e: FormEvent) => void;
}

export function AddStaffModal({ form, formError, submitting, onFormChange, onCancel, onSubmit }: AddStaffModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  useEscapeToClose(true, onCancel);
  useFocusTrap(true, dialogRef);

  return (
    <div className="tpl-modal-overlay" onClick={onCancel}>
      <div
        ref={dialogRef}
        className="tpl-modal-panel tpl-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="addStaffHeading"
        style={{ maxHeight: "calc(100vh - 32px)", overflowY: "auto" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="tpl-sp" style={{ marginBottom: 18, alignItems: "flex-start" }}>
          <div className="tpl-row">
            <span
              className="tpl-ic"
              style={{ width: 34, height: 34, borderRadius: 11, fontSize: 17, border: "0.5px solid rgba(76,141,255,.32)" }}
            >
              <i className="ti ti-user-plus" aria-hidden />
            </span>
            <div>
              <p id="addStaffHeading" className="tpl-h3">{BUTTON_ADD_STAFF}</p>
              <p className="tpl-ts">{TEXT_ADD_CASHIER_DESCRIPTION}</p>
            </div>
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
            <input id="staffName" type="text" value={form.name} onChange={(e) => onFormChange({ ...form, name: e.target.value })} />
          </div>

          <label htmlFor="staffEmail" className="tpl-lbl">{LABEL_EMAIL_ADDRESS}</label>
          <div className="tpl-fld" style={{ marginBottom: 14 }}>
            <input
              id="staffEmail"
              type="email"
              autoComplete="off"
              value={form.email}
              onChange={(e) => onFormChange({ ...form, email: e.target.value })}
            />
          </div>

          <RoleSelector value={form.roleSelection} onChange={(roleSelection) => onFormChange({ ...form, roleSelection })} />

          <PermissionPreview role={form.roleSelection} />

          <div className="tpl-divider" style={{ margin: "16px 0" }} />

          <SignInMethodSelector value={form.signInMethod} onChange={(signInMethod) => onFormChange({ ...form, signInMethod })} />

          <ShiftSelector value={form.shift} onChange={(shift) => onFormChange({ ...form, shift })} />

          <DrawerCountingToggle
            value={form.drawerCounting}
            onChange={(drawerCounting) => onFormChange({ ...form, drawerCounting })}
          />

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
