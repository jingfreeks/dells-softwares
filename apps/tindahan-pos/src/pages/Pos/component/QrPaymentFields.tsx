import { PESO, TEXT_QR_INSTRUCTIONS_PREFIX, TEXT_QR_INSTRUCTIONS_SUFFIX, LABEL_REFERENCE_TRANSACTION_NO, PLACEHOLDER_REFERENCE_NO } from "@/lib";

interface QrPaymentFieldsProps {
  total: number;
  referenceNo: string;
  onReferenceNoChange: (value: string) => void;
}

export function QrPaymentFields({ total, referenceNo, onReferenceNoChange }: QrPaymentFieldsProps) {
  return (
    <div className="mt-3">
      <p className="rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600">
        {TEXT_QR_INSTRUCTIONS_PREFIX} <span className="font-semibold text-slate-800">{PESO.format(total)}</span>
        {TEXT_QR_INSTRUCTIONS_SUFFIX}
      </p>
      <label htmlFor="qrReference" className="mt-3 block text-xs font-medium text-slate-700">
        {LABEL_REFERENCE_TRANSACTION_NO}
      </label>
      <input
        id="qrReference"
        type="text"
        placeholder={PLACEHOLDER_REFERENCE_NO}
        autoFocus
        value={referenceNo}
        onChange={(e) => onReferenceNoChange(e.target.value)}
        className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-[var(--color-brand)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand)]"
      />
    </div>
  );
}
