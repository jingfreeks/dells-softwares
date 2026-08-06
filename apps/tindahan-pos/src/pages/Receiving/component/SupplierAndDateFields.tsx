import type { Supplier } from "@/lib";
import {
  LABEL_SUPPLIER_OPTIONAL,
  PLACEHOLDER_SUPPLIER_NAME,
  ARIA_SCAN_SUPPLIER_CODE,
  ARIA_PICK_SAVED_SUPPLIER,
  LABEL_PICK_SAVED_SUPPLIER,
  LABEL_DATE,
} from "@/lib";
import { ScanIcon } from "@/components";

interface SupplierAndDateFieldsProps {
  suppliers: Supplier[];
  supplier: string;
  supplierId: string | null;
  date: string;
  onSupplierNameChange: (value: string) => void;
  onSupplierPick: (id: string) => void;
  onScanSupplier: () => void;
  onDateChange: (value: string) => void;
}

export function SupplierAndDateFields({
  suppliers,
  supplier,
  supplierId,
  date,
  onSupplierNameChange,
  onSupplierPick,
  onScanSupplier,
  onDateChange,
}: SupplierAndDateFieldsProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div>
        <label htmlFor="supplier" className="text-xs font-medium text-slate-700">
          {LABEL_SUPPLIER_OPTIONAL}
        </label>
        <div className="mt-1 flex gap-2">
          <input
            id="supplier"
            type="text"
            value={supplier}
            onChange={(e) => onSupplierNameChange(e.target.value)}
            placeholder={PLACEHOLDER_SUPPLIER_NAME}
            className="flex-1 rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-[var(--color-brand)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand)]"
          />
          <button
            type="button"
            onClick={onScanSupplier}
            aria-label={ARIA_SCAN_SUPPLIER_CODE}
            title={ARIA_SCAN_SUPPLIER_CODE}
            className="flex h-[38px] w-10 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-slate-300 text-slate-600 hover:bg-slate-100"
          >
            <ScanIcon className="h-4 w-4" />
          </button>
        </div>
        {suppliers.length > 0 && (
          <select
            aria-label={ARIA_PICK_SAVED_SUPPLIER}
            value={supplierId ?? ""}
            onChange={(e) => onSupplierPick(e.target.value)}
            className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-600 focus:border-[var(--color-brand)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand)]"
          >
            <option value="">{LABEL_PICK_SAVED_SUPPLIER}</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        )}
      </div>
      <div>
        <label htmlFor="recvDate" className="text-xs font-medium text-slate-700">
          {LABEL_DATE}
        </label>
        <input
          id="recvDate"
          type="date"
          value={date}
          onChange={(e) => onDateChange(e.target.value)}
          className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-[var(--color-brand)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand)]"
        />
      </div>
    </div>
  );
}
