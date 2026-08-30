import { useRef, type ChangeEvent, type FormEvent } from "react";
import { PESO } from "@/lib";
import type { Category, Product } from "@/lib";
import {
  selectOnFocus,
  ARIA_CLOSE_MODAL,
  LABEL_EDIT_PRODUCT,
  BUTTON_ADD_PRODUCT,
  LABEL_NAME,
  LABEL_BARCODE_OPTIONAL,
  ARIA_SCAN_WITH_CAMERA,
  TEXT_BARCODE_USED_BY_PREFIX,
  LINK_OPEN_IT,
  LABEL_CATEGORY,
  PLACEHOLDER_NEW_CATEGORY_NAME,
  BUTTON_ADD,
  BUTTON_CANCEL,
  LABEL_CHOOSE_CATEGORY,
  LABEL_NEW_CATEGORY_OPTION,
  TABLE_HEADER_STOCK,
  LABEL_LOW_STOCK_AT,
  LABEL_COST_OPTIONAL,
  HINT_LEAVE_COST_BLANK,
  BUTTON_SAVING,
  BUTTON_SAVE_CHANGES,
  useEscapeToClose,
  useFocusTrap,
} from "@/lib";
import { ProductPhotoField } from "./ProductPhotoField";
import { ProductPricingFields } from "./ProductPricingFields";
import { NEW_CATEGORY_VALUE } from "../hooks";

export interface ProductFormValues {
  name: string;
  barcode: string;
  price: string;
  stock: string;
  lowStockThreshold: string;
  categoryId: string;
  packEnabled: boolean;
  packQuantity: string;
  packPrice: string;
  cost: string;
}

interface ProductFormModalProps {
  editingId: string | null;
  form: ProductFormValues;
  onFormChange: (form: ProductFormValues) => void;
  categories: Category[];
  packPricingEnabled: boolean;
  packPreview: number | null;
  costMarginPreview: { amount: number; percent: number } | null;
  duplicateProduct: Product | null;
  addingCategory: boolean;
  newCategoryName: string;
  onNewCategoryNameChange: (value: string) => void;
  onCategorySelect: (value: string) => void;
  onCreateCategory: () => void;
  onCancelAddingCategory: () => void;
  imagePreview: string | null;
  existingImageUrl: string | null;
  removeImage: boolean;
  imageError: string | null;
  processingImage: boolean;
  onImageSelect: (e: ChangeEvent<HTMLInputElement>) => void;
  onRemoveImage: () => void;
  onScanBarcode: () => void;
  onBarcodeChange: (value: string) => void;
  onOpenExistingProduct: (product: Product) => void;
  formError: string | null;
  submitting: boolean;
  onCancel: () => void;
  onSubmit: (e: FormEvent) => void;
}

