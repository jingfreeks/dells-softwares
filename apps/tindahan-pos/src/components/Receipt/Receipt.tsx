import { formatDate, formatTime } from "@/lib";
import { printGuardrails } from "@/lib/appMode";
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
  TEXT_REPRINT_MARKER,
  TEXT_VOIDED_MARKER,
  TEXT_VOID_REASON_PREFIX,
  TEXT_VOIDED_BY_PREFIX,
  LABEL_SUBTOTAL,
  LABEL_DISCOUNT,
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
  /** Checkout-session-only values -- never persisted on the sale itself, so a
   * reprint (which has no session to read from) omits both rather than
   * showing a fabricated cash breakdown. */
  tendered?: number;
  change?: number;
  /** True when this render is a reprint of a past sale, not the original
   * receipt shown right after checkout -- shows an explicit on-screen marker. */
  isReprint?: boolean;
}

export function Receipt({
  sale,
  store,
  settings,
  tin,
  businessPermitNo,
  tendered,
  change,
  isReprint,
}: ReceiptProps) {
  const timestamp = new Date(sale.timestamp);
  const guard = printGuardrails();

  return (
    <div className="print-area tpl-receipt">
      {/* Before anything else on the page, including the voided and
          reprint markers -- §3/§7: a reprint must never bypass it. */}
      {guard.mandatoryHeader && (
        <p className="tpl-receipt-center tpl-receipt-line" style={{ fontWeight: 700 }}>
          {guard.mandatoryHeader}
        </p>
      )}
      {sale.status === "voided" && (
        <p className="tpl-receipt-center tpl-receipt-line" style={{ fontWeight: 700 }}>
          {TEXT_VOIDED_MARKER}
        </p>
      )}
      {isReprint && (
        <p className="tpl-receipt-center tpl-receipt-line" style={{ fontWeight: 600 }}>
          {TEXT_REPRINT_MARKER}
        </p>
      )}
      <div className="tpl-receipt-center">
        <p className="tpl-receipt-store">{store.name}</p>
        {store.address && <p className="tpl-receipt-line">{store.address}</p>}
        {guard.allowTaxIdentifiers && (store.birRegistered || settings.includeTinAndPermit) && tin && (
          <p className="tpl-receipt-line">TIN: {tin}</p>
        )}
        {guard.allowTaxIdentifiers && (store.birRegistered || settings.includeTinAndPermit) && businessPermitNo && (
          <p className="tpl-receipt-line">Permit: {businessPermitNo}</p>
        )}
        {/* The store's own invoiceType is "Sales Invoice" -- printing it
            here would announce an unaccredited document as an official
            one, so ALPHA substitutes its own title (§4). */}
        <p className="tpl-receipt-heading">{guard.documentTitle ?? store.invoiceType}</p>
      </div>

      <div className="tpl-receipt-hr" />

      <p className="tpl-receipt-line">
        {guard.documentNumberLabel ?? LABEL_RECEIPT_NUMBER_PREFIX}{" "}
        {sale.receiptNumber ?? TEXT_RECEIPT_NUMBER_PENDING}
      </p>
      <p className="tpl-receipt-line">
        {formatDate(timestamp)}{" "}
        {formatTime(timestamp)}
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

      {sale.discountAmount > 0 && (
        <>
          <div className="tpl-receipt-row">
            <span>{LABEL_SUBTOTAL}</span>
            <span>{PESO.format(sale.total + sale.discountAmount)}</span>
          </div>
          <div className="tpl-receipt-row">
            <span>{LABEL_DISCOUNT}</span>
            <span>-{PESO.format(sale.discountAmount)}</span>
          </div>
        </>
      )}

      {/* §5: VAT breakdowns and the "not VAT registered" line are
          official-invoice presentation. They are hidden while in ALPHA,
          not removed -- sale.vatableSales/vatAmount/vatExemptSales are
          still recorded on the sale for the future BIR mode. */}
      {guard.allowTaxBreakdown && sale.vatStatus === "vat_registered" && (
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
      {guard.allowTaxBreakdown && sale.vatStatus === "zero_rated" && (
        <div className="tpl-receipt-row">
          <span>{LABEL_ZERO_RATED_SALES}</span>
          <span>{PESO.format(sale.zeroRatedSales)}</span>
        </div>
      )}
      {guard.allowTaxBreakdown && sale.vatStatus === "vat_exempt" && (
        <div className="tpl-receipt-row">
          <span>{LABEL_VAT_EXEMPT_SALES}</span>
          <span>{PESO.format(sale.vatExemptSales)}</span>
        </div>
      )}
      {guard.allowTaxBreakdown && (sale.vatStatus === "non_vat" || sale.vatStatus === null) && (
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
      {sale.paymentType === "cash" && tendered !== undefined && change !== undefined && (
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

      {sale.status === "voided" && (
        <>
          <div className="tpl-receipt-hr" />
          {sale.voidedByName && (
            <p className="tpl-receipt-line">
              {TEXT_VOIDED_BY_PREFIX} {sale.voidedByName}
            </p>
          )}
          {sale.voidReason && (
            <p className="tpl-receipt-line">
              {TEXT_VOID_REASON_PREFIX} {sale.voidReason}
            </p>
          )}
        </>
      )}

      {settings.footerMessage && (
        <>
          <div className="tpl-receipt-hr" />
          <p className="tpl-receipt-center tpl-receipt-line">{settings.footerMessage}</p>
        </>
      )}

      {/* Last thing on the page, after the store's own footer message:
          the operator's copy can never be the final word (§3, §10). */}
      {guard.mandatoryFooter && (
        <p className="tpl-receipt-center tpl-receipt-line" style={{ fontWeight: 700, marginTop: 8 }}>
          {guard.mandatoryFooter}
        </p>
      )}
    </div>
  );
}
