import { Modal, PinKeypad } from "@/components";
import {
  PESO,
  creditOverageAmount,
  LABEL_OWNER_APPROVAL_NEEDED,
  TEXT_CREDIT_LIMIT_WARNING_MIDDLE,
  TEXT_OWNER_APPROVAL_RECORDED_HINT,
  BUTTON_CANCEL,
  BUTTON_PAY_CASH_INSTEAD,
  type Customer,
} from "@/lib";

interface OwnerApprovalModalProps {
  open: boolean;
  customer: Customer | null;
  total: number;
  pin: string;
  onPinChange: (value: string) => void;
  onSubmit: (pin: string) => void;
  pinError: string | null;
  submitting: boolean;
  onCancel: () => void;
  onPayCashInstead: () => void;
}

export function OwnerApprovalModal({
  open,
  customer,
  total,
  pin,
  onPinChange,
  onSubmit,
  pinError,
  submitting,
  onCancel,
  onPayCashInstead,
}: OwnerApprovalModalProps) {
  if (!customer) return null;

  const overage = creditOverageAmount(customer, total);

  return (
    <Modal open={open} onClose={onCancel} labelledBy="ownerApprovalHeading" maxWidth={400} style={{ textAlign: "center" }}>
      <span
        className="tpl-ic tpl-w"
        style={{ width: 40, height: 40, borderRadius: 12, fontSize: 20, margin: "0 auto 11px" }}
      >
        <i className="ti ti-lock" aria-hidden />
      </span>
      <p id="ownerApprovalHeading" className="tpl-h3" style={{ marginBottom: 5 }}>
        {LABEL_OWNER_APPROVAL_NEEDED}
      </p>
      <p style={{ color: "var(--tpl-t6)", fontSize: 13, lineHeight: 1.5, marginBottom: 16 }}>
        {customer.name} {TEXT_CREDIT_LIMIT_WARNING_MIDDLE} {PESO.format(customer.creditLimit ?? 0)} limit by{" "}
        {PESO.format(overage)}.
      </p>

      <PinKeypad
        length={4}
        value={pin}
        onChange={onPinChange}
        onSubmit={onSubmit}
        disabled={submitting}
        ariaLabel={LABEL_OWNER_APPROVAL_NEEDED}
      />

      {pinError && (
        <p role="alert" className="tpl-emsg" style={{ marginTop: 14, justifyContent: "center" }}>
          <i className="ti ti-alert-circle" aria-hidden />
          {pinError}
        </p>
      )}

      <p className="tpl-hint" style={{ marginTop: 14, marginBottom: 14 }}>
        {TEXT_OWNER_APPROVAL_RECORDED_HINT}
      </p>

      <div className="tpl-row">
        <button
          type="button"
          className="tpl-btn"
          style={{ flex: 1, marginBottom: 0, justifyContent: "center", height: 40 }}
          onClick={onCancel}
          disabled={submitting}
        >
          {BUTTON_CANCEL}
        </button>
        <button
          type="button"
          className="tpl-btn"
          style={{ flex: 1, marginBottom: 0, justifyContent: "center", height: 40 }}
          onClick={onPayCashInstead}
          disabled={submitting}
        >
          {BUTTON_PAY_CASH_INSTEAD}
        </button>
      </div>
    </Modal>
  );
}
