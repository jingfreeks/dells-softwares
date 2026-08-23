import { PESO } from "@/lib/money";
import type { SaleRecord, Store } from "@/lib/types";
import {
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
  TEXT_RECEIPT_NUMBER_PENDING,
  LABEL_VATABLE_SALES,
  LABEL_VAT_AMOUNT,
  LABEL_VAT_EXEMPT_SALES,
  LABEL_ZERO_RATED_SALES,
  TEXT_NOT_VAT_REGISTERED,
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
        {(store.birRegistered || settings.includeTinAndPermit) && tin && (
          <p className="tpl-receipt-line">TIN: {tin}</p>
        )}
        {(store.birRegistered || settings.includeTinAndPermit) && businessPermitNo && (
          <p className="tpl-receipt-line">Permit: {businessPermitNo}</p>
        )}
        <p className="tpl-receipt-heading">{store.invoiceType}</p>
      </div>

      <div className="tpl-receipt-hr" />

      <p className="tpl-receipt-line">
        {LABEL_RECEIPT_NUMBER_PREFIX} {sale.receiptNumber ?? TEXT_RECEIPT_NUMBER_PENDING}
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

      {sale.vatStatus === "vat_registered" && (
        <>
          <div className="tpl-receipt-row">
            <span>{LABEL_VATABLE_SALES}</span>
            <span>{PESO.format(sale.vatableSales)}</span>
          </div>
          <div className="tpl-receipt-row">
            <span>{LABEL_VAT_AMOUNT}</span>
            <span>{PESO.format(sale.vatAmount)}</span>
          </div>
        </>
      )}
      {sale.vatStatus === "zero_rated" && (
        <div className="tpl-receipt-row">
          <span>{LABEL_ZERO_RATED_SALES}</span>
          <span>{PESO.format(sale.zeroRatedSales)}</span>
        </div>
      )}
      {sale.vatStatus === "vat_exempt" && (
        <div className="tpl-receipt-row">
          <span>{LABEL_VAT_EXEMPT_SALES}</span>
          <span>{PESO.format(sale.vatExemptSales)}</span>
        </div>
      )}
      {(sale.vatStatus === "non_vat" || sale.vatStatus === null) && (
        <p className="tpl-receipt-line">{TEXT_NOT_VAT_REGISTERED}</p>
      )}

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
