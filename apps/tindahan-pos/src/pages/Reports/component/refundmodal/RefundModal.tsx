import { useEffect, useState } from "react";
import { ConfirmDialog } from "@/components";
import {
  supabase,
  PESO,
  TEXT_REFUND_SALE_TITLE,
  TEXT_REFUND_SALE_BODY_PREFIX,
  LABEL_REFUND_REASON,
  PLACEHOLDER_REFUND_REASON,
  LABEL_QUANTITY_SOLD_PREFIX,
  LABEL_QUANTITY_ALREADY_REFUNDED_PREFIX,
  LABEL_QUANTITY_TO_REFUND,
  BUTTON_SUBMIT_REFUND,
  TEXT_NO_ITEMS_TO_REFUND,
  TEXT_NOTHING_LEFT_TO_REFUND,
  type SaleRecord,
} from "@/lib";

interface RefundModalProps {
  open: boolean;
  sale: SaleRecord | null;
  onSubmit: (sale: SaleRecord, reason: string, items: { saleItemId: string; quantity: number }[]) => Promise<unknown>;
  onClose: () => void;
}

/**
 * Refund/return (BIR compliance §39, Phase 2b) — unlike void_sale()'s
 * all-or-nothing reversal, this lets a specific quantity of a specific
 * line be returned. Service lines are never shown here: they aren't
 * stock, and refund_sale_items() itself rejects them.
 */
export function RefundModal({ open, sale, onSubmit, onClose }: RefundModalProps) {
  const [reason, setReason] = useState("");
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [alreadyRefunded, setAlreadyRefunded] = useState<Record<string, number>>({});
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !sale) return;
    setReason("");
    setQuantities({});
    setError(null);
    setLoadingSummary(true);
    supabase
      .from("refund_items")
      .select("sale_item_id, quantity")
      .eq("sale_id", sale.id)
      .then(({ data }) => {
        const sums: Record<string, number> = {};
        for (const row of data ?? []) {
          sums[row.sale_item_id] = (sums[row.sale_item_id] ?? 0) + row.quantity;
        }
        setAlreadyRefunded(sums);
        setLoadingSummary(false);
      });
  }, [open, sale]);

  if (!open || !sale) return null;

  const productLines = sale.items
    .filter((item) => item.itemType === "product")
    .map((item) => {
      const refunded = alreadyRefunded[item.id] ?? 0;
      return { item, refunded, remaining: item.quantity - refunded };
    })
    .filter(({ remaining }) => remaining > 0);

  const selectedItems = Object.entries(quantities)
    .filter(([, qty]) => qty > 0)
    .map(([saleItemId, quantity]) => ({ saleItemId, quantity }));

  function setQuantity(saleItemId: string, remaining: number, raw: string) {
    const qty = Math.max(0, Math.min(remaining, Number(raw) || 0));
    setQuantities((prev) => ({ ...prev, [saleItemId]: qty }));
  }

  async function handleConfirm() {
    if (!sale) return;
    if (selectedItems.length === 0) {
      setError(TEXT_NO_ITEMS_TO_REFUND);
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit(sale, reason.trim(), selectedItems);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not refund this sale.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ConfirmDialog
      open={open}
      title={TEXT_REFUND_SALE_TITLE}
      destructive
      confirmLabel={BUTTON_SUBMIT_REFUND}
      confirmDisabled={submitting || loadingSummary || !reason.trim()}
      onConfirm={handleConfirm}
      onCancel={onClose}
      body={
        <div className="flex flex-col gap-3">
          <p>{TEXT_REFUND_SALE_BODY_PREFIX}</p>
          {error && (
            <p role="alert" style={{ color: "var(--tpl-bad)" }}>
              {error}
            </p>
          )}

          {productLines.length === 0 ? (
            <p>{TEXT_NOTHING_LEFT_TO_REFUND}</p>
          ) : (
            <div className="flex flex-col gap-2">
              {productLines.map(({ item, refunded, remaining }) => (
                <div key={item.id} className="flex items-center justify-between gap-2">
                  <div>
                    <p style={{ fontWeight: 500 }}>{item.name}</p>
                    <p className="tpl-ts">
                      {LABEL_QUANTITY_SOLD_PREFIX} {item.quantity} · {PESO.format(item.price)}
                      {refunded > 0 && ` · ${LABEL_QUANTITY_ALREADY_REFUNDED_PREFIX} ${refunded}`}
                    </p>
                  </div>
                  <div className="tpl-fld" style={{ alignItems: "center", gap: 6 }}>
                    <label htmlFor={`refund-qty-${item.id}`} className="tpl-lbl">
                      {LABEL_QUANTITY_TO_REFUND}
                    </label>
                    <input
                      id={`refund-qty-${item.id}`}
                      type="number"
                      min={0}
                      max={remaining}
                      disabled={remaining <= 0}
                      value={quantities[item.id] ?? 0}
                      onChange={(e) => setQuantity(item.id, remaining, e.target.value)}
                      style={{ width: 64 }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="tpl-fld" style={{ flexDirection: "column", alignItems: "stretch" }}>
            <label htmlFor="refund-reason" className="tpl-lbl">
              {LABEL_REFUND_REASON}
            </label>
            <textarea
              id="refund-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={PLACEHOLDER_REFUND_REASON}
              rows={2}
            />
          </div>
        </div>
      }
    />
  );
}
