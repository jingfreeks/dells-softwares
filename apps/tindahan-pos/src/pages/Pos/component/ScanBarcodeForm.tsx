import type { FormEvent, RefObject } from "react";
import { LABEL_SCAN_BARCODE, PLACEHOLDER_SCAN_BARCODE, BUTTON_ADD, ARIA_SCAN_WITH_CAMERA } from "@/lib";
import { CameraIcon } from "@/components";

interface ScanBarcodeFormProps {
  barcodeInputRef: RefObject<HTMLInputElement | null>;
  barcodeInput: string;
  onBarcodeInputChange: (value: string) => void;
  barcodeError: string | null;
  onSubmit: (e: FormEvent) => void;
  onOpenScanner: () => void;
}

export function ScanBarcodeForm({
  barcodeInputRef,
  barcodeInput,
  onBarcodeInputChange,
  barcodeError,
  onSubmit,
  onOpenScanner,
}: ScanBarcodeFormProps) {
  return (
    <form onSubmit={onSubmit} className="mt-3">
      <label htmlFor="barcode" className="sr-only">
        {LABEL_SCAN_BARCODE}
      </label>
      <div className="flex gap-2">
        <input
          id="barcode"
          ref={barcodeInputRef}
          type="text"
          placeholder={PLACEHOLDER_SCAN_BARCODE}
          autoFocus
          value={barcodeInput}
          onChange={(e) => onBarcodeInputChange(e.target.value)}
          className="flex-1 rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-[var(--color-brand)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand)]"
        />
        <button
          type="submit"
          className="cursor-pointer rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          {BUTTON_ADD}
        </button>
        <button
          type="button"
          onClick={onOpenScanner}
          aria-label={ARIA_SCAN_WITH_CAMERA}
          className="flex h-[42px] w-11 cursor-pointer items-center justify-center rounded-xl border border-slate-300 text-slate-600 hover:bg-slate-100"
        >
          <CameraIcon className="h-5 w-5" />
        </button>
      </div>
      {barcodeError && (
        <p role="alert" className="mt-2 text-sm text-red-600">
          {barcodeError}
        </p>
      )}
    </form>
  );
}
