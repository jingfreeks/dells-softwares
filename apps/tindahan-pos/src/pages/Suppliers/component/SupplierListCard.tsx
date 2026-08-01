import type { Supplier } from "@/lib";
import { PAGE_HEADING_SUPPLIERS, BUTTON_ADD_SUPPLIER, EMPTY_STATE_NO_SUPPLIERS, EMPTY_STATE_NO_PHONE } from "@/lib";
import { QrCodeIcon } from "@/components";

interface SupplierListCardProps {
  suppliers: Supplier[];
  selectedId: string | null;
  onAdd: () => void;
  onSelect: (supplier: Supplier) => void;
}

export function SupplierListCard({ suppliers, selectedId, onAdd, onSelect }: SupplierListCardProps) {
  return (
    <div className="card">
      <div className="flex items-center justify-between border-b border-slate-200 p-4">
        <h2 className="text-sm font-semibold text-slate-900">{PAGE_HEADING_SUPPLIERS}</h2>
        <button
          type="button"
          onClick={onAdd}
          className="cursor-pointer rounded-xl bg-[var(--color-brand)] px-3 py-2 text-sm font-medium text-white hover:bg-[var(--color-brand-dark)]"
        >
          {BUTTON_ADD_SUPPLIER}
        </button>
      </div>
      <ul className="divide-y divide-slate-100">
        {suppliers.map((supplier) => (
          <li key={supplier.id}>
            <button
              type="button"
              onClick={() => onSelect(supplier)}
              className={`flex w-full cursor-pointer items-center justify-between px-4 py-3 text-left text-sm hover:bg-slate-50 ${
                selectedId === supplier.id ? "bg-[var(--color-brand)]/5" : ""
              }`}
            >
              <div>
                <p className="font-medium text-slate-800">{supplier.name}</p>
                <p className="text-xs text-slate-500">{supplier.phone ?? EMPTY_STATE_NO_PHONE}</p>
              </div>
              <QrCodeIcon className="h-4 w-4 shrink-0 text-slate-300" />
            </button>
          </li>
        ))}
        {suppliers.length === 0 && (
          <li className="px-4 py-8 text-center text-sm text-slate-400">{EMPTY_STATE_NO_SUPPLIERS}</li>
        )}
      </ul>
    </div>
  );
}
