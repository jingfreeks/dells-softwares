import type { ReceivingEntry } from "@/lib";
import { LABEL_RECENT_RECEIVING_HISTORY, EMPTY_STATE_NO_RECEIVING_ENTRIES } from "@/lib";

interface ReceivingHistoryCardProps {
  receivingHistory: ReceivingEntry[];
}

export function ReceivingHistoryCard({ receivingHistory }: ReceivingHistoryCardProps) {
  return (
    <div className="mt-6 card">
      <div className="border-b border-slate-200 p-4">
        <h2 className="text-sm font-semibold text-slate-900">{LABEL_RECENT_RECEIVING_HISTORY}</h2>
      </div>
      <ul className="divide-y divide-slate-100">
        {receivingHistory.map((entry) => (
          <li key={entry.id} className="px-4 py-3 text-sm text-slate-700">
            {new Date(entry.date).toLocaleDateString("en-PH", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}{" "}
            — {entry.supplier} — {entry.lines.length} product
            {entry.lines.length === 1 ? "" : "s"}, {entry.lines.reduce((s, l) => s + l.quantity, 0)} units
          </li>
        ))}
        {receivingHistory.length === 0 && (
          <li className="px-4 py-8 text-center text-sm text-slate-400">{EMPTY_STATE_NO_RECEIVING_ENTRIES}</li>
        )}
      </ul>
    </div>
  );
}
