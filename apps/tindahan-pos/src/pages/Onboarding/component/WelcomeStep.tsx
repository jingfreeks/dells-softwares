import { APP_NAME, TEXT_WELCOME_HEADING_PREFIX, TEXT_WELCOME_DESCRIPTION, BUTTON_LETS_GET_STARTED } from "@/lib";

export function WelcomeStep({ onNext }: { onNext: () => void }) {
  return (
    <div className="flex flex-col items-center py-6 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--color-brand)]/10 text-3xl">
        👋
      </span>
      <h1 className="mt-4 text-2xl font-bold tracking-tight text-slate-900">
        {TEXT_WELCOME_HEADING_PREFIX} {APP_NAME}!
      </h1>
      <p className="mt-2 max-w-sm text-sm text-slate-500">{TEXT_WELCOME_DESCRIPTION}</p>
      <button
        type="button"
        onClick={onNext}
        className="mt-6 flex h-11 w-full max-w-xs cursor-pointer items-center justify-center gap-2 rounded-xl bg-[var(--color-brand)] text-sm font-semibold text-white hover:bg-[var(--color-brand-dark)]"
      >
        {BUTTON_LETS_GET_STARTED}
      </button>
    </div>
  );
}
