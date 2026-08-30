import { useRef, type FormEvent } from "react";
import type { Category, Supplier, SupplierPaymentTerms } from "@/lib";
import {
  ARIA_CLOSE_MODAL,
  LABEL_EDIT_SUPPLIER,
  BUTTON_ADD_SUPPLIER,
  LABEL_BUSINESS_NAME,
  LABEL_CONTACT_PERSON_OPTIONAL,
  LABEL_MOBILE_NUMBER,
  HINT_MOBILE_LOW_STOCK_SHORTCUT,
  LABEL_ADDRESS_OPTIONAL,
  PLACEHOLDER_ADDRESS_SUPPLIER,
  LABEL_WHAT_DO_THEY_BRING,
  HINT_CATEGORIES_SUPPLIED,
  LABEL_USUAL_DELIVERY_DAYS,
  HINT_DELIVERY_DAYS,
  LABEL_HOW_YOU_PAY_THEM,
  HINT_PAYMENT_TERMS,
  CHIP_TERMS_CASH,
  CHIP_TERMS_7_DAYS,
  CHIP_TERMS_15_DAYS,
  TITLE_SCAN_CODE_AUTO,
  TEXT_SCAN_CODE_HINT,
  TEXT_SUPPLIER_ALREADY_EXISTS_PREFIX,
  LINK_OPEN_IT,
  BUTTON_CANCEL,
  BUTTON_SAVE_AND_ADD_ANOTHER,
  BUTTON_SAVING,
  BUTTON_SAVE_CHANGES,
  DAY_MON,
  DAY_TUE,
  DAY_WED,
  DAY_THU,
  DAY_FRI,
  DAY_SAT,
  DAY_SUN,
  useEscapeToClose,
  useFocusTrap,
} from "@/lib";
import { ChipMultiSelect } from "@/components";
import type { SupplierFormValues } from "../hooks";

const DAY_OPTIONS = [
  { id: "1", label: DAY_MON },
  { id: "2", label: DAY_TUE },
  { id: "3", label: DAY_WED },
  { id: "4", label: DAY_THU },
  { id: "5", label: DAY_FRI },
  { id: "6", label: DAY_SAT },
  { id: "7", label: DAY_SUN },
];

const TERMS_OPTIONS: { value: SupplierPaymentTerms; label: string }[] = [
  { value: "cash", label: CHIP_TERMS_CASH },
  { value: "7_days", label: CHIP_TERMS_7_DAYS },
  { value: "15_days", label: CHIP_TERMS_15_DAYS },
];

interface AddSupplierModalProps {
  editingId: string | null;
  form: SupplierFormValues;
  onFormChange: (form: SupplierFormValues) => void;
  onNameChange: (name: string) => void;
  categories: Category[];
  duplicateSupplier: Supplier | null;
  onOpenExisting: (supplier: Supplier) => void;
  formError: string | null;
  submitting: boolean;
  onCancel: () => void;
  onSubmit: (e: FormEvent, addAnother?: boolean) => void;
}

