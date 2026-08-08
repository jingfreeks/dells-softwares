import { useEffect, useRef, useState } from "react";
import {
  ARIA_STAFF_ACTIONS,
  BUTTON_EDIT_NAME,
  BUTTON_RESET_PASSWORD,
  BUTTON_SET_PIN,
  BUTTON_CHANGE_PIN,
  BUTTON_DEACTIVATE,
  BUTTON_ACTIVATE,
  BUTTON_REMOVE,
  BUTTON_REMOVING,
} from "@/lib";

interface StaffActionsMenuProps {
  canRemove: boolean;
  removing: boolean;
  hasPin: boolean;
  active: boolean;
  onEditName: () => void;
  onResetPassword: () => void;
  onSetPin: () => void;
  onToggleActive: () => void;
  onRemove: () => void;
}

export function StaffActionsMenu({
  canRemove,
  removing,
  hasPin,
  active,
  onEditName,
  onResetPassword,
  onSetPin,
  onToggleActive,
  onRemove,
}: StaffActionsMenuProps) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(e: PointerEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  function runAndClose(action: () => void) {
    setOpen(false);
    action();
  }

  return (
    <div className="tpl-menu-wrap" ref={wrapRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={ARIA_STAFF_ACTIONS}
        style={{ background: "none", border: "none", cursor: "pointer", color: "var(--tpl-t7)", fontSize: 17, padding: 6 }}
      >
        <i className="ti ti-dots" aria-hidden />
      </button>
      {open && (
        <div className="tpl-menu" role="menu">
          <button type="button" role="menuitem" onClick={() => runAndClose(onEditName)} className="tpl-menu-item">
            {BUTTON_EDIT_NAME}
          </button>
          <button type="button" role="menuitem" onClick={() => runAndClose(onResetPassword)} className="tpl-menu-item">
            {BUTTON_RESET_PASSWORD}
          </button>
          <button type="button" role="menuitem" onClick={() => runAndClose(onSetPin)} className="tpl-menu-item">
            {hasPin ? BUTTON_CHANGE_PIN : BUTTON_SET_PIN}
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => runAndClose(onToggleActive)}
            className={`tpl-menu-item${active ? " tpl-bad" : ""}`}
          >
            {active ? BUTTON_DEACTIVATE : BUTTON_ACTIVATE}
          </button>
          {canRemove && (
            <button
              type="button"
              role="menuitem"
              disabled={removing}
              onClick={() => runAndClose(onRemove)}
              className="tpl-menu-item tpl-bad"
            >
              {removing ? BUTTON_REMOVING : BUTTON_REMOVE}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
