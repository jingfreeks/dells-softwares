import { Modal } from "@/components/Modal";
import { PinKeypad } from "@/components/PinKeypad";
import {
  BUTTON_CANCEL,
  LABEL_ADMIN_PIN_REQUIRED,
  TEXT_ADMIN_PIN_RECORDED_HINT,
} from "@/lib";

interface AdminPinModalProps {
  open: boolean;
  /** What's being approved -- e.g. TEXT_VOID_NEEDS_PIN or TEXT_CASH_OUT_CAP_EXCEEDED. */
  message: string;
  pin: string;
  onPinChange: (value: string) => void;
  onSubmit: (pin: string) => void;
  pinError: string | null;
  submitting: boolean;
  onCancel: () => void;
  /** Defaults to LABEL_ADMIN_PIN_REQUIRED. */
  heading?: string;
}

/**
 * A generic "an owner needs to approve this with their PIN" dialog --
 * exchanges the PIN for a short-lived, single-use token via
 * check_credit_override_pin() (the caller does the exchange and RPC retry;
 * this component only collects the PIN). Used for void_requires_pin
 * (Reports) and cashier_cash_out_cap (Pos) the same way Pos's
 * OwnerApprovalModal already does for the credit-limit override -- kept
 * separate from that component because its copy and "pay cash instead"
 * escape hatch are both specific to a credit sale.
 */
export function AdminPinModal({
  open,
  message,
  pin,
  onPinChange,
  onSubmit,
  pinError,
  submitting,
  onCancel,
  heading,
}: AdminPinModalProps) {
  return (
    <Modal open={open} onClose={onCancel} labelledBy="adminPinHeading" maxWidth={400} style={{ textAlign: "center" }}>
      <span
        className="tpl-ic tpl-w"
        style={{ width: 40, height: 40, borderRadius: 12, fontSize: 20, margin: "0 auto 11px" }}
      >
        <i className="ti ti-lock" aria-hidden />
      </span>
      <p id="adminPinHeading" className="tpl-h3" style={{ marginBottom: 5 }}>
        {heading ?? LABEL_ADMIN_PIN_REQUIRED}
      </p>
      <p style={{ color: "var(--tpl-t6)", fontSize: 13, lineHeight: 1.5, marginBottom: 16 }}>{message}</p>

      <PinKeypad
        length={4}
        value={pin}
        onChange={onPinChange}
        onSubmit={onSubmit}
        disabled={submitting}
        ariaLabel={heading ?? LABEL_ADMIN_PIN_REQUIRED}
      />

      {pinError && (
        <p role="alert" className="tpl-emsg" style={{ marginTop: 14, justifyContent: "center" }}>
          <i className="ti ti-alert-circle" aria-hidden />
          {pinError}
        </p>
      )}

      <p className="tpl-hint" style={{ marginTop: 14, marginBottom: 14 }}>
        {TEXT_ADMIN_PIN_RECORDED_HINT}
      </p>

      <button
        type="button"
        className="tpl-btn"
        style={{ width: "100%", marginBottom: 0, justifyContent: "center", height: 40 }}
        onClick={onCancel}
        disabled={submitting}
      >
        {BUTTON_CANCEL}
      </button>
    </Modal>
  );
}
