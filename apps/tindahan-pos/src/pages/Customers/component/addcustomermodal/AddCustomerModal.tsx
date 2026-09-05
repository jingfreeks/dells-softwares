import { type FormEvent } from "react";
import { Modal } from "@/components";
import type { Customer } from "@/lib";
import {
  BUTTON_ADD_CUSTOMER,
  LABEL_ADD_CUSTOMER_SUBTITLE,
  ARIA_CLOSE_MODAL,
  LABEL_NAME,
  LABEL_BLOCK_CREDIT_TITLE,
  LABEL_BLOCK_CREDIT_SUBTITLE,
  BUTTON_CANCEL,
  BUTTON_ADDING,
} from "@/lib";
import type { PaymentSchedule } from "../../hooks";
import { DuplicateWarning } from "../duplicatewarning";
import { NicknameField } from "../nicknamefield";
import { PhoneNumberField } from "../phonenumberfield";
import { CreditLimitSelector } from "../creditlimitselector";
import { PaymentScheduleSelector } from "../paymentscheduleselector";
import { OpeningBalanceField } from "../openingbalancefield";

export interface AddCustomerFormValues {
  name: string;
  nickname: string;
  phone: string;
  creditLimit: string;
  blockCreditPastLimit: boolean;
  paymentSchedule: PaymentSchedule;
  openingBalance: string;
}

interface AddCustomerModalProps {
  form: AddCustomerFormValues;
  onFormChange: (form: AddCustomerFormValues) => void;
  formError: string | null;
  submitting: boolean;
  duplicateCustomer: Customer | null;
  onOpenDuplicate: (customer: Customer) => void;
  onCancel: () => void;
  onSubmit: (e: FormEvent) => void;
}

export function AddCustomerModal({
  form,
  onFormChange,
  formError,
  submitting,
  duplicateCustomer,
  onOpenDuplicate,
  onCancel,
  onSubmit,
}: AddCustomerModalProps) {
  return (
    <Modal open onClose={onCancel} labelledBy="addCustomerHeading">
      <div className="tpl-sp" style={{ marginBottom: 18, alignItems: "flex-start" }}>
        <div className="tpl-row">
          <span
            className="tpl-ic"
            style={{ width: 34, height: 34, borderRadius: 11, fontSize: 17, border: "0.5px solid rgba(76,141,255,.32)" }}
          >
            <i className="ti ti-user-plus" aria-hidden />
          </span>
          <div>
            <p id="addCustomerHeading" className="tpl-h3">{BUTTON_ADD_CUSTOMER}</p>
            <p className="tpl-ts">{LABEL_ADD_CUSTOMER_SUBTITLE}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onCancel}
          aria-label={ARIA_CLOSE_MODAL}
          style={{ background: "none", border: "none", cursor: "pointer", color: "var(--tpl-t7)", fontSize: 18, padding: 4 }}
        >
          <i className="ti ti-x" aria-hidden />
        </button>
      </div>

      <form onSubmit={onSubmit} noValidate>
        <label htmlFor="custName" className="tpl-lbl">
          {LABEL_NAME}
        </label>
        <div className="tpl-fld" style={{ marginBottom: 8 }}>
          <input
            id="custName"
            type="text"
            autoFocus
            value={form.name}
            onChange={(e) => onFormChange({ ...form, name: e.target.value })}
          />
        </div>

        {duplicateCustomer && <DuplicateWarning duplicate={duplicateCustomer} onOpen={onOpenDuplicate} />}

        <NicknameField value={form.nickname} onChange={(nickname) => onFormChange({ ...form, nickname })} />

        <PhoneNumberField value={form.phone} onChange={(phone) => onFormChange({ ...form, phone })} />

        <div className="tpl-divider" style={{ margin: "16px 0" }} />

        <CreditLimitSelector
          value={form.creditLimit}
          onChange={(creditLimit) => onFormChange({ ...form, creditLimit })}
        />

        <div className="tpl-card" style={{ background: "var(--tpl-gl3)", marginBottom: 14, padding: "10px 12px" }}>
          <div className="tpl-sp">
            <div className="tpl-flex1">
              <p className="tpl-tp">{LABEL_BLOCK_CREDIT_TITLE}</p>
              <p className="tpl-ts">{LABEL_BLOCK_CREDIT_SUBTITLE}</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={form.blockCreditPastLimit}
              aria-label={LABEL_BLOCK_CREDIT_TITLE}
              onClick={() => onFormChange({ ...form, blockCreditPastLimit: !form.blockCreditPastLimit })}
              className={`tpl-tog${form.blockCreditPastLimit ? " tpl-on" : ""}`}
            >
              <span />
            </button>
          </div>
        </div>

        <PaymentScheduleSelector
          value={form.paymentSchedule}
          onChange={(paymentSchedule) => onFormChange({ ...form, paymentSchedule })}
        />

        <OpeningBalanceField
          value={form.openingBalance}
          onChange={(openingBalance) => onFormChange({ ...form, openingBalance })}
        />

        {formError && (
          <p role="alert" className="tpl-emsg" style={{ marginTop: 12 }}>
            <i className="ti ti-alert-circle" aria-hidden />
            {formError}
          </p>
        )}

        <div className="tpl-row" style={{ marginTop: 20 }}>
          <button type="button" onClick={onCancel} className="tpl-btn" style={{ flex: 1, marginBottom: 0 }}>
            {BUTTON_CANCEL}
          </button>
          <button type="submit" disabled={submitting} className="tpl-btnp" style={{ flex: 2, marginBottom: 0 }}>
            {submitting ? BUTTON_ADDING : BUTTON_ADD_CUSTOMER}
          </button>
        </div>
      </form>
    </Modal>
  );
}
