import type { ChangeEvent, FormEvent } from "react";
import type { Category, Product } from "@/lib";
import {
  selectOnFocus,
  LABEL_EDIT_PRODUCT,
  BUTTON_ADD_PRODUCT,
  LABEL_NAME,
  LABEL_BARCODE_OPTIONAL,
  ARIA_SCAN_WITH_CAMERA,
  TEXT_BARCODE_USED_BY_PREFIX,
  LINK_OPEN_EXISTING_PRODUCT,
  TEXT_INSTEAD_SUFFIX,
  TEXT_SWITCH_TO_EDITING_PREFIX,
  TEXT_SWITCH_TO_EDITING_SUFFIX,
  LABEL_CATEGORY,
  PLACEHOLDER_NEW_CATEGORY_NAME,
  BUTTON_ADD,
  BUTTON_CANCEL,
  LABEL_CHOOSE_CATEGORY,
  LABEL_NEW_CATEGORY_OPTION,
  TABLE_HEADER_STOCK,
  LABEL_LOW_STOCK_AT,
  BUTTON_SAVING,
  BUTTON_SAVE_CHANGES,
} from "@/lib";
import { CameraIcon } from "@/components";
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
}

interface ProductFormModalProps {
  editingId: string | null;
  form: ProductFormValues;
  onFormChange: (form: ProductFormValues) => void;
  categories: Category[];
  packPricingEnabled: boolean;
  packPreview: number | null;
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

export function ProductFormModal({
  editingId,
  form,
  onFormChange,
  categories,
  packPricingEnabled,
  packPreview,
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
  return (
    <div className="fixed inset-0 z-10 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <h2 className="text-base font-semibold text-slate-900">
          {editingId ? LABEL_EDIT_PRODUCT : BUTTON_ADD_PRODUCT}
        </h2>
        <form className="mt-4 flex flex-col gap-3" onSubmit={onSubmit} noValidate>
          <ProductPhotoField
            imagePreview={imagePreview}
            existingImageUrl={existingImageUrl}
            removeImage={removeImage}
            imageError={imageError}
            processingImage={processingImage}
            onImageSelect={onImageSelect}
            onRemoveImage={onRemoveImage}
          />

          <div>
            <label htmlFor="pname" className="text-xs font-medium text-slate-700">
              {LABEL_NAME}
            </label>
            <input
              id="pname"
              type="text"
              value={form.name}
              onChange={(e) => onFormChange({ ...form, name: e.target.value })}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-[var(--color-brand)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand)]"
            />
          </div>

          <div>
            <label htmlFor="pbarcode" className="text-xs font-medium text-slate-700">
              {LABEL_BARCODE_OPTIONAL}
            </label>
            <div className="mt-1 flex gap-2">
              <input
                id="pbarcode"
                type="text"
                value={form.barcode}
                onChange={(e) => onBarcodeChange(e.target.value)}
                className="flex-1 rounded-xl border border-slate-300 px-3 py-2 text-sm font-mono focus:border-[var(--color-brand)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand)]"
              />
              <button
                type="button"
                onClick={onScanBarcode}
                aria-label={ARIA_SCAN_WITH_CAMERA}
                className="flex h-[38px] w-10 cursor-pointer items-center justify-center rounded-xl border border-slate-300 text-slate-600 hover:bg-slate-100"
              >
                <CameraIcon className="h-4 w-4" />
              </button>
            </div>
            {duplicateProduct && (
              <div role="alert" className="mt-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                {TEXT_BARCODE_USED_BY_PREFIX} <strong>{duplicateProduct.name}</strong>.{" "}
                <button
                  type="button"
                  onClick={() => {
                    if (
                      window.confirm(
                        `${TEXT_SWITCH_TO_EDITING_PREFIX} "${duplicateProduct.name}"${TEXT_SWITCH_TO_EDITING_SUFFIX}`
                      )
                    ) {
                      onOpenExistingProduct(duplicateProduct);
                    }
                  }}
                  className="cursor-pointer font-semibold underline"
                >
                  {LINK_OPEN_EXISTING_PRODUCT}
                </button>{" "}
                {TEXT_INSTEAD_SUFFIX}
              </div>
            )}
          </div>

          <div>
            <label htmlFor="pcategory" className="text-xs font-medium text-slate-700">
              {LABEL_CATEGORY}
            </label>
            {addingCategory ? (
              <div className="mt-1 flex gap-2">
                <input
                  type="text"
                  autoFocus
                  placeholder={PLACEHOLDER_NEW_CATEGORY_NAME}
                  value={newCategoryName}
                  onChange={(e) => onNewCategoryNameChange(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), onCreateCategory())}
                  className="flex-1 rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-[var(--color-brand)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand)]"
                />
                <button
                  type="button"
                  onClick={onCreateCategory}
                  className="cursor-pointer rounded-xl bg-[var(--color-brand)] px-3 py-2 text-sm font-medium text-white hover:bg-[var(--color-brand-dark)]"
                >
                  {BUTTON_ADD}
                </button>
                <button
                  type="button"
                  onClick={onCancelAddingCategory}
                  className="cursor-pointer rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
                >
                  {BUTTON_CANCEL}
                </button>
              </div>
            ) : (
              <select
                id="pcategory"
                value={form.categoryId}
                onChange={(e) => onCategorySelect(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-[var(--color-brand)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand)]"
              >
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
            )}
          </div>

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

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="pstock" className="text-xs font-medium text-slate-700">
                {TABLE_HEADER_STOCK}
              </label>
              <input
                id="pstock"
                type="number"
                min="0"
                value={form.stock}
                onFocus={selectOnFocus}
                onChange={(e) => onFormChange({ ...form, stock: e.target.value })}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-[var(--color-brand)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand)]"
              />
            </div>
            <div>
              <label htmlFor="pthreshold" className="text-xs font-medium text-slate-700">
                {LABEL_LOW_STOCK_AT}
              </label>
              <input
                id="pthreshold"
                type="number"
                min="0"
                value={form.lowStockThreshold}
                onFocus={selectOnFocus}
                onChange={(e) => onFormChange({ ...form, lowStockThreshold: e.target.value })}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-[var(--color-brand)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand)]"
              />
            </div>
          </div>

          {formError && (
            <p role="alert" className="text-sm text-red-600">
              {formError}
            </p>
          )}

          <div className="mt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="cursor-pointer rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              {BUTTON_CANCEL}
            </button>
            <button
              type="submit"
              disabled={submitting || processingImage || !!duplicateProduct}
              className="cursor-pointer rounded-xl bg-[var(--color-brand)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--color-brand-dark)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? BUTTON_SAVING : editingId ? BUTTON_SAVE_CHANGES : BUTTON_ADD_PRODUCT}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
