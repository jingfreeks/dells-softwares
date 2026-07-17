export function StatCard({
  label,
  value,
  hint,
  tone = "neutral",
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "neutral" | "warning";
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="tabular-nums mt-2 text-2xl font-semibold text-slate-900">{value}</p>
      {hint && (
        <p className={`mt-1 text-xs ${tone === "warning" ? "text-amber-600" : "text-slate-500"}`}>
          {hint}
        </p>
      )}
    </div>
  );
}