function Stepper({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const numeric = Number(value) || 0;
  return (
    <div>
      <label htmlFor={id} className="tpl-lbl">
        {label}
      </label>
      <div className="tpl-sp" style={{ gap: 6 }}>
        <button
          type="button"
          className="tpl-btn"
          style={{ width: 30, height: 30, padding: 0, marginBottom: 0 }}
          onClick={() => onChange(String(Math.max(0, numeric - 1)))}
        >
          −
        </button>
        <div className="tpl-fld" style={{ flex: 1 }}>
          <input
            id={id}
            type="number"
            min="0"
            value={value}
            onFocus={selectOnFocus}
            onChange={(e) => onChange(e.target.value)}
            style={{ textAlign: "center" }}
          />
        </div>
        <button
          type="button"
          className="tpl-btn"
          style={{ width: 30, height: 30, padding: 0, marginBottom: 0 }}
          onClick={() => onChange(String(numeric + 1))}
        >
          <i className="ti ti-plus" aria-hidden />
        </button>
      </div>
    </div>
  );
}

export function ProductFormModal({
  editingId,
  form,
  onFormChange,
  categories,
  packPricingEnabled,
  packPreview,
  costMarginPreview,
  duplicateProduct,
  addingCategory,
  newCategoryName,
  onNewCategoryNameChange,
  onCategorySelect,
  onCreateCategory,
  onCancelAddingCategory,
  imagePreview,
  existingImageUrl,
  removeImage,
  imageError,
  processingImage,
  onImageSelect,
  onRemoveImage,
  onScanBarcode,
  onBarcodeChange,
  onOpenExistingProduct,
  formError,
  submitting,
  onCancel,
  onSubmit,
}: ProductFormModalProps) {
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
        aria-labelledby="productFormHeading"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="tpl-sp" style={{ marginBottom: 18, alignItems: "flex-start" }}>
          <p id="productFormHeading" className="tpl-h3">
            {editingId ? LABEL_EDIT_PRODUCT : BUTTON_ADD_PRODUCT}
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
          <ProductPhotoField
            imagePreview={imagePreview}
            existingImageUrl={existingImageUrl}
            removeImage={removeImage}
            imageError={imageError}
            processingImage={processingImage}
            onImageSelect={onImageSelect}
            onRemoveImage={onRemoveImage}
          />

          <label htmlFor="pname" className="tpl-lbl">
            {LABEL_NAME}
          </label>
          <div className="tpl-fld" style={{ marginBottom: 14 }}>
            <input
              id="pname"
              type="text"
              value={form.name}
              onChange={(e) => onFormChange({ ...form, name: e.target.value })}
            />
          </div>

          <label htmlFor="pbarcode" className="tpl-lbl">
            {LABEL_BARCODE_OPTIONAL}
          </label>
          <div className="tpl-sp" style={{ gap: 8, marginBottom: duplicateProduct ? 8 : 14 }}>
            <div className="tpl-fld" style={{ flex: 1 }}>
              <input
                id="pbarcode"
                type="text"
                className="tpl-mono"
                value={form.barcode}
                onChange={(e) => onBarcodeChange(e.target.value)}
              />
            </div>
            <button
              type="button"
              onClick={onScanBarcode}
              aria-label={ARIA_SCAN_WITH_CAMERA}
              className="tpl-btn"
              style={{ width: 38, height: 38, padding: 0, marginBottom: 0 }}
            >
              <i className="ti ti-camera" aria-hidden />
            </button>
          </div>
          {duplicateProduct && (
            <div className="tpl-note tpl-w" style={{ marginBottom: 14 }}>
              <i className="ti ti-info-circle tpl-warn" aria-hidden />
              <div className="tpl-flex1">
                <p className="tpl-nt tpl-warn">
                  {TEXT_BARCODE_USED_BY_PREFIX} "{duplicateProduct.name}"
                </p>
                <p className="tpl-ns" style={{ color: "var(--tpl-warnd)" }}>
                  {duplicateProduct.category} · {PESO.format(duplicateProduct.price)} · {duplicateProduct.stock}
                </p>
              </div>
              <span
                role="button"
                tabIndex={0}
                className="tpl-chip tpl-on"
                style={{ alignSelf: "center", cursor: "pointer" }}
                onClick={() => onOpenExistingProduct(duplicateProduct)}
                onKeyDown={(e) => e.key === "Enter" && onOpenExistingProduct(duplicateProduct)}
              >
                {LINK_OPEN_IT}
              </span>
            </div>
          )}

          <label htmlFor="pcategory" className="tpl-lbl">
            {LABEL_CATEGORY}
          </label>
          {addingCategory ? (
            <div className="tpl-sp" style={{ gap: 8, marginBottom: 14 }}>
              <div className="tpl-fld" style={{ flex: 1 }}>
                <input
                  type="text"
                  autoFocus
                  placeholder={PLACEHOLDER_NEW_CATEGORY_NAME}
                  value={newCategoryName}
                  onChange={(e) => onNewCategoryNameChange(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), onCreateCategory())}
                />
              </div>
              <button
                type="button"
                onClick={onCreateCategory}
                className="tpl-btnp"
                style={{ width: "auto", height: 40, padding: "0 14px", marginBottom: 0 }}
              >
                {BUTTON_ADD}
              </button>
              <button
                type="button"
                onClick={onCancelAddingCategory}
                className="tpl-btn"
                style={{ width: "auto", height: 40, padding: "0 14px", marginBottom: 0 }}
              >
                {BUTTON_CANCEL}
              </button>
            </div>
          ) : (
            <div className="tpl-fld" style={{ marginBottom: 14 }}>
              <select id="pcategory" value={form.categoryId} onChange={(e) => onCategorySelect(e.target.value)}>
                <option value="" disabled>
                  {LABEL_CHOOSE_CATEGORY}
                </option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
                <option value={NEW_CATEGORY_VALUE}>{LABEL_NEW_CATEGORY_OPTION}</option>
              </select>
            </div>
          )}

          <ProductPricingFields
            packPricingEnabled={packPricingEnabled}
            packEnabled={form.packEnabled}
            onPackEnabledChange={(value) => onFormChange({ ...form, packEnabled: value })}
            packQuantity={form.packQuantity}
            onPackQuantityChange={(value) => onFormChange({ ...form, packQuantity: value })}
            packPrice={form.packPrice}
            onPackPriceChange={(value) => onFormChange({ ...form, packPrice: value })}
            packPreview={packPreview}
            price={form.price}
            onPriceChange={(value) => onFormChange({ ...form, price: value })}
          />

          <div className="tpl-g2" style={{ marginBottom: 6 }}>
            <div>
              <label htmlFor="pcost" className="tpl-lbl">
                {LABEL_COST_OPTIONAL}
              </label>
              <div className="tpl-fld">
                <input
                  id="pcost"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.cost}
                  onFocus={selectOnFocus}
                  onChange={(e) => onFormChange({ ...form, cost: e.target.value })}
                />
              </div>
            </div>
            <div>
              <span className="tpl-lbl">&nbsp;</span>
              <div
                className="tpl-fld"
                style={costMarginPreview ? { color: costMarginPreview.amount >= 0 ? "var(--tpl-ok)" : "var(--tpl-bad)" } : undefined}
              >
                <input
                  type="text"
                  readOnly
                  tabIndex={-1}
                  value={
                    costMarginPreview
                      ? `+${PESO.format(costMarginPreview.amount)} · ${costMarginPreview.percent}%`
                      : "—"
                  }
                  style={{ color: "inherit" }}
                />
              </div>
            </div>
          </div>
          <p className="tpl-hint" style={{ marginBottom: 14 }}>
            {HINT_LEAVE_COST_BLANK}
          </p>

          <div className="tpl-g2">
            <Stepper
              id="pstock"
              label={TABLE_HEADER_STOCK}
              value={form.stock}
              onChange={(value) => onFormChange({ ...form, stock: value })}
            />
            <Stepper
              id="pthreshold"
              label={LABEL_LOW_STOCK_AT}
              value={form.lowStockThreshold}
              onChange={(value) => onFormChange({ ...form, lowStockThreshold: value })}
            />
          </div>

          {formError && (
            <p role="alert" className="tpl-emsg" style={{ marginTop: 12 }}>
              <i className="ti ti-alert-circle" aria-hidden />
              {formError}
            </p>
          )}

          <div className="tpl-row" style={{ marginTop: 18 }}>
            <button type="button" onClick={onCancel} className="tpl-btn" style={{ flex: 1, marginBottom: 0 }}>
              {BUTTON_CANCEL}
            </button>
            <button
              type="submit"
              disabled={submitting || processingImage || !!duplicateProduct}
              className="tpl-btnp"
              style={{ flex: 2, marginBottom: 0 }}
            >
              {submitting ? BUTTON_SAVING : editingId ? BUTTON_SAVE_CHANGES : BUTTON_ADD_PRODUCT}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
