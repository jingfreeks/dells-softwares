import { useRef, type CSSProperties, type ReactNode } from "react";
import { useEscapeToClose, useFocusTrap } from "@/lib";

interface ModalBaseProps {
  open: boolean;
  /** Called on Escape, on an overlay click, and by the dialog's own controls. */
  onClose: () => void;
  /** The panel's max width in pixels. Omit for the stylesheet's default. */
  maxWidth?: number;
  style?: CSSProperties;
  children: ReactNode;
}

/**
 * A dialog must be named, and there are only two ways to name one. Most name a
 * heading they already render; a couple (the receipt) have no heading to point
 * at and carry the name themselves. The union makes that an either/or rather
 * than two optional props that could both be omitted.
 */
type ModalProps = ModalBaseProps &
  (
    | { /** id of the element that names this dialog. */ labelledBy: string; label?: never }
    | { labelledBy?: never; /** The dialog's name, when nothing on screen states it. */ label: string }
  );

/**
 * The dialog shell every modal in this app was writing out by hand.
 *
 * useEscapeToClose and useFocusTrap already existed, and their own comments
 * explain why they had to: "each is a bespoke .tpl-modal-overlay div, not a
 * shared <Modal> component, so there was no single place this was ever wired
 * up." Twenty-three components then called both hooks individually and
 * repeated the same two wrappers, the same three ARIA attributes and the same
 * stopPropagation.
 *
 * This is that single place. It is a shell, not a framework: it owns the
 * overlay, the panel, the ARIA contract and the two hooks, and nothing else.
 * What goes inside stays each dialog's own business, which is why there is no
 * title or footer prop -- the modals differ genuinely in their content and
 * forcing them into slots would trade one kind of repetition for a worse one.
 */
export function Modal({ open, onClose, labelledBy, label, maxWidth, style, children }: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  useEscapeToClose(open, onClose);
  useFocusTrap(open, panelRef);

  if (!open) return null;

  return (
    <div className="tpl-modal-overlay" onClick={onClose}>
      <div
        ref={panelRef}
        className="tpl-modal-panel tpl-card"
        style={maxWidth === undefined ? style : { maxWidth, ...style }}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        aria-label={label}
        // The panel must not close the dialog the overlay behind it would.
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