export function AddSupplierModal({
  editingId,
  form,
  onFormChange,
  onNameChange,
  categories,
  duplicateSupplier,
  onOpenExisting,
  formError,
  submitting,
  onCancel,
  onSubmit,
}: AddSupplierModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  useEscapeToClose(true, onCancel);
  useFocusTrap(true, dialogRef);

  return (
    <div className="tpl-modal-overlay" onClick={onCancel}>
      <div
        ref={dialogRef}
        className="tpl-modal-panel tpl-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="addSupplierHeading"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="tpl-sp" style={{ marginBottom: 18, alignItems: "flex-start" }}>
          <p id="addSupplierHeading" className="tpl-h3">
            {editingId ? LABEL_EDIT_SUPPLIER : BUTTON_ADD_SUPPLIER}
          </p>
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
          <label htmlFor="supName" className="tpl-lbl">
            {LABEL_BUSINESS_NAME}
          </label>
          <div className="tpl-fld" style={{ marginBottom: duplicateSupplier ? 8 : 14 }}>
            <input id="supName" type="text" autoFocus value={form.name} onChange={(e) => onNameChange(e.target.value)} />
          </div>
          {duplicateSupplier && (
            <div className="tpl-note tpl-w" style={{ marginBottom: 14 }}>
              <i className="ti ti-info-circle tpl-warn" aria-hidden />
              <div className="tpl-flex1">
                <p className="tpl-nt tpl-warn">
                  {TEXT_SUPPLIER_ALREADY_EXISTS_PREFIX} "{duplicateSupplier.name}"
                </p>
              </div>
              <span
                role="button"
                tabIndex={0}
                className="tpl-chip tpl-on"
                style={{ alignSelf: "center", cursor: "pointer" }}
                onClick={() => onOpenExisting(duplicateSupplier)}
                onKeyDown={(e) => e.key === "Enter" && onOpenExisting(duplicateSupplier)}
              >
                {LINK_OPEN_IT}
              </span>
            </div>
          )}

          <div className="tpl-g2">
            <div>
              <label htmlFor="supContact" className="tpl-lbl">
                {LABEL_CONTACT_PERSON_OPTIONAL}
              </label>
              <div className="tpl-fld">
                <input
                  id="supContact"
                  type="text"
                  value={form.contactPerson}
                  onChange={(e) => onFormChange({ ...form, contactPerson: e.target.value })}
                />
              </div>
            </div>
            <div>
              <label htmlFor="supPhone" className="tpl-lbl">
                {LABEL_MOBILE_NUMBER}
              </label>
              <div className="tpl-fld">
                <input
                  id="supPhone"
                  type="tel"
                  className="tpl-mono"
                  value={form.phone}
                  onChange={(e) => onFormChange({ ...form, phone: e.target.value })}
                />
              </div>
            </div>
          </div>
          <p className="tpl-hint" style={{ marginBottom: 14 }}>
            {HINT_MOBILE_LOW_STOCK_SHORTCUT}
          </p>

          <label htmlFor="supAddress" className="tpl-lbl">
            {LABEL_ADDRESS_OPTIONAL}
          </label>
          <div className="tpl-fld" style={{ marginBottom: 14 }}>
            <input
              id="supAddress"
              type="text"
              placeholder={PLACEHOLDER_ADDRESS_SUPPLIER}
              value={form.address}
              onChange={(e) => onFormChange({ ...form, address: e.target.value })}
            />
          </div>

          <p className="tpl-lbl">{LABEL_WHAT_DO_THEY_BRING}</p>
          <ChipMultiSelect
            options={categories.map((c) => ({ id: c.id, label: c.name }))}
            selectedIds={form.categoryIds}
            onChange={(categoryIds) => onFormChange({ ...form, categoryIds })}
            showCheckIcon
          />
          <p className="tpl-hint" style={{ marginBottom: 14 }}>
            {HINT_CATEGORIES_SUPPLIED}
          </p>

          <p className="tpl-lbl">{LABEL_USUAL_DELIVERY_DAYS}</p>
          <ChipMultiSelect
            options={DAY_OPTIONS}
            selectedIds={form.usualDeliveryDays.map(String)}
            onChange={(ids) => onFormChange({ ...form, usualDeliveryDays: ids.map(Number) })}
          />
          <p className="tpl-hint" style={{ marginBottom: 14 }}>
            {HINT_DELIVERY_DAYS}
          </p>

          <p className="tpl-lbl">{LABEL_HOW_YOU_PAY_THEM}</p>
          <div style={{ display: "flex", gap: 8, marginBottom: 6 }}>
            {TERMS_OPTIONS.map((option) => (
              <span
                key={option.value}
                role="button"
                tabIndex={0}
                className={`tpl-chip${form.paymentTerms === option.value ? " tpl-on" : ""}`}
                style={{ cursor: "pointer" }}
                onClick={() => onFormChange({ ...form, paymentTerms: option.value })}
                onKeyDown={(e) => e.key === "Enter" && onFormChange({ ...form, paymentTerms: option.value })}
              >
                {option.label}
              </span>
            ))}
          </div>
          <p className="tpl-hint" style={{ marginBottom: 14 }}>
            {HINT_PAYMENT_TERMS}
          </p>

          <div className="tpl-note tpl-b" style={{ marginBottom: 14 }}>
            <i className="ti ti-barcode tpl-acc" aria-hidden />
            <div className="tpl-flex1">
              <p className="tpl-nt">{TITLE_SCAN_CODE_AUTO}</p>
              <p className="tpl-ns">{TEXT_SCAN_CODE_HINT}</p>
            </div>
          </div>

          {formError && (
            <p role="alert" className="tpl-emsg" style={{ marginTop: 4 }}>
              <i className="ti ti-alert-circle" aria-hidden />
              {formError}
            </p>
          )}

          <div className="tpl-row" style={{ marginTop: 18 }}>
            <button type="button" onClick={onCancel} className="tpl-btn" style={{ flex: 1, marginBottom: 0 }}>
              {BUTTON_CANCEL}
            </button>
            {!editingId && (
              <button
                type="button"
                disabled={submitting}
                onClick={(e) => onSubmit(e, true)}
                className="tpl-btn"
                style={{ flex: 1, marginBottom: 0 }}
              >
                {BUTTON_SAVE_AND_ADD_ANOTHER}
              </button>
            )}
            <button
              type="submit"
              disabled={submitting || !!duplicateSupplier}
              className="tpl-btnp"
              style={{ flex: 1.3, marginBottom: 0 }}
            >
              {submitting ? BUTTON_SAVING : editingId ? BUTTON_SAVE_CHANGES : BUTTON_ADD_SUPPLIER}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
