import { useState } from "react";
import { ConfirmDialog } from "@/components";
import {
  PESO,
  LABEL_SALES_LIST,
  TEXT_NO_SALES_IN_RANGE,
  COLUMN_DATE,
  COLUMN_CASHIER,
  COLUMN_ITEMS,
  COLUMN_PAYMENT,
  COLUMN_TOTAL,
  COLUMN_STATUS,
  LABEL_STATUS_VOIDED,
  BUTTON_VOID_SALE,
  TEXT_VOID_SALE_TITLE,
  TEXT_VOID_SALE_BODY_PREFIX,
  LABEL_VOID_REASON,
  PLACEHOLDER_VOID_REASON,
  TEXT_VOID_REASON_PREFIX,
  TEXT_VOIDED_BY_PREFIX,
  LABEL_PAYMENT_CASH,
  LABEL_PAYMENT_QR,
  LABEL_PAYMENT_UTANG,
  type SaleRecord,
  type PaymentType,
} from "@/lib";

const COLUMNS = "130px 1fr 1fr 90px 100px 110px";

const PAYMENT_LABEL: Record<PaymentType, string> = {
  cash: LABEL_PAYMENT_CASH,
  qr: LABEL_PAYMENT_QR,
  credit: LABEL_PAYMENT_UTANG,
};

function formatSaleDate(timestamp: string): string {
  return new Date(timestamp).toLocaleString("en-PH", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatItems(sale: SaleRecord): string {
  return sale.items.map((item) => (item.quantity > 1 ? `${item.name} ×${item.quantity}` : item.name)).join(", ");
}

function SaleStatusChip() {
  return (
    <span className="tpl-chip tpl-bad" style={{ fontSize: 11, padding: "3px 9px" }}>
      {LABEL_STATUS_VOIDED}
    </span>
  );
}

interface SalesTableProps {
  sales: SaleRecord[];
  /** Omit to hide the void action entirely (e.g. a non-admin view). */
  onVoidSale?: (sale: SaleRecord, reason: string) => Promise<void>;
  voidError?: string | null;
}

export function SalesTable({ sales, onVoidSale, voidError }: SalesTableProps) {
  const [voidingSale, setVoidingSale] = useState<SaleRecord | null>(null);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function closeVoidDialog() {
    setVoidingSale(null);
    setReason("");
    setSubmitting(false);
  }

  async function confirmVoid() {
    if (!voidingSale || !onVoidSale || !reason.trim()) return;
    setSubmitting(true);
    try {
      await onVoidSale(voidingSale, reason.trim());
      closeVoidDialog();
    } catch {
      // onVoidSale's caller is expected to surface voidError; keep the
      // dialog open (with the reason still filled in) so the admin can retry.
      setSubmitting(false);
    }
  }

  return (
    <div className="tpl-card" style={{ padding: 0 }}>
      <p className="tpl-h2" style={{ padding: "14px 15px 0" }}>
        {LABEL_SALES_LIST}
      </p>
      <div className="tpl-thead" style={{ gridTemplateColumns: COLUMNS }}>
        <span>{COLUMN_DATE}</span>
        <span>{COLUMN_CASHIER}</span>
        <span>{COLUMN_ITEMS}</span>
        <span>{COLUMN_PAYMENT}</span>
        <span className="tpl-right">{COLUMN_TOTAL}</span>
        <span className="tpl-right">{COLUMN_STATUS}</span>
      </div>

      {sales.length === 0 && (
        <p className="tpl-ts" style={{ padding: "24px 15px", textAlign: "center" }}>
          {TEXT_NO_SALES_IN_RANGE}
        </p>
      )}

      {sales.map((sale) => (
        <div key={sale.id} className="tpl-trow" style={{ gridTemplateColumns: COLUMNS }}>
          <span className="tpl-ts">{formatSaleDate(sale.timestamp)}</span>
          <span className="tpl-tp">{sale.cashierName}</span>
          <span className="tpl-ts">{formatItems(sale)}</span>
          <span className="tpl-tp">{PAYMENT_LABEL[sale.paymentType]}</span>
          <span className="tpl-ts tpl-right">{PESO.format(sale.total)}</span>
          <span className="tpl-right">
            {sale.status === "voided" ? (
              <span
                title={[
                  sale.voidedByName && `${TEXT_VOIDED_BY_PREFIX} ${sale.voidedByName}`,
                  sale.voidReason && `${TEXT_VOID_REASON_PREFIX} ${sale.voidReason}`,
                ]
                  .filter(Boolean)
                  .join(" — ")}
              >
                <SaleStatusChip />
              </span>
            ) : (
              onVoidSale && (
                <button
                  type="button"
                  className="tpl-lnk"
                  style={{ fontSize: 12 }}
                  onClick={() => setVoidingSale(sale)}
                >
                  {BUTTON_VOID_SALE}
                </button>
              )
            )}
          </span>
        </div>
      ))}

      <ConfirmDialog
        open={!!voidingSale}
        title={TEXT_VOID_SALE_TITLE}
        destructive
        confirmLabel={BUTTON_VOID_SALE}
        confirmDisabled={!reason.trim() || submitting}
        onConfirm={confirmVoid}
        onCancel={closeVoidDialog}
        body={
          <div className="flex flex-col gap-3">
            <p>{TEXT_VOID_SALE_BODY_PREFIX}</p>
            {voidError && (
              <p role="alert" style={{ color: "var(--tpl-bad)" }}>
                {voidError}
              </p>
            )}
            <div className="tpl-fld" style={{ flexDirection: "column", alignItems: "stretch" }}>
              <label htmlFor="void-reason" className="tpl-lbl">
                {LABEL_VOID_REASON}
              </label>
              <textarea
                id="void-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={PLACEHOLDER_VOID_REASON}
                rows={2}
                autoFocus
              />
            </div>
          </div>
        }
      />
    </div>
  );
}
