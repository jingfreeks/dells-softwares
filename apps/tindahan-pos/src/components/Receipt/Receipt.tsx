import { PESO } from "@/lib/money";
import type { SaleRecord, Store } from "@/lib/types";
import {
  LABEL_RECEIPT_HEADING,
  LABEL_RECEIPT_NUMBER_PREFIX,
  LABEL_CASHIER_ON_RECEIPT_PREFIX,
  LABEL_PAYMENT_CASH,
  LABEL_PAYMENT_QR,
  LABEL_PAYMENT_UTANG,
  LABEL_CASH_TENDERED,
  LABEL_CHANGE,
  LABEL_REFERENCE_NO_PREFIX,
  LABEL_UTANG_BALANCE_NOTE,
  LABEL_TOTAL_POS,
  TEXT_SAVED_OFFLINE_BADGE,
} from "@/lib/textLabels";

const PAYMENT_LABEL: Record<SaleRecord["paymentType"], string> = {
  cash: LABEL_PAYMENT_CASH,
  qr: LABEL_PAYMENT_QR,
  credit: LABEL_PAYMENT_UTANG,
};

/** What the receipt needs from Settings → Receipts — a subset of
 * `ReceiptSettingsMock`, kept local so this shared component doesn't
 * depend on a page-level module. */
export interface ReceiptDisplaySettings {
  includeTinAndPermit: boolean;
  includeCashierName: boolean;
  includeUtangBalance: boolean;
  footerMessage: string;
  nextReceiptNumber: string;
}

interface ReceiptProps {
  sale: SaleRecord;
  store: Store;
  settings: ReceiptDisplaySettings;
  /** TIN / business permit number, when known and `settings.includeTinAndPermit` is on. */
  tin?: string;
  businessPermitNo?: string;
  tendered: number;
  change: number;
}

export function Receipt({ sale, store, settings, tin, businessPermitNo, tendered, change }: ReceiptProps) {
  const timestamp = new Date(sale.timestamp);

  return (
    <div className="print-area tpl-receipt">
      <div className="tpl-receipt-center">
        <p className="tpl-receipt-store">{store.name}</p>
        {store.address && <p className="tpl-receipt-line">{store.address}</p>}
        {settings.includeTinAndPermit && tin && <p className="tpl-receipt-line">TIN: {tin}</p>}
        {settings.includeTinAndPermit && businessPermitNo && (
          <p className="tpl-receipt-line">Permit: {businessPermitNo}</p>
        )}
        <p className="tpl-receipt-heading">{LABEL_RECEIPT_HEADING}</p>
      </div>

      <div className="tpl-receipt-hr" />

      <p className="tpl-receipt-line">
        {LABEL_RECEIPT_NUMBER_PREFIX} {settings.nextReceiptNumber}
      </p>
      <p className="tpl-receipt-line">
        {timestamp.toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" })}{" "}
        {timestamp.toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit" })}
      </p>
      {settings.includeCashierName && (
        <p className="tpl-receipt-line">
          {LABEL_CASHIER_ON_RECEIPT_PREFIX} {sale.cashierName}
        </p>
      )}

      <div className="tpl-receipt-hr" />

      {sale.items.map((item, i) => (
        <div key={`${item.productId || item.name}-${i}`} className="tpl-receipt-item">
          <div className="tpl-receipt-row">
            <span>{item.name}</span>
            <span>{PESO.format(item.lineTotal)}</span>
          </div>
          <p className="tpl-receipt-item-sub">
            {item.quantity} x {PESO.format(item.price)}
          </p>
        </div>
      ))}

      <div className="tpl-receipt-hr" />

      <div className="tpl-receipt-row tpl-receipt-total">
        <span>{LABEL_TOTAL_POS}</span>
        <span>{PESO.format(sale.total)}</span>
      </div>
      {sale.syncStatus === "pending" && (
        <p className="tpl-receipt-center tpl-receipt-line" style={{ marginTop: 4 }}>
          {TEXT_SAVED_OFFLINE_BADGE}
        </p>
      )}
      <div className="tpl-receipt-row">
        <span>{PAYMENT_LABEL[sale.paymentType]}</span>
        <span />
      </div>
      {sale.paymentType === "cash" && (
        <>
          <div className="tpl-receipt-row">
            <span>{LABEL_CASH_TENDERED}</span>
            <span>{PESO.format(tendered)}</span>
          </div>
          <div className="tpl-receipt-row">
            <span>{LABEL_CHANGE}</span>
            <span>{PESO.format(change)}</span>
          </div>
        </>
      )}
      {sale.paymentType === "qr" && sale.referenceNo && (
        <div className="tpl-receipt-row">
          <span>{LABEL_REFERENCE_NO_PREFIX}</span>
          <span>{sale.referenceNo}</span>
        </div>
      )}
      {sale.paymentType === "credit" && settings.includeUtangBalance && (
        <p className="tpl-receipt-line" style={{ marginTop: 6 }}>
          {LABEL_UTANG_BALANCE_NOTE}
        </p>
      )}

      {settings.footerMessage && (
        <>
          <div className="tpl-receipt-hr" />
          <p className="tpl-receipt-center tpl-receipt-line">{settings.footerMessage}</p>
        </>
      )}
    </div>
  );
}
