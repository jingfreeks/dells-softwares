import { useState } from "react";
import {
  describePlatformError,
  ERROR_COULD_NOT_COMPLETE_SALE,
  ERROR_INVALID_OVERRIDE_PIN,
  ERROR_OVERRIDE_PIN_LOCKED,
} from "@/lib";

interface UseOverrideApprovalOptions {
  /** Retries the sale with the approver's PIN. Expected to throw on refusal. */
  onApprove: (pin: string) => Promise<void>;
  /**
   * Maps a refusal specific to THIS approval to its in-dialog message. The
   * shared PIN refusals (locked, invalid) are handled here; return null to
   * fall through to them.
   */
  describeRefusal?: (message: string) => string | null;
  /** The cashier's session died mid-approval: close up and say so outside. */
  onSessionExpired: (message: string) => void;
  /** The store cannot take sales at all. Nothing to do with the PIN. */
  onStoreSuspended: (message: string) => void;
}

/**
 * An admin-PIN approval dialog: open it, type a PIN, retry the sale.
 *
 * There are two of these on the till -- a credit-limit override and the
 * cashier cash-out cap -- and before this hook they were two near-identical
 * copies of the same forty lines, differing only in which four pieces of state
 * they wrote and one extra error branch. That is duplication of a stateful
 * flow, which is the kind that drifts: a fix to one is easy to miss in the
 * other.
 *
 * What stays outside: what the PIN is FOR. The hook owns the dialog's state
 * and the shared refusal handling; the caller owns the retry and what a
 * successful approval means.
 */
export function useOverrideApproval({
  onApprove,
  describeRefusal,
  onSessionExpired,
  onStoreSuspended,
}: UseOverrideApprovalOptions) {
  const [open, setOpen] = useState(false);
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function openDialog() {
    setError(null);
    setPin("");
    setOpen(true);
  }

  function close() {
    setOpen(false);
    setPin("");
    setError(null);
  }

  async function submit(enteredPin: string) {
    setSubmitting(true);
    setError(null);
    try {
      await onApprove(enteredPin);
      close();
    } catch (err) {
      const message = describePlatformError(err, ERROR_COULD_NOT_COMPLETE_SALE);

      if (message.includes("EXPIRED_CASHIER_SESSION")) {
        close();
        onSessionExpired(message);
        return;
      }
      if (message.includes("ORG_WRITES_SUSPENDED")) {
        // Nothing to do with the PIN -- leaving it in the dialog would read as
        // a rejected approval rather than a closed till.
        close();
        onStoreSuspended(message);
        return;
      }

      // A refusal the approver can act on stays IN the dialog, so a mistyped
      // PIN or a still-over-limit retry can be corrected without starting over.
      setError(
        message.includes("OVERRIDE_PIN_LOCKED")
          ? ERROR_OVERRIDE_PIN_LOCKED
          : message.includes("INVALID_OVERRIDE_PIN")
            ? ERROR_INVALID_OVERRIDE_PIN
            : (describeRefusal?.(message) ?? message)
      );
      setPin("");
    } finally {
      setSubmitting(false);
    }
  }

  return { open, openDialog, close, pin, setPin, error, setError, submitting, submit };
}
