import {
  BUTTON_CANCEL_SALE,
  BUTTON_PROCESSING,
  BUTTON_COMPLETE_SALE,
  BUTTON_HOLD_SALE,
  BUTTON_HOLDING,
  LABEL_NEEDS_OWNER_PIN,
} from "@/lib";

interface CheckoutActionsProps {
  cartEmpty: boolean;
  checkingOut: boolean;
  disableComplete: boolean;
  needsOwnerPin: boolean;
  holdingSale: boolean;
  onCancel: () => void;
  onComplete: () => void;
  onHold: () => void;
}

export function CheckoutActions({
  cartEmpty,
  checkingOut,
  disableComplete,
  needsOwnerPin,
  holdingSale,
  onCancel,
  onComplete,
  onHold,
}: CheckoutActionsProps) {
  return (
    <div style={{ marginTop: 14 }}>
      <button type="button" onClick={onComplete} disabled={disableComplete} className="tpl-btnp">
        {checkingOut ? (
          BUTTON_PROCESSING
        ) : needsOwnerPin ? (
          <>
            <i className="ti ti-lock" aria-hidden style={{ marginRight: 6 }} />
            {LABEL_NEEDS_OWNER_PIN}
          </>
        ) : (
          BUTTON_COMPLETE_SALE
        )}
      </button>
      <button
        type="button"
        onClick={onHold}
        disabled={cartEmpty || checkingOut || holdingSale}
        className="tpl-btn"
        style={{ width: "100%", marginTop: 8 }}
      >
        {holdingSale ? BUTTON_HOLDING : BUTTON_HOLD_SALE}
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
