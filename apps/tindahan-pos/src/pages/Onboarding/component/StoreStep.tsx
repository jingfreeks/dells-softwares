import type { ChangeEvent } from "react";
import {
  LABEL_TELL_US_ABOUT_YOUR_STORE,
  TEXT_STORE_STEP_DESCRIPTION,
  LABEL_STORE_PHOTO,
  BUTTON_PROCESSING,
  BUTTON_CHOOSE_PHOTO,
  LABEL_STORE_NAME,
  LABEL_STORE_ADDRESS,
  LABEL_SAME_AS_MY_ADDRESS,
  PLACEHOLDER_ADDRESS,
  BUTTON_BACK,
  BUTTON_SAVING,
  BUTTON_FINISH_SETUP,
} from "@/lib";
import { ImagePlaceholderIcon } from "@/components";

export function StoreStep({
  displayedStorePhoto,
  storePhotoError,
  processingStorePhoto,
  onStorePhotoSelect,
  storeName,
  onStoreNameChange,
  displayedStoreAddress,
  onStoreAddressChange,
  sameAsProfile,
  onSameAsProfileChange,
  storeError,
  savingStore,
  onBack,
  onFinish,
}: {
  displayedStorePhoto: string | null;
  storePhotoError: string | null;
  processingStorePhoto: boolean;
  onStorePhotoSelect: (e: ChangeEvent<HTMLInputElement>) => void;
  storeName: string;
  onStoreNameChange: (value: string) => void;
  displayedStoreAddress: string;
  onStoreAddressChange: (value: string) => void;
  sameAsProfile: boolean;
  onSameAsProfileChange: (checked: boolean) => void;
  storeError: string | null;
  savingStore: boolean;
  onBack: () => void;
  onFinish: () => void;
}) {
  return (
    <div>
      <h2 className="text-lg font-bold text-slate-900">{LABEL_TELL_US_ABOUT_YOUR_STORE}</h2>
      <p className="mt-1 text-sm text-slate-500">{TEXT_STORE_STEP_DESCRIPTION}</p>

      <div className="mt-5 flex flex-col gap-4">
        <div>
          <span className="text-xs font-medium text-slate-700">{LABEL_STORE_PHOTO}</span>
          <div className="mt-1 flex items-center gap-3">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
              {displayedStorePhoto ? (
                <img src={displayedStorePhoto} alt="" className="h-full w-full object-cover" />
              ) : (
                <ImagePlaceholderIcon className="h-6 w-6 text-slate-300" />
              )}
            </div>
            <label
              htmlFor="onboardStorePhotoInput"
              className="cursor-pointer rounded-xl border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              {processingStorePhoto ? BUTTON_PROCESSING : BUTTON_CHOOSE_PHOTO}
            </label>
            <input
              id="onboardStorePhotoInput"
              type="file"
              accept="image/*"
              onChange={onStorePhotoSelect}
              disabled={processingStorePhoto}
              className="sr-only"
            />
          </div>
          {storePhotoError && (
            <p role="alert" className="mt-1 text-xs text-red-600">
              {storePhotoError}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="onboardStoreName" className="text-xs font-medium text-slate-700">
            {LABEL_STORE_NAME}
          </label>
          <input
            id="onboardStoreName"
            type="text"
            value={storeName}
            onChange={(e) => onStoreNameChange(e.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-[var(--color-brand)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand)]"
          />
        </div>

        <div>
          <div className="flex items-center justify-between">
            <label htmlFor="onboardStoreAddress" className="text-xs font-medium text-slate-700">
              {LABEL_STORE_ADDRESS}
            </label>
            <label className="flex cursor-pointer items-center gap-1.5 text-xs text-slate-600">
              <input
                type="checkbox"
                checked={sameAsProfile}
                onChange={(e) => onSameAsProfileChange(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300"
              />
              {LABEL_SAME_AS_MY_ADDRESS}
            </label>
          </div>
          <input
            id="onboardStoreAddress"
            type="text"
            value={displayedStoreAddress}
            onChange={(e) => onStoreAddressChange(e.target.value)}
            disabled={sameAsProfile}
            placeholder={PLACEHOLDER_ADDRESS}
            className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-[var(--color-brand)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand)] disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
          />
        </div>

        {storeError && (
          <p role="alert" className="text-sm text-red-600">
            {storeError}
          </p>
        )}

        <div className="mt-1 flex gap-2">
          <button
            type="button"
            onClick={onBack}
            disabled={savingStore}
            className="flex-1 cursor-pointer rounded-xl border border-slate-300 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {BUTTON_BACK}
          </button>
          <button
            type="button"
            onClick={onFinish}
            disabled={savingStore || processingStorePhoto}
            className="flex-1 cursor-pointer rounded-xl bg-[var(--color-brand)] py-2.5 text-sm font-semibold text-white hover:bg-[var(--color-brand-dark)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {savingStore ? BUTTON_SAVING : BUTTON_FINISH_SETUP}
          </button>
        </div>
      </div>
    </div>
  );
}
