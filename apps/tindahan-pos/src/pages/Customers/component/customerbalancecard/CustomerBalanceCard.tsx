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
    <div className="tpl-card">
      <Headerscreen customer={customer} />
      {customer.creditLimit !== null && (
        <p className="tpl-ts" style={{ marginTop: 6 }}>
          {LABEL_CREDIT_LIMIT_PREFIX} {PESO.format(customer.creditLimit)}
        </p>
      )}

      <form style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 8 }} onSubmit={onSubmit} noValidate>
        <label htmlFor="paymentAmount" className="tpl-lbl" style={{ marginBottom: 0 }}>
          {LABEL_RECORD_A_PAYMENT}
        </label>
        <div style={{ display: "flex", gap: 8 }}>
          <div className="tpl-fld" style={{ width: 112 }}>
            <input
              id="paymentAmount"
              type="number"
              min="0"
              value={paymentForm.amount}
              onFocus={selectOnFocus}
              onChange={(e) => onPaymentFormChange({ ...paymentForm, amount: e.target.value })}
            />
          </div>
          <label className="tpl-fld" style={{ flex: 1 }}>
            <input
              type="text"
              placeholder={PLACEHOLDER_NOTE_OPTIONAL}
              value={paymentForm.note}
              onChange={(e) => onPaymentFormChange({ ...paymentForm, note: e.target.value })}
            />
          </label>
        </div>
        {paymentError && (
          <p role="alert" className="tpl-emsg">
            <i className="ti ti-alert-circle" aria-hidden />
            {paymentError}
          </p>
        )}
        <button type="submit" disabled={recordingPayment} className="tpl-btnp" style={{ marginBottom: 0 }}>
          {recordingPayment ? BUTTON_RECORDING : BUTTON_RECORD_PAYMENT}
        </button>
      </form>
    </div>
  );
}
