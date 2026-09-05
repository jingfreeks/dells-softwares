import { Modal, PinKeypad } from "@/components";
import { LABEL_UNPAIR_DEVICE_HEADING, TEXT_ENTER_OWNER_PIN, BUTTON_CANCEL } from "@/lib";

interface UnpairDeviceModalProps {
  open: boolean;
  pin: string;
  onPinChange: (value: string) => void;
  onSubmit: (pin: string) => void;
  error: string | null;
  submitting: boolean;
  onCancel: () => void;
}

export function UnpairDeviceModal({ open, pin, onPinChange, onSubmit, error, submitting, onCancel }: UnpairDeviceModalProps) {
  return (
    <Modal open={open} onClose={onCancel} labelledBy="unpairDeviceHeading" maxWidth={360} style={{ textAlign: "center" }}>
      <p id="unpairDeviceHeading" className="tpl-h3" style={{ marginBottom: 16 }}>
        {LABEL_UNPAIR_DEVICE_HEADING}
      </p>
      <p className="tpl-ts" style={{ marginBottom: 14 }}>
        {TEXT_ENTER_OWNER_PIN}
      </p>

      <PinKeypad
        length={4}
        value={pin}
        onChange={onPinChange}
        onSubmit={onSubmit}
        disabled={submitting}
        ariaLabel={TEXT_ENTER_OWNER_PIN}
      />

      {error && (
        <p role="alert" className="tpl-emsg" style={{ marginTop: 14, justifyContent: "center" }}>
          <i className="ti ti-alert-circle" aria-hidden />
          {error}
        </p>
      )}

      <button type="button" className="tpl-txt" style={{ marginTop: 16 }} onClick={onCancel} disabled={submitting}>
        {BUTTON_CANCEL}
      </button>
    </Modal>
  );
}
