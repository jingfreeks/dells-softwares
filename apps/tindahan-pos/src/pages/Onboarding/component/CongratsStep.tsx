import {
  TEXT_CONGRATULATIONS_PREFIX,
  TEXT_FALLBACK_THERE,
  TEXT_FALLBACK_YOUR_STORE,
  TEXT_STORE_READY_SUFFIX,
  LABEL_PROFILE_SAVED,
  LABEL_STORE_DETAILS_SAVED,
  BUTTON_FINISHING,
  BUTTON_GO_TO_DASHBOARD,
} from "@/lib";

export function CongratsStep({
  name,
  storeName,
  finishError,
  finishing,
  onGoToDashboard,
}: {
  name: string;
  storeName: string;
  finishError: string | null;
  finishing: boolean;
  onGoToDashboard: () => void;
}) {
  return (
    <div className="flex flex-col items-center py-6 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-3xl">🎉</span>
      <h1 className="mt-4 text-2xl font-bold tracking-tight text-slate-900">
        {TEXT_CONGRATULATIONS_PREFIX} {name.trim() || TEXT_FALLBACK_THERE}!
      </h1>
      <p className="mt-2 max-w-sm text-sm text-slate-500">
        {storeName.trim() || TEXT_FALLBACK_YOUR_STORE} {TEXT_STORE_READY_SUFFIX}
      </p>

      <div className="mt-5 w-full rounded-xl bg-slate-50 p-4 text-left text-sm">
        <p className="flex items-center gap-2 text-slate-700">
          <span className="text-emerald-600">✓</span> {LABEL_PROFILE_SAVED}
        </p>
        <p className="mt-2 flex items-center gap-2 text-slate-700">
          <span className="text-emerald-600">✓</span> {LABEL_STORE_DETAILS_SAVED}
        </p>
      </div>

      {finishError && (
        <p role="alert" className="mt-4 text-sm text-red-600">
          {finishError}
        </p>
      )}

      <button
        type="button"
        onClick={onGoToDashboard}
        disabled={finishing}
        className="mt-6 flex h-11 w-full max-w-xs cursor-pointer items-center justify-center gap-2 rounded-xl bg-[var(--color-brand)] text-sm font-semibold text-white hover:bg-[var(--color-brand-dark)] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {finishing ? BUTTON_FINISHING : BUTTON_GO_TO_DASHBOARD}
      </button>
    </div>
  );
}
