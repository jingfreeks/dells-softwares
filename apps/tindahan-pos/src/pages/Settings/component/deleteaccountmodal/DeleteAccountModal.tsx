import { useRef } from "react";
import {
  LABEL_DELETE_ACCOUNT_CONFIRM_HEADING,
  LABEL_DELETE_ACCOUNT_REQUEST_SUBMITTED_HEADING,
  TEXT_DELETE_ACCOUNT_MODAL_BODY,
  BUTTON_CANCEL,
  BUTTON_DELETING,
  BUTTON_DELETE_MY_ACCOUNT,
  BUTTON_OK,
  useEscapeToClose,
  useFocusTrap,
} from "@/lib";

interface DeleteAccountModalProps {
  open: boolean;
  deleteError: string | null;
  deleting: boolean;
  reviewMessage: string | null;
  onCancel: () => void;
  onConfirm: () => void;
}

export function DeleteAccountModal({
  open,
  deleteError,
  deleting,
  reviewMessage,
  onCancel,
  onConfirm,
}: DeleteAccountModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  useEscapeToClose(open, onCancel);
  useFocusTrap(open, dialogRef);

  if (!open) return null;

  const headingId = "deleteAccountModalHeading";

  if (reviewMessage) {
    return (
      <div className="tpl-modal-overlay" onClick={onCancel}>
        <div
          ref={dialogRef}
          className="tpl-modal-panel tpl-card"
          role="dialog"
          aria-modal="true"
          aria-labelledby={headingId}
          onClick={(e) => e.stopPropagation()}
        >
          <p id={headingId} className="tpl-h3" style={{ marginBottom: 4 }}>
            {LABEL_DELETE_ACCOUNT_REQUEST_SUBMITTED_HEADING}
          </p>
          <p className="tpl-sub" style={{ margin: 0 }}>
            {reviewMessage}
          </p>
          <div className="tpl-row" style={{ marginTop: 18, marginBottom: 0 }}>
            <button type="button" onClick={onCancel} className="tpl-btnp" style={{ flex: 1, marginBottom: 0 }}>
              {BUTTON_OK}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="tpl-modal-overlay" onClick={onCancel}>
      <div
        ref={dialogRef}
        className="tpl-modal-panel tpl-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby={headingId}
        onClick={(e) => e.stopPropagation()}
      >
        <p id={headingId} className="tpl-h3" style={{ marginBottom: 4 }}>
          {LABEL_DELETE_ACCOUNT_CONFIRM_HEADING}
        </p>
        <p className="tpl-sub" style={{ margin: 0 }}>
          {TEXT_DELETE_ACCOUNT_MODAL_BODY}
        </p>

        {deleteError && (
          <p role="alert" className="tpl-emsg">
            <i className="ti ti-alert-circle" aria-hidden />
            {deleteError}
          </p>
        )}

        <div className="tpl-row" style={{ marginTop: 18, marginBottom: 0 }}>
          <button type="button" onClick={onCancel} disabled={deleting} className="tpl-btn" style={{ flex: 1, marginBottom: 0 }}>
            {BUTTON_CANCEL}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={deleting}
            className="tpl-btnp tpl-bad"
            style={{ flex: 1.3, marginBottom: 0 }}
          >
            {deleting ? BUTTON_DELETING : BUTTON_DELETE_MY_ACCOUNT}
          </button>
        </div>
      </div>
    </div>
  );
}
