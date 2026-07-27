import { PrintIcon } from "./icons";

export function StatCard({
  label,
  value,
  hint,
  tone = "neutral",
  onPrint,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "neutral" | "warning";
  /** Shows a small print icon in the corner that exports just this card. */
  onPrint?: () => void;
}) {
  return (
    <div className="relative rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      {onPrint && (
        <button
          type="button"
          onClick={onPrint}
          aria-label={`Print ${label}`}
          title="Print"
          className="absolute right-1.5 top-1.5 flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600"
        >
          <PrintIcon className="h-4 w-4" />
        </button>
      )}
      <p className={`text-xs font-medium uppercase tracking-wide text-slate-500 ${onPrint ? "pr-9" : ""}`}>
        {label}
      </p>
      <p className="tabular-nums mt-2 text-2xl font-semibold text-slate-900">{value}</p>
      {hint && (
        <p className={`mt-1 text-xs ${tone === "warning" ? "text-amber-600" : "text-slate-500"}`}>
          {hint}
        </p>
      )}
    </div>
  );
}
