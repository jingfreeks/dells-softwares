import type { FormEvent } from "react";
import type { Customer } from "@/lib";
import {
  PESO,
  selectOnFocus,
  LABEL_CREDIT_LIMIT_PREFIX,
  LABEL_RECORD_A_PAYMENT,
  PLACEHOLDER_NOTE_OPTIONAL,
  BUTTON_RECORDING,
  BUTTON_RECORD_PAYMENT,
} from "@/lib";
import {Headerscreen} from "./header";

interface PaymentFormValues {
  amount: string;
  note: string;
}

interface CustomerBalanceCardProps {
  customer: Customer;
  paymentForm: PaymentFormValues;
  onPaymentFormChange: (form: PaymentFormValues) => void;
  paymentError: string | null;
  recordingPayment: boolean;
  onSubmit: (e: FormEvent) => void;
}

export function CustomerBalanceCard({
  customer,
  paymentForm,
  onPaymentFormChange,
  paymentError,
  recordingPayment,
  onSubmit,
}: CustomerBalanceCardProps) {
  return (
    <div className="card p-4">
      <Headerscreen customer={customer} />
      {customer.creditLimit !== null && (
        <p className="mt-1.5 text-xs text-slate-500">
          {LABEL_CREDIT_LIMIT_PREFIX} {PESO.format(customer.creditLimit)}
        </p>
      )}

      <form className="mt-4 flex flex-col gap-2" onSubmit={onSubmit} noValidate>
        <label htmlFor="paymentAmount" className="text-xs font-medium text-slate-700">
          {LABEL_RECORD_A_PAYMENT}
        </label>
        <div className="flex gap-2">
          <input
            id="paymentAmount"
            type="number"
            min="0"
            value={paymentForm.amount}
            onFocus={selectOnFocus}
            onChange={(e) => onPaymentFormChange({ ...paymentForm, amount: e.target.value })}
            className="w-28 rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-[var(--color-brand)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand)]"
          />
          <input
            type="text"
            placeholder={PLACEHOLDER_NOTE_OPTIONAL}
            value={paymentForm.note}
            onChange={(e) => onPaymentFormChange({ ...paymentForm, note: e.target.value })}
            className="flex-1 rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-[var(--color-brand)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand)]"
          />
        </div>
        {paymentError && (
          <p role="alert" className="text-sm text-red-600">
            {paymentError}
          </p>
        )}
        <button
          type="submit"
          disabled={recordingPayment}
          className="mt-1 flex h-10 cursor-pointer items-center justify-center rounded-xl bg-[var(--color-brand)] text-sm font-semibold text-white hover:bg-[var(--color-brand-dark)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {recordingPayment ? BUTTON_RECORDING : BUTTON_RECORD_PAYMENT}
        </button>
      </form>
    </div>
  );
}
