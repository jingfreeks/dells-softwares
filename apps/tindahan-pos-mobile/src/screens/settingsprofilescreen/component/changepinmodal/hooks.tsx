import { useState } from "react";
import { useAuth } from "../../../../lib/auth";
import type { ChangePinModalProps } from "./types";

const PIN_LENGTH = 4;

/**
 * The override PIN authorizes voids, big cash-outs and over-limit utang,
 * so it's a real, server-hashed value (set_own_pin -> staff.pin_hash) --
 * never stored on the device.
 */
export function useChangePinModal({ onClose }: ChangePinModalProps) {
  const { setOwnPin } = useAuth();
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!/^\d{4}$/.test(pin)) {
      setError(`Your PIN must be ${PIN_LENGTH} digits.`);
      return;
    }
    if (pin !== confirmPin) {
      setError("PINs don't match.");
      return;
    }
    setSubmitting(true);
    setError(null);
    const result = await setOwnPin(pin);
    setSubmitting(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setPin("");
    setConfirmPin("");
    onClose();
  }

  return { pin, setPin, confirmPin, setConfirmPin, submitting, error, submit };
}
