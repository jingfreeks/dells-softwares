import { useEffect, useRef, type FocusEvent, type RefObject } from "react";

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

function getFocusable(container: HTMLElement): HTMLElement[] {
  return Array.from(
    container.querySelectorAll<HTMLElement>(
      'button, a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
  ).filter((el) => !el.hasAttribute("disabled"));
}

/**
 * Traps Tab/Shift+Tab within an open modal's container -- confirmed live
 * that Tab-ing past the last field in a dialog moved focus straight into
 * the page's own nav behind it, dialog still open on screen. Same "no
 * shared <Modal> component, so no single place this was ever handled" gap
 * as useEscapeToClose. Also moves focus into the dialog on open (unless
 * something inside it -- e.g. an existing autoFocus field -- already has
 * it) and restores focus to whatever triggered the dialog once it closes,
 * both expected parts of the WAI-ARIA dialog pattern.
 */
export function useFocusTrap(open: boolean, containerRef: RefObject<HTMLElement | null>) {
  const previouslyFocused = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    previouslyFocused.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;

    const container = containerRef.current;
    if (container && !container.contains(document.activeElement)) {
      getFocusable(container)[0]?.focus();
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key !== "Tab" || !containerRef.current) return;
      const focusable = getFocusable(containerRef.current);
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      previouslyFocused.current?.focus();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
}
