import type { FormEvent } from "react";
import {
  LABEL_EDIT_SUPPLIER,
  BUTTON_ADD_SUPPLIER,
  LABEL_NAME,
  LABEL_PHONE_OPTIONAL,
  LABEL_ADDRESS_OPTIONAL,
  BUTTON_SAVING,
  BUTTON_SAVE_CHANGES,
} from "@/lib";

interface SupplierFormValues {
  name: string;
  phone: string;
  address: string;
}

interface SupplierFormProps {
  editingId: string | null;
  form: SupplierFormValues;
  onFormChange: (form: SupplierFormValues) => void;
  formError: string | null;
  submitting: boolean;
  onSubmit: (e: FormEvent) => void;
}

export function SupplierForm({ editingId, form, onFormChange, formError, submitting, onSubmit }: SupplierFormProps) {
  return (
    <div className="card p-4">
      <h2 className="text-sm font-semibold text-slate-900">
        {editingId ? LABEL_EDIT_SUPPLIER : BUTTON_ADD_SUPPLIER}
      </h2>
      <form className="mt-4 flex flex-col gap-3" onSubmit={onSubmit} noValidate>
        <div>
          <label htmlFor="supName" className="text-xs font-medium text-slate-700">
            {LABEL_NAME}
          </label>
          <input
            id="supName"
            type="text"
            autoFocus
            value={form.name}
            onChange={(e) => onFormChange({ ...form, name: e.target.value })}
            className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-[var(--color-brand)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand)]"
          />
        </div>
        <div>
          <label htmlFor="supPhone" className="text-xs font-medium text-slate-700">
            {LABEL_PHONE_OPTIONAL}
          </label>
          <input
            id="supPhone"
            type="tel"
            value={form.phone}
            onChange={(e) => onFormChange({ ...form, phone: e.target.value })}
            className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-[var(--color-brand)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand)]"
          />
        </div>
        <div>
          <label htmlFor="supAddress" className="text-xs font-medium text-slate-700">
            {LABEL_ADDRESS_OPTIONAL}
          </label>
          <input
            id="supAddress"
            type="text"
            value={form.address}
            onChange={(e) => onFormChange({ ...form, address: e.target.value })}
            className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-[var(--color-brand)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand)]"
          />
        </div>

        {formError && (
          <p role="alert" className="text-sm text-red-600">
            {formError}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="mt-1 flex h-10 cursor-pointer items-center justify-center rounded-xl bg-[var(--color-brand)] text-sm font-semibold text-white hover:bg-[var(--color-brand-dark)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? BUTTON_SAVING : editingId ? BUTTON_SAVE_CHANGES : BUTTON_ADD_SUPPLIER}
        </button>
      </form>
    </div>
  );
}
