import { useEffect, useState } from "react";
import { PinKeypad } from "@/components/PinKeypad";
import {
  LABEL_YOUR_OVERRIDE_PIN,
  LABEL_YOUR_OVERRIDE_PIN_ENTER,
  LABEL_YOUR_OVERRIDE_PIN_CONFIRM,
  ERROR_PINS_DO_NOT_MATCH,
  BUTTON_CANCEL,
} from "@/lib";
import { Modal } from "../Modal";

interface SetPinModalProps {
  open: boolean;
  submitting: boolean;
  error: string | null;
  onCancel: () => void;
  onSubmit: (pin: string) => void;
  /** Defaults to "Your override PIN" (self-service, Settings page). Pass a custom heading when an admin is setting someone else's PIN (Staff page). */
  heading?: string;
}

export function SetPinModal({ open, submitting, error, onCancel, onSubmit, heading }: SetPinModalProps) {
  const [firstPin, setFirstPin] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [mismatchError, setMismatchError] = useState(false);

  useEffect(() => {
    if (!open) {
      setFirstPin(null);
      setDraft("");
      setMismatchError(false);
    }
  }, [open]);

  function handleCancel() {
    onCancel();
  }

  function handleFirstEntry(pin: string) {
    setFirstPin(pin);
    setDraft("");
  }

  function handleConfirmEntry(pin: string) {
    if (pin !== firstPin) {
      setMismatchError(true);
      setDraft("");
      return;
    }
    setMismatchError(false);
    onSubmit(pin);
  }

  return (
    <Modal
      open={open}
      onClose={handleCancel}
      labelledBy="setPinHeading"
      maxWidth={360}
      style={{ textAlign: "center" }}
    >
        <p id="setPinHeading" className="tpl-h3" style={{ marginBottom: 16 }}>
          {heading ?? LABEL_YOUR_OVERRIDE_PIN}
        </p>
        <p className="tpl-ts" style={{ marginBottom: 14 }}>
          {firstPin === null ? LABEL_YOUR_OVERRIDE_PIN_ENTER : LABEL_YOUR_OVERRIDE_PIN_CONFIRM}
        </p>

        <PinKeypad
          length={4}
          value={draft}
          onChange={setDraft}
          onSubmit={firstPin === null ? handleFirstEntry : handleConfirmEntry}
          disabled={submitting}
          ariaLabel={firstPin === null ? LABEL_YOUR_OVERRIDE_PIN_ENTER : LABEL_YOUR_OVERRIDE_PIN_CONFIRM}
        />

        {(mismatchError || error) && (
          <p role="alert" className="tpl-emsg" style={{ marginTop: 14, justifyContent: "center" }}>
            <i className="ti ti-alert-circle" aria-hidden />
            {mismatchError ? ERROR_PINS_DO_NOT_MATCH : error}
          </p>
        )}

        <button
          type="button"
          className="tpl-txt"
          style={{ marginTop: 16 }}
          onClick={handleCancel}
          disabled={submitting}
        >
          {BUTTON_CANCEL}
        </button>
    </Modal>
  );
}
