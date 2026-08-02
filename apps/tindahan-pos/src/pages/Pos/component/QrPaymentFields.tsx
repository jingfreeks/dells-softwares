import { PESO, TEXT_QR_INSTRUCTIONS_PREFIX, TEXT_QR_INSTRUCTIONS_SUFFIX, LABEL_REFERENCE_TRANSACTION_NO, PLACEHOLDER_REFERENCE_NO } from "@/lib";

interface QrPaymentFieldsProps {
  total: number;
  referenceNo: string;
  onReferenceNoChange: (value: string) => void;
}

export function QrPaymentFields({ total, referenceNo, onReferenceNoChange }: QrPaymentFieldsProps) {
  return (
    <div style={{ marginTop: 14 }}>
      <p className="tpl-status-note" style={{ margin: "0 0 11px" }}>
        {TEXT_QR_INSTRUCTIONS_PREFIX} <span style={{ color: "var(--tpl-t2)", fontWeight: 500 }}>{PESO.format(total)}</span>
        {TEXT_QR_INSTRUCTIONS_SUFFIX}
      </p>
      <label htmlFor="qrReference" className="tpl-lbl">
        {LABEL_REFERENCE_TRANSACTION_NO}
      </label>
      <div className="tpl-fld">
        <input
          id="qrReference"
          type="text"
          placeholder={PLACEHOLDER_REFERENCE_NO}
          autoFocus
          value={referenceNo}
          onChange={(e) => onReferenceNoChange(e.target.value)}
        />
      </div>
    </div>
  );
}
