import type { FormEvent } from "react";
import {
  selectOnFocus,
  BUTTON_ADD_CUSTOMER,
  LABEL_NAME,
  LABEL_PHONE_OPTIONAL,
  LABEL_CREDIT_LIMIT_OPTIONAL,
  PLACEHOLDER_NO_LIMIT,
  HINT_CREDIT_LIMIT,
  BUTTON_ADDING,
} from "@/lib";

interface CustomerFormValues {
  name: string;
  phone: string;
  creditLimit: string;
}

interface AddCustomerFormProps {
  form: CustomerFormValues;
  onFormChange: (form: CustomerFormValues) => void;
  formError: string | null;
  submitting: boolean;
  onSubmit: (e: FormEvent) => void;
}

export function AddCustomerForm({ form, onFormChange, formError, submitting, onSubmit }: AddCustomerFormProps) {
  return (
    <div className="card p-4">
      <h2 className="text-sm font-semibold text-slate-900">{BUTTON_ADD_CUSTOMER}</h2>
      <form className="mt-4 flex flex-col gap-3" onSubmit={onSubmit} noValidate>
        <div>
          <label htmlFor="custName" className="text-xs font-medium text-slate-700">
            {LABEL_NAME}
          </label>
          <input
            id="custName"
            type="text"
            autoFocus
            value={form.name}
            onChange={(e) => onFormChange({ ...form, name: e.target.value })}
            className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-[var(--color-brand)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand)]"
          />
        </div>
        <div>
          <label htmlFor="custPhone" className="text-xs font-medium text-slate-700">
            {LABEL_PHONE_OPTIONAL}
          </label>
          <input
            id="custPhone"
            type="tel"
            value={form.phone}
            onChange={(e) => onFormChange({ ...form, phone: e.target.value })}
            className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-[var(--color-brand)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand)]"
          />
        </div>
        <div>
          <label htmlFor="custLimit" className="text-xs font-medium text-slate-700">
            {LABEL_CREDIT_LIMIT_OPTIONAL}
          </label>
          <input
            id="custLimit"
            type="number"
            min="0"
            placeholder={PLACEHOLDER_NO_LIMIT}
            value={form.creditLimit}
            onFocus={selectOnFocus}
            onChange={(e) => onFormChange({ ...form, creditLimit: e.target.value })}
            className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-[var(--color-brand)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand)]"
          />
          <p className="mt-1 text-xs text-slate-500">{HINT_CREDIT_LIMIT}</p>
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
          {submitting ? BUTTON_ADDING : BUTTON_ADD_CUSTOMER}
        </button>
      </form>
    </div>
  );
}
