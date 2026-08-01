import type { FormEvent } from "react";
import {
  LABEL_ADD_CASHIER,
  TEXT_ADD_CASHIER_DESCRIPTION,
  LABEL_NAME,
  LABEL_EMAIL_ADDRESS,
  LABEL_TEMPORARY_PASSWORD,
  HINT_PASSWORD_MIN_LENGTH,
  BUTTON_CREATING,
  BUTTON_CREATE_CASHIER_ACCOUNT,
} from "@/lib";

interface CashierForm {
  name: string;
  email: string;
  password: string;
}

interface AddCashierFormProps {
  form: CashierForm;
  formError: string | null;
  submitting: boolean;
  onFieldChange: (field: keyof CashierForm, value: string) => void;
  onSubmit: (e: FormEvent) => void;
}

export function AddCashierForm({ form, formError, submitting, onFieldChange, onSubmit }: AddCashierFormProps) {
  return (
    <div className="card p-4">
      <h2 className="text-sm font-semibold text-slate-900">{LABEL_ADD_CASHIER}</h2>
      <p className="mt-1 text-xs text-slate-500">{TEXT_ADD_CASHIER_DESCRIPTION}</p>

      <form className="mt-4 flex flex-col gap-3" onSubmit={onSubmit} noValidate>
        <div>
          <label htmlFor="staffName" className="text-xs font-medium text-slate-700">
            {LABEL_NAME}
          </label>
          <input
            id="staffName"
            type="text"
            value={form.name}
            onChange={(e) => onFieldChange("name", e.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-[var(--color-brand)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand)]"
          />
        </div>
        <div>
          <label htmlFor="staffEmail" className="text-xs font-medium text-slate-700">
            {LABEL_EMAIL_ADDRESS}
          </label>
          <input
            id="staffEmail"
            type="email"
            autoComplete="off"
            value={form.email}
            onChange={(e) => onFieldChange("email", e.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-[var(--color-brand)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand)]"
          />
        </div>
        <div>
          <label htmlFor="staffPassword" className="text-xs font-medium text-slate-700">
            {LABEL_TEMPORARY_PASSWORD}
          </label>
          <input
            id="staffPassword"
            type="password"
            autoComplete="new-password"
            minLength={8}
            value={form.password}
            onChange={(e) => onFieldChange("password", e.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-[var(--color-brand)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand)]"
          />
          <p className="mt-1 text-xs text-slate-500">{HINT_PASSWORD_MIN_LENGTH}</p>
        </div>

        {formError && (
          <p role="alert" className="text-sm text-red-600">
            {formError}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="mt-1 flex h-10 cursor-pointer items-center justify-center gap-2 rounded-xl bg-[var(--color-brand)] text-sm font-semibold text-white hover:bg-[var(--color-brand-dark)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting && (
            <span
              aria-hidden
              className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
            />
          )}
          {submitting ? BUTTON_CREATING : BUTTON_CREATE_CASHIER_ACCOUNT}
        </button>
      </form>
    </div>
  );
}
