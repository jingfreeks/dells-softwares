import { BUTTON_CANCEL_SALE, BUTTON_PROCESSING, BUTTON_COMPLETE_SALE } from "@/lib";

interface CheckoutActionsProps {
  cartEmpty: boolean;
  checkingOut: boolean;
  disableComplete: boolean;
  onCancel: () => void;
  onComplete: () => void;
}

export function CheckoutActions({ cartEmpty, checkingOut, disableComplete, onCancel, onComplete }: CheckoutActionsProps) {
  return (
    <div style={{ marginTop: 14 }}>
      <button type="button" onClick={onComplete} disabled={disableComplete} className="tpl-btnp">
        {checkingOut ? BUTTON_PROCESSING : BUTTON_COMPLETE_SALE}
      </button>
      <button
        type="button"
        onClick={onCancel}
        disabled={cartEmpty || checkingOut}
        style={{
          display: "block",
          width: "100%",
          textAlign: "center",
          marginTop: 10,
          background: "none",
          border: "none",
          color: "var(--tpl-t6)",
          fontSize: 13,
          cursor: "pointer",
        }}
      >
        {BUTTON_CANCEL_SALE}
      </button>
    </div>
  );
}
