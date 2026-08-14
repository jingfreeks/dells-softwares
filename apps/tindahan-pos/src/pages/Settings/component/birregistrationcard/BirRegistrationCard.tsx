import type { VatStatus } from "@/lib";
import {
  LABEL_REGISTERED_WITH_BIR,
  TEXT_REGISTERED_WITH_BIR_DESC,
  LABEL_TIN,
  LABEL_BUSINESS_PERMIT_NO,
  TEXT_BIR_HINT,
  LABEL_VAT_STATUS,
  TEXT_VAT_STATUS_HINT,
  LABEL_VAT_REGISTERED,
  LABEL_NON_VAT,
  LABEL_VAT_EXEMPT,
  LABEL_ZERO_RATED,
  LABEL_INVOICE_TYPE,
  TEXT_INVOICE_TYPE_HINT,
  LABEL_INVOICE_TYPE_SALES,
  LABEL_INVOICE_TYPE_SERVICE,
  LABEL_INVOICE_TYPE_CASH,
  LABEL_INVOICE_TYPE_CHARGE,
  LABEL_INVOICE_TYPE_CREDIT,
} from "@/lib";

const VAT_STATUS_OPTIONS: { value: VatStatus; label: string }[] = [
  { value: "vat_registered", label: LABEL_VAT_REGISTERED },
  { value: "non_vat", label: LABEL_NON_VAT },
  { value: "vat_exempt", label: LABEL_VAT_EXEMPT },
  { value: "zero_rated", label: LABEL_ZERO_RATED },
];

const INVOICE_TYPE_OPTIONS = [
  LABEL_INVOICE_TYPE_SALES,
  LABEL_INVOICE_TYPE_SERVICE,
  LABEL_INVOICE_TYPE_CASH,
  LABEL_INVOICE_TYPE_CHARGE,
  LABEL_INVOICE_TYPE_CREDIT,
];

interface BirRegistrationCardProps {
  birRegistered: boolean;
  onToggleBirRegistered: () => void;
  tin: string;
  onTinChange: (value: string) => void;
  businessPermitNo: string;
  onBusinessPermitNoChange: (value: string) => void;
  vatStatus: VatStatus;
  onVatStatusChange: (value: VatStatus) => void;
  invoiceType: string;
  onInvoiceTypeChange: (value: string) => void;
}

export function BirRegistrationCard({
  birRegistered,
  onToggleBirRegistered,
  tin,
  onTinChange,
  businessPermitNo,
  onBusinessPermitNoChange,
  vatStatus,
  onVatStatusChange,
  invoiceType,
  onInvoiceTypeChange,
}: BirRegistrationCardProps) {
  return (
    <div className="tpl-card" style={{ marginBottom: 18 }}>
      <div className="tpl-sp" style={{ marginBottom: 11 }}>
        <div className="tpl-flex1">
          <p className="tpl-h3">{LABEL_REGISTERED_WITH_BIR}</p>
          <p className="tpl-ts">{TEXT_REGISTERED_WITH_BIR_DESC}</p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={birRegistered}
          aria-label={LABEL_REGISTERED_WITH_BIR}
          onClick={onToggleBirRegistered}
          className={`tpl-tog${birRegistered ? " tpl-on" : ""}`}
        >
          <span />
        </button>
      </div>

      <div className="tpl-g2">
        <div>
          <label htmlFor="storeTin" className="tpl-lbl">
            {LABEL_TIN}
          </label>
          <div className="tpl-fld tpl-mono">
            <input id="storeTin" type="text" value={tin} onChange={(e) => onTinChange(e.target.value)} />
          </div>
        </div>
        <div>
          <label htmlFor="storeBusinessPermitNo" className="tpl-lbl">
            {LABEL_BUSINESS_PERMIT_NO}
          </label>
          <div className="tpl-fld tpl-mono">
            <input
              id="storeBusinessPermitNo"
              type="text"
              value={businessPermitNo}
              onChange={(e) => onBusinessPermitNoChange(e.target.value)}
            />
          </div>
        </div>
      </div>
      <p className="tpl-hint">{TEXT_BIR_HINT}</p>

      <div className="tpl-g2" style={{ marginTop: 11 }}>
        <div>
          <label htmlFor="storeVatStatus" className="tpl-lbl">
            {LABEL_VAT_STATUS}
          </label>
          <div className="tpl-fld">
            <select
              id="storeVatStatus"
              value={vatStatus}
              onChange={(e) => onVatStatusChange(e.target.value as VatStatus)}
            >
              {VAT_STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label htmlFor="storeInvoiceType" className="tpl-lbl">
            {LABEL_INVOICE_TYPE}
          </label>
          <div className="tpl-fld">
            <select
              id="storeInvoiceType"
              value={invoiceType}
              onChange={(e) => onInvoiceTypeChange(e.target.value)}
            >
              {INVOICE_TYPE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
      <p className="tpl-hint">{TEXT_VAT_STATUS_HINT}</p>
      <p className="tpl-hint">{TEXT_INVOICE_TYPE_HINT}</p>
    </div>
  );
}
