import { useEffect, useRef, useState } from "react";
import { ARIA_PRODUCT_ACTIONS, BUTTON_PLUS_10_STOCK, BUTTON_EDIT, BUTTON_DELETE } from "@/lib";

interface ProductActionsMenuProps {
  onRestock: () => void;
  onEdit: () => void;
  onRemove: () => void;
}

export function ProductActionsMenu({ onRestock, onEdit, onRemove }: ProductActionsMenuProps) {
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
        aria-label={ARIA_PRODUCT_ACTIONS}
        style={{ background: "none", border: "none", cursor: "pointer", color: "var(--tpl-t7)", fontSize: 17, padding: 6 }}
      >
        <i className="ti ti-dots" aria-hidden />
      </button>
      {open && (
        <div className="tpl-menu" role="menu">
          <button type="button" role="menuitem" onClick={() => runAndClose(onRestock)} className="tpl-menu-item">
            {BUTTON_PLUS_10_STOCK}
          </button>
          <button type="button" role="menuitem" onClick={() => runAndClose(onEdit)} className="tpl-menu-item">
            {BUTTON_EDIT}
          </button>
          <button type="button" role="menuitem" onClick={() => runAndClose(onRemove)} className="tpl-menu-item tpl-bad">
            {BUTTON_DELETE}
          </button>
        </div>
      )}
    </div>
  );
}
