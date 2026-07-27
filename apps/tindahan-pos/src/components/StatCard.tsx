import { CardActionIcons, type CardActions } from "./CardActionIcons";

export function StatCard({
  label,
  value,
  hint,
  tone = "neutral",
  ...actions
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "neutral" | "warning";
} & CardActions) {
  const hasActions = actions.onDownload || actions.onPrint || actions.onShare;
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="tabular-nums mt-2 text-2xl font-semibold text-slate-900">{value}</p>
      {hint && (
        <p className={`mt-1 text-xs ${tone === "warning" ? "text-amber-600" : "text-slate-500"}`}>
          {hint}
        </p>
      )}
      {hasActions && (
        <div className="-mb-1 -mr-1 mt-2 flex justify-end border-t border-slate-100 pt-1">
          <CardActionIcons title={label} {...actions} />
        </div>
      )}
    </div>
  );
}
