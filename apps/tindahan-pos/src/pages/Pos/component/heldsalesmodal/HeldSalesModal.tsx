import { useRef, useState } from "react";
import {
  PESO,
  cartTotal,
  heldSaleHasIrreversibleService,
  LABEL_HELD_SALES,
  LABEL_HELD_SALES_EMPTY,
  TEXT_HELD_BY,
  BUTTON_RESUME_SALE,
  BUTTON_DISCARD_SALE,
  TEXT_DISCARD_CONFIRM_HAS_SERVICE,
  BUTTON_CLOSE,
  useEscapeToClose,
  useFocusTrap,
  type HeldSale,
  type Product,
} from "@/lib";

interface HeldSalesModalProps {
  open: boolean;
  heldSales: HeldSale[];
  products: Product[];
  resumeError: string | null;
  onResume: (id: string) => void;
  onDiscard: (id: string) => void;
  onClose: () => void;
}

function heldSaleDisplayTotal(held: HeldSale, products: Product[]): number {
  const resolvedCart = held.cartLines
    .map((line) => {
      const product = products.find((p) => p.id === line.productId);
      return product ? { product, quantity: line.quantity } : null;
    })
    .filter((line): line is { product: Product; quantity: number } => line !== null);
  return cartTotal(resolvedCart) + held.serviceLines.reduce((sum, l) => sum + l.amount + l.fee, 0);
}

export function HeldSalesModal({ open, heldSales, products, resumeError, onResume, onDiscard, onClose }: HeldSalesModalProps) {
  const [confirmingDiscardId, setConfirmingDiscardId] = useState<string | null>(null);

  const dialogRef = useRef<HTMLDivElement>(null);
  useEscapeToClose(open, onClose);
  useFocusTrap(open, dialogRef);

  if (!open) return null;

  function handleDiscardClick(held: HeldSale) {
    if (heldSaleHasIrreversibleService(held) && confirmingDiscardId !== held.id) {
      setConfirmingDiscardId(held.id);
      return;
    }
    setConfirmingDiscardId(null);
    onDiscard(held.id);
  }

  return (
    <div className="tpl-modal-overlay" onClick={onClose}>
      <div
        ref={dialogRef}
        className="tpl-modal-panel tpl-card"
        style={{ maxWidth: 460 }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="heldSalesHeading"
        onClick={(e) => e.stopPropagation()}
      >
        <p id="heldSalesHeading" className="tpl-h3" style={{ marginBottom: 14 }}>
          {LABEL_HELD_SALES}
        </p>

        {resumeError && (
          <p role="alert" className="tpl-emsg" style={{ marginBottom: 14 }}>
            <i className="ti ti-alert-circle" aria-hidden />
            {resumeError}
          </p>
        )}

        {heldSales.length === 0 ? (
          <p style={{ color: "var(--tpl-t6)", fontSize: 13 }}>{LABEL_HELD_SALES_EMPTY}</p>
        ) : (
          <ul style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {heldSales.map((held) => {
              const itemCount = held.cartLines.length + held.serviceLines.length;
              const isConfirmingDiscard = confirmingDiscardId === held.id;
              return (
                <li key={held.id} className="tpl-note" style={{ padding: 11 }}>
                  <div className="tpl-sp">
                    <span style={{ fontSize: 13 }}>{itemCount} items</span>
                    <span style={{ fontWeight: 500 }}>{PESO.format(heldSaleDisplayTotal(held, products))}</span>
                  </div>
                  <p style={{ color: "var(--tpl-t6)", fontSize: 12, marginTop: 4 }}>
                    {TEXT_HELD_BY} {held.heldByName} ·{" "}
                    {new Date(held.createdAt).toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit" })}
                  </p>

                  {isConfirmingDiscard && (
                    <p role="alert" className="tpl-emsg" style={{ marginTop: 8 }}>
                      <i className="ti ti-alert-circle" aria-hidden />
                      {TEXT_DISCARD_CONFIRM_HAS_SERVICE}
                    </p>
                  )}

                  <div className="tpl-row" style={{ marginTop: 8, gap: 8 }}>
                    <button
                      type="button"
                      className="tpl-btnp"
                      style={{ flex: 1, marginBottom: 0, justifyContent: "center", height: 34 }}
                      onClick={() => onResume(held.id)}
                    >
                      {BUTTON_RESUME_SALE}
                    </button>
                    <button
                      type="button"
                      className="tpl-btn"
                      style={{ flex: 1, marginBottom: 0, justifyContent: "center", height: 34 }}
                      onClick={() => handleDiscardClick(held)}
                    >
                      {isConfirmingDiscard ? BUTTON_DISCARD_SALE + "?" : BUTTON_DISCARD_SALE}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        <button
          type="button"
          className="tpl-btn"
          style={{ width: "100%", marginTop: 14, justifyContent: "center", height: 36 }}
          onClick={onClose}
        >
          {BUTTON_CLOSE}
        </button>
      </div>
    </div>
  );
}
