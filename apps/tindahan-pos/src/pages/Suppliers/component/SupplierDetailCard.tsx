import type { Supplier } from "@/lib";
import {
  EMPTY_STATE_NO_PHONE,
  BUTTON_EDIT,
  TEXT_SUPPLIER_SCAN_HINT_PREFIX,
  TEXT_SUPPLIER_SCAN_HINT_SUFFIX,
  BUTTON_PRINT_CODE,
} from "@/lib";
import { PrintIcon } from "@/components";

interface SupplierDetailCardProps {
  supplier: Supplier;
  qrDataUrl: string | null;
  onEdit: (supplier: Supplier) => void;
  onPrint: () => void;
}

export function SupplierDetailCard({ supplier, qrDataUrl, onEdit, onPrint }: SupplierDetailCardProps) {
  return (
    <div className="card p-4">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">{supplier.name}</h2>
          <p className="text-xs text-slate-500">{supplier.phone ?? EMPTY_STATE_NO_PHONE}</p>
          {supplier.address && <p className="text-xs text-slate-500">{supplier.address}</p>}
        </div>
        <button
          type="button"
          onClick={() => onEdit(supplier)}
          className="cursor-pointer text-xs font-medium text-[var(--color-brand)] hover:underline"
        >
          {BUTTON_EDIT}
        </button>
      </div>

      <div className="mt-4 flex flex-col items-center rounded-xl bg-slate-50 p-4">
        {qrDataUrl ? (
          <img src={qrDataUrl} alt={`Scan code for ${supplier.name}`} className="h-40 w-40" />
        ) : (
          <div className="h-40 w-40 animate-pulse rounded bg-slate-200" />
        )}
        <p className="mt-3 text-center text-xs text-slate-500">
          {TEXT_SUPPLIER_SCAN_HINT_PREFIX} {supplier.name} {TEXT_SUPPLIER_SCAN_HINT_SUFFIX}
        </p>
        <button
          type="button"
          onClick={onPrint}
          disabled={!qrDataUrl}
          className="mt-3 flex cursor-pointer items-center gap-1.5 rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <PrintIcon className="h-4 w-4" />
          {BUTTON_PRINT_CODE}
        </button>
      </div>
    </div>
  );
}
