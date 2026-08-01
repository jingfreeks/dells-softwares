import { BUTTON_CANCEL_SALE, BUTTON_PROCESSING, BUTTON_COMPLETE_SALE } from "@/lib";

interface CheckoutActionsProps {
  cartEmpty: boolean;
  checkingOut: boolean;
  disableComplete: boolean;
  onCancel: () => void;
  onComplete: () => void;
}

export function CheckoutActions({ cartEmpty, checkingOut, disableComplete, onCancel, onComplete }: CheckoutActionsProps) {
  return (
    <div className="mt-3 flex gap-2">
      <button
        type="button"
        onClick={onCancel}
        disabled={cartEmpty || checkingOut}
        className="flex-1 cursor-pointer rounded-xl border border-slate-300 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {BUTTON_CANCEL_SALE}
      </button>
      <button
        type="button"
        onClick={onComplete}
        disabled={disableComplete}
        className="flex-1 cursor-pointer rounded-xl bg-[var(--color-brand)] py-2 text-sm font-semibold text-white hover:bg-[var(--color-brand-dark)] disabled:cursor-not-allowed disabled:opacity-40"
      >
        {checkingOut ? BUTTON_PROCESSING : BUTTON_COMPLETE_SALE}
      </button>
    </div>
  );
}
