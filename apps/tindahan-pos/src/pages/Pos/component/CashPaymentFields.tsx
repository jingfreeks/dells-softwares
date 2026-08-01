import { PESO, selectOnFocus, LABEL_AMOUNT_TENDERED, LABEL_CHANGE } from "@/lib";

interface CashPaymentFieldsProps {
  tendered: string;
  onTenderedChange: (value: string) => void;
  change: number | null;
}

export function CashPaymentFields({ tendered, onTenderedChange, change }: CashPaymentFieldsProps) {
  return (
    <>
      <label htmlFor="tendered" className="mt-3 block text-xs font-medium text-slate-700">
        {LABEL_AMOUNT_TENDERED}
      </label>
      <input
        id="tendered"
        type="number"
        min="0"
        inputMode="decimal"
        value={tendered}
        onFocus={selectOnFocus}
        onChange={(e) => onTenderedChange(e.target.value)}
        className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-[var(--color-brand)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand)]"
      />
      <div className="mt-1 flex items-center justify-between text-xs text-slate-500">
        <span>{LABEL_CHANGE}</span>
        <span>{change === null ? "—" : PESO.format(change)}</span>
      </div>
    </>
  );
}
