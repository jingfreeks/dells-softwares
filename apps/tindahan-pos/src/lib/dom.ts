import { useEffect, type FocusEvent } from "react";

/**
 * Selects a number input's full value on focus, so a default like "0"
 * is replaced by typing instead of requiring a manual backspace first.
 */
export function selectOnFocus(e: FocusEvent<HTMLInputElement>) {
  e.target.select();
}

/**
 * Closes an open modal/dialog on Escape. None of this app's ~20 modals
 * (ConfirmDialog, AddCustomerModal, ProductFormModal, etc.) handle this --
 * each is a bespoke `.tpl-modal-overlay` div, not a shared <Modal>
 * component, so there was no single place this was ever wired up.
 * Call with the dialog's own `open`/`onClose` (or `onCancel`) props.
 */
export function useEscapeToClose(open: boolean, onClose: () => void) {
  useEffect(() => {
    if (!open) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);
}
