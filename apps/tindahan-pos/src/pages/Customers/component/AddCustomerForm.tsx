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
    <div className="tpl-card">
      <p className="tpl-h3" style={{ marginBottom: 14 }}>{BUTTON_ADD_CUSTOMER}</p>
      <form style={{ display: "flex", flexDirection: "column", gap: 12 }} onSubmit={onSubmit} noValidate>
        <div>
          <label htmlFor="custName" className="tpl-lbl">
            {LABEL_NAME}
          </label>
          <div className="tpl-fld">
            <input
              id="custName"
              type="text"
              autoFocus
              value={form.name}
              onChange={(e) => onFormChange({ ...form, name: e.target.value })}
            />
          </div>
        </div>
        <div>
          <label htmlFor="custPhone" className="tpl-lbl">
            {LABEL_PHONE_OPTIONAL}
          </label>
          <div className="tpl-fld">
            <input
              id="custPhone"
              type="tel"
              value={form.phone}
              onChange={(e) => onFormChange({ ...form, phone: e.target.value })}
            />
          </div>
        </div>
        <div>
          <label htmlFor="custLimit" className="tpl-lbl">
            {LABEL_CREDIT_LIMIT_OPTIONAL}
          </label>
          <div className="tpl-fld">
            <input
              id="custLimit"
              type="number"
              min="0"
              placeholder={PLACEHOLDER_NO_LIMIT}
              value={form.creditLimit}
              onFocus={selectOnFocus}
              onChange={(e) => onFormChange({ ...form, creditLimit: e.target.value })}
            />
          </div>
          <p className="tpl-hint">{HINT_CREDIT_LIMIT}</p>
        </div>

        {formError && (
          <p role="alert" className="tpl-emsg">
            <i className="ti ti-alert-circle" aria-hidden />
            {formError}
          </p>
        )}

        <button type="submit" disabled={submitting} className="tpl-btnp" style={{ marginBottom: 0 }}>
          {submitting ? BUTTON_ADDING : BUTTON_ADD_CUSTOMER}
        </button>
      </form>
    </div>
  );
}
