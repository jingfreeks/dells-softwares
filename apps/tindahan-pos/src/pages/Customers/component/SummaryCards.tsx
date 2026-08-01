import { PESO, LABEL_TOTAL_OUTSTANDING, NAV_LABEL_CUSTOMERS } from "@/lib";

interface SummaryCardsProps {
  totalOutstanding: number;
  customerCount: number;
}

export function SummaryCards({ totalOutstanding, customerCount }: SummaryCardsProps) {
  return (
    <div className="mt-4 grid grid-cols-2 gap-4 sm:max-w-md">
      <div className="card p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{LABEL_TOTAL_OUTSTANDING}</p>
        <p className="tabular-nums mt-2 text-2xl font-semibold text-slate-900">{PESO.format(totalOutstanding)}</p>
      </div>
      <div className="card p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{NAV_LABEL_CUSTOMERS}</p>
        <p className="tabular-nums mt-2 text-2xl font-semibold text-slate-900">{customerCount}</p>
      </div>
    </div>
  );
}
